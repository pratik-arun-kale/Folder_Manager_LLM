# ChatGPT Tree Manager Chrome Extension - Installation Guide

## Installation Steps

### 1. Enable Developer Mode in Chrome
1. Open Chrome and go to `chrome://extensions/`
2. Turn on "Developer mode" (toggle in top-right corner)

### 2. Load the Extension
1. Click "Load unpacked" button
2. Select this project folder (the one containing `manifest.json`)
3. The extension should now appear in your extensions list

### 3. Open the Side Panel
1. Click the extension icon in Chrome toolbar
2. Or right-click on any webpage → "ChatGPT Tree Manager"
3. The side panel will open on the right side

## Testing the LLM Dropdown Fix

### Test Different AI Providers
1. Open the extension side panel
2. Click "Create Folder" and enter a name
3. Click the "+" button next to the folder
4. In the modal:
   - Enter a chat name
   - Select different AI providers from dropdown:
     - OpenAI GPT → should open chatgpt.com
     - Anthropic Claude → should open claude.ai
     - Google Gemini → should open gemini.google.com
     - Perplexity → should open perplexity.ai
     - xAI Grok → should open grok.x.ai
     - DeepSeek → should open chat.deepseek.com

### What Should Happen
- Each AI provider selection should open the correct website
- No more "always opening ChatGPT" issue
- Chat should be saved with correct LLM badge color

## Features to Test
- ✅ Folder creation with custom names
- ✅ Chat creation with LLM provider dropdown
- ✅ Subchat creation within existing chats
- ✅ Tree expansion/collapse with ▶/▼ arrows
- ✅ Click chat names to open AI conversations
- ✅ Drag and drop organization (planned)

## Project Structure
```
├── manifest.json           # Extension configuration
├── background-simple.js    # Background service worker
├── content.js             # Content script for AI websites
├── sidepanel/            # Side panel interface
│   ├── sidepanel.html    # Main UI structure
│   ├── sidepanel.css     # Styling (dark theme)
│   └── sidepanel-simple.js # UI logic and interactions
└── test-*.html           # Test pages (for development)
```

## Troubleshooting
- If extension doesn't load: Check console for errors
- If side panel doesn't open: Try refreshing the page
- If wrong AI site opens: Check the dropdown value mapping fix

The extension now uses a clean dropdown interface instead of the previous grid-based modal for selecting AI providers!