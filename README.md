# FilterDuplicatePings

Adds a button to the chatbox that removes duplicate user mentions and optionally splits pings into groups to stay within Discord's character limits.

## Features

- **Remove Duplicate Pings**: Automatically detects and removes duplicate user mentions from your message draft
- **Auto-split**: Automatically splits mentions into groups when exceeding the character limit
- **Character Limit Setting**: Choose between 2000 (non-Nitro) and 4000 (Nitro) character limits

## How to Use

1. Type a message with multiple user mentions in the chatbox
2. Click the filter icon (funnel symbol) next to the chat input
3. The plugin will:
   - Remove any duplicate mentions of the same user
   - Split mentions into groups if auto-split is enabled and the message exceeds the character limit

## Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `enableAutoSplit` | Automatically split pings into groups when over the character limit | `true` |
| `characterLimit` | Character limit for message splitting (2000 or 4000) | `2000` |


