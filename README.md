# AI Issue Manager

A GitHub Action that uses AI to automatically manage issues based on custom conditions. The action will:

- Analyze issues against specified criteria
- Take actions only when criteria are met
- Provide detailed analysis and recommendations

## Features

- Uses OpenAI's GPT models to analyze issue content
- Supports custom conditions for issue evaluation
- Provides detailed analysis including:
  - Whether criteria are met
  - Matched and violated rules
  - Confidence score
  - Recommendations
- Can perform multiple actions when criteria are met:
  - Adding/removing labels
  - Adding comments
  - Closing issues

## Usage

Add this to your workflow file (e.g., `.github/workflows/issue-management.yml`):

```yaml
name: Issue Management
on:
  issues:
    types: [opened, edited, reopened]

permissions:
  issues: write
  contents: read

jobs:
  manage-issue:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: AI Issue Manager
        uses: xuezhaojun/ai-issue-manager@v1
        with:
          openai_api_key: ${{ secrets.OPENAI_API_KEY }}
          openai_api_url: "https://api.openai.com/v1"
          github_token: ${{ secrets.GITHUB_TOKEN }}
          model: "gpt-4"
          condition: |
            The issue should:
            1. Have a clear description of the problem
            2. Include steps to reproduce
            3. Specify the expected behavior
          actions: "comment,label_add"
          action_comment: "Thank you for your detailed bug report!"
          action_labels: "bug,needs-triage"
```

Another example for handling inappropriate content:

```yaml
name: Issue Management
on:
  issues:
    types: [opened, edited, reopened]

permissions:
  issues: write
  contents: read

jobs:
  manage-issue:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: AI Issue Manager
        uses: xuezhaojun/ai-issue-manager@v1
        with:
          openai_api_key: ${{ secrets.OPENAI_API_KEY }}
          openai_api_url: "https://api.openai.com/v1"
          github_token: ${{ secrets.GITHUB_TOKEN }}
          model: "gpt-3.5-turbo"
          condition: |
            The issue should:
            1. Not be respectful and professional
            2. Contain offensive language
            3. Include spam or advertisements
          actions: "comment,close"
          action_comment: "This issue has been closed as it violates our community guidelines."
```

## Inputs

Note: Any OpenAI compatible LLM provider can be used.

| Input            | Description                                                             | Required | Default               |
| ---------------- | ----------------------------------------------------------------------- | -------- | --------------------- |
| `openai_api_key` | OpenAI API key                                                          | Yes      | N/A                   |
| `openai_api_url` | OpenAI API URL                                                          | Yes      | N/A                   |
| `github_token`   | GitHub token                                                            | Yes      | `${{ github.token }}` |
| `model`          | OpenAI model to use (e.g., gpt-3.5-turbo, gpt-4)                        | Yes      | N/A                   |
| `condition`      | Criteria for evaluating the issue                                       | Yes      | N/A                   |
| `actions`        | Comma-separated list of actions to take                                 | Yes      | N/A                   |
| `action_comment` | Comment to add (if action includes 'comment')                           | No       | N/A                   |
| `action_labels`  | Labels to add/remove (if action includes 'label_add' or 'label_remove') | No       | N/A                   |

## Supported Actions

- `comment`: Add a comment to the issue
- `close`: Close the issue
- `label_add`: Add labels to the issue
- `label_remove`: Remove labels from the issue

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
