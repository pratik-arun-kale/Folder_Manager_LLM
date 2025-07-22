# Chrome Extension Installation Guide

## How to Install the ChatGPT Tree Manager Extension

This is a Chrome browser extension that needs to be loaded directly into Chrome, not accessed through a web browser URL.

### Step 1: Download Extension Files
All extension files are ready in this directory.

### Step 2: Load Extension in Chrome

1. **Open Chrome** and navigate to: `chrome://extensions/`

2. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top-right corner

3. **Load the Extension**
   - Click "Load unpacked" button
   - Select the entire project folder (the one containing `manifest.json`)
   - The extension will appear in your extensions list

### Step 3: Using the Extension

**Popup Interface:**
- Click the extension icon in Chrome toolbar to open popup
- Quick access to create folders and recent chats

**Side Panel Interface:**
- Right-click the extension icon → "Open side panel"
- OR use Chrome's side panel menu
- Full tree view with folder management

**Creating Conversations:**
- Click + next to any folder to create a new chat
- Select from 6 AI providers: ChatGPT, Claude, Gemini, Perplexity, xAI Grok, DeepSeek
- Appropriate AI website opens automatically in new tab

### Features Available

✅ **Hierarchical Organization**
- Create folders and subfolders
- Organize chats in tree structure
- Expand/collapse functionality

✅ **Multi-LLM Support**
- ChatGPT (OpenAI)
- Claude (Anthropic) 
- Gemini (Google)
- Perplexity
- xAI Grok
- DeepSeek

✅ **Smart Linking**
- Extension connects to actual conversations
- Click chat names to open conversations
- Automatic URL association

✅ **Clean Interface**
- Mac-style design
- Blue header with tree controls
- Professional styling

### Troubleshooting

**Extension not appearing?**
- Ensure `manifest.json` is in the root folder
- Check that Developer mode is enabled
- Try refreshing the extensions page

**Side panel not opening?**
- Right-click extension icon and select "Open side panel"
- Or use Chrome menu → More tools → Developer tools → Side panel

**Conversations not linking?**
- Extension needs permission to access AI websites
- Accept permissions when prompted
- Ensure you're on supported AI websites

The extension manages your AI conversations locally using Chrome's storage API - no external servers required!