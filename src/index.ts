import * as core from '@actions/core';
import * as github from '@actions/github';
import OpenAI from 'openai';

type ActionType = 'comment' | 'close' | 'label_add' | 'label_remove';

interface AnalysisResponse {
  meets_criteria: boolean;
  analysis: {
    summary: string;
    matched_rules: string[];
    violated_rules: string[];
  };
  recommendation: string;
  confidence: number;
}

async function run(): Promise<void> {
  try {
    // Get inputs
    const openaiApiKey = core.getInput('openai_api_key', { required: true });
    const openaiApiUrl = core.getInput('openai_api_url', { required: true });
    const githubToken = core.getInput('github_token', { required: true });
    const model = core.getInput('model', { required: true });
    const condition = core.getInput('condition', { required: true });
    const actions = core.getInput('actions', { required: true }).split(',') as ActionType[];
    const actionComment = core.getInput('action_comment');
    const actionLabels = core.getInput('action_labels');

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: openaiApiKey,
      baseURL: openaiApiUrl,
    });

    // Initialize Octokit
    const octokit = github.getOctokit(githubToken);
    const context = github.context;

    // Only proceed if this is an issue event
    if (!context.payload.issue) {
      core.info('This event is not an issue event. Skipping.');
      return;
    }

    const issue = context.payload.issue;

    // Construct the prompt with the template
    const prompt = `You are a GitHub issue moderator responsible for reviewing issues against predefined criteria. Your task is to analyze the issue content and determine if it meets the specified conditions.

<issue content>
Title: ${issue.title || ''}
Body: ${issue.body || ''}
</issue content>

<condition>
${condition}
</condition>

Please provide your evaluation in the following JSON format, do not include any other text or markdown:

{
  "meets_criteria": boolean,    // true if meets all conditions, false otherwise
  "analysis": {
    "summary": string,         // Brief analysis of the issue
    "matched_rules": [         // List of conditions that were met
      string,
      ...
    ],
    "violated_rules": [        // List of conditions that were violated
      string,
      ...
    ]
  },
  "recommendation": string,    // Suggested action (e.g., "approve", "reject", "need more information")
  "confidence": number        // Confidence score (0-1) in your evaluation
}

Instructions:
1. Carefully review both the issue content and conditions
2. Consider both explicit and implicit violations
3. Be objective and consistent in your evaluation
4. Provide clear reasoning in your analysis
`;

    const completion = await openai.chat.completions.create({
      model: model,
      messages: [{ role: "user", content: prompt }],
    });

    // Extract and parse JSON from the response
    const extractAndParseJSON = (content: string): any => {
      try {
        // First try to parse it directly (in case it's pure JSON)
        return JSON.parse(content);
      } catch (e) {
        // If direct parsing fails, try to extract JSON from markdown
        const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[1]);
        }
        // If both attempts fail, return empty object
        return {};
      }
    };

    // Format and log the message
    const responseData = extractAndParseJSON(completion.choices[0].message.content || '');
    const formattedMessage = JSON.stringify(responseData, null, 2);
    core.info('OpenAI Response:');
    core.info(formattedMessage);

    const response = responseData as AnalysisResponse;

    // Log the analysis
    core.info(`Analysis Summary: ${response.analysis.summary}`);
    core.info(`Meets Criteria: ${response.meets_criteria}`);
    core.info(`Confidence: ${response.confidence}`);
    core.info(`Recommendation: ${response.recommendation}`);

    // Only proceed with actions if criteria are met
    if (response.meets_criteria) {
      for (const actionType of actions) {
        switch (actionType) {
          case 'comment':
            if (actionComment) {
              await octokit.rest.issues.createComment({
                ...context.repo,
                issue_number: issue.number,
                body: actionComment
              });
            }
            break;

          case 'close':
            await octokit.rest.issues.update({
              ...context.repo,
              issue_number: issue.number,
              state: 'closed'
            });
            break;

          case 'label_add':
            if (actionLabels) {
              await octokit.rest.issues.addLabels({
                ...context.repo,
                issue_number: issue.number,
                labels: actionLabels.split(',').map(l => l.trim())
              });
            }
            break;

          case 'label_remove':
            if (actionLabels) {
              for (const label of actionLabels.split(',').map(l => l.trim())) {
                await octokit.rest.issues.removeLabel({
                  ...context.repo,
                  issue_number: issue.number,
                  name: label
                });
              }
            }
            break;
        }
      }
      core.info('All actions completed successfully');
    } else {
      core.info('Criteria not met, skipping actions');
    }

  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed('An unexpected error occurred');
    }
  }
}

run();