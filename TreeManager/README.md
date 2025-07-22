# ChatGPT Tree Manager Chrome Extension

A sophisticated Chrome extension for organizing AI conversations in a hierarchical tree structure with support for multiple LLM providers.

## Features

### Multi-LLM Support
- **6 AI Providers**: ChatGPT, Claude, Gemini, Perplexity, xAI Grok, DeepSeek
- **Smart URL Generation**: Automatically opens correct AI website for each provider
- **Visual LLM Badges**: Color-coded badges show which AI provider each chat uses

### Hierarchical Organization  
- **Folder Structure**: Create folders and subfolders for organizing conversations
- **Tree Navigation**: Expand/collapse functionality with intuitive arrow controls
- **Unlimited Nesting**: Support for deep folder hierarchies (up to 10 levels)
- **Subchat Support**: Create conversation branches within existing chats

### Direct Chat Access
- **Clickable Chat Names**: Click any linked chat title to open the AI conversation
- **URL Linking**: Extension automatically connects to actual conversations
- **One-Click Navigation**: Instant access to organized AI conversations
- **Multi-Provider Linking**: Works across all supported AI platforms

### Professional Interface
- **Mac-Style Design**: Clean, minimal interface with Mac-style window controls
- **Blue Header**: Professional blue header with tree management controls
- **Status Indicators**: Visual feedback for connection status and chat availability
- **Expand/Collapse All**: Bulk tree operations for efficient navigation

## Installation

### Requirements
- Google Chrome browser
- Chrome Developer Mode enabled

### Steps
1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right)
4. Click "Load unpacked" and select the project folder
5. Extension icon appears in Chrome toolbar

## Usage

### Popup Interface
- Click extension icon for quick access
- Create folders and view recent chats
- Compact interface for basic operations

### Side Panel Interface  
- Right-click extension icon → "Open side panel"
- Full tree view with complete functionality
- Folder management and chat organization

### Creating Conversations
1. Click + button next to any folder
2. Enter chat name when prompted
3. Select AI provider from modal (ChatGPT, Claude, Gemini, etc.)
4. Appropriate AI website opens automatically in new tab

### Managing Organization
- **Create Folders**: Use "Create Folder" button, enter custom name
- **Create Subchats**: Click + on existing chats to create branches
- **Expand/Collapse**: Use arrow buttons to navigate tree structure
- **Direct Access**: Click linked chat names to open conversations

## Supported AI Providers

| Provider | Website | Features |
|----------|---------|----------|
| OpenAI GPT | chatgpt.com | ChatGPT-4, GPT-3.5 |
| Anthropic Claude | claude.ai | Claude 3.5 Sonnet, Haiku |
| Google Gemini | gemini.google.com | Gemini Pro, Ultra |
| Perplexity | perplexity.ai | Real-time search AI |
| xAI Grok | grok.x.ai | Grok-1, Grok-2 |  
| DeepSeek | chat.deepseek.com | DeepSeek Coder, Chat |

## Technical Details

### Architecture
- **Chrome Extension**: Manifest V3 compliant
- **Local Storage**: Chrome storage API for data persistence
- **Content Scripts**: Monitor AI provider websites for conversation linking
- **Service Worker**: Background coordination and storage management

### File Structure
```
├── manifest.json          # Extension manifest
├── background-simple.js    # Service worker
├── content.js             # Content script for AI websites
├── sidepanel/             # Side panel interface
├── popup/                 # Popup interface  
├── utils/                 # Shared utilities
└── shared/                # Data schemas
```

### Privacy & Security
- **Local Storage Only**: All data stored locally in Chrome
- **No External APIs**: No data transmitted to external servers
- **Host Permissions**: Limited to supported AI provider websites only
- **User Control**: Complete user control over folder names and organization

## Development

The extension uses vanilla JavaScript with Chrome Extension APIs:
- Storage API for data persistence  
- Tabs API for managing AI website tabs
- Runtime API for component communication
- Side Panel API for extended interface

## Support

For issues or questions:
1. Check that Developer Mode is enabled in Chrome
2. Verify extension permissions are granted  
3. Ensure you're using supported AI provider websites
4. Check Chrome console for error messages

## License

This project is open source and available under standard terms.