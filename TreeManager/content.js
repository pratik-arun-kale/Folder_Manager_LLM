// Content script for ChatGPT pages
const MESSAGE_TYPES = {
  GET_ALL_DATA: 'GET_ALL_DATA',
  CREATE_FOLDER: 'CREATE_FOLDER',
  DELETE_FOLDER: 'DELETE_FOLDER',
  RENAME_CHAT: 'RENAME_CHAT',
  DELETE_CHAT: 'DELETE_CHAT',
  CREATE_SUBCHAT: 'CREATE_SUBCHAT',
  CREATE_CHAT_IN_FOLDER: 'CREATE_CHAT_IN_FOLDER',
  SAVE_CHAT: 'SAVE_CHAT',
  EXTRACT_CHAT_INFO: 'EXTRACT_CHAT_INFO',
  CHECK_PENDING_LINKS: 'CHECK_PENDING_LINKS',
  GET_TAB_ID: 'GET_TAB_ID'
};

class ChatGPTContentScript {
  constructor() {
    this.lastTitle = '';
    this.initializeContentScript();
  }

  initializeContentScript() {
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true;
    });

    // Monitor for title changes
    this.observeTitleChanges();
    
    // Initial check after page load
    setTimeout(() => {
      this.checkForNewConversation();
    }, 3000);
  }

  handleMessage(message, sender, sendResponse) {
    switch (message.type) {
      case MESSAGE_TYPES.EXTRACT_CHAT_INFO:
        this.extractAndSendChatInfo(sendResponse);
        break;
      
      default:
        sendResponse({ success: false, error: 'Unknown message type' });
    }
  }

  observeTitleChanges() {
    // Create observer for title changes
    const titleObserver = new MutationObserver((mutations) => {
      const currentTitle = document.title;
      if (currentTitle !== this.lastTitle && currentTitle !== 'ChatGPT') {
        this.lastTitle = currentTitle;
        this.checkForNewConversation();
      }
    });

    // Observe title element
    const titleElement = document.querySelector('title');
    if (titleElement) {
      titleObserver.observe(titleElement, { childList: true, characterData: true, subtree: true });
    }

    // Also observe document head for title changes
    titleObserver.observe(document.head, { childList: true, subtree: true });
  }

  async checkForNewConversation() {
    const chatInfo = this.extractChatInfo();
    if (chatInfo && this.isValidAIConversation()) {
      // Check for pending links (folder or subchat)
      try {
        const response = await chrome.runtime.sendMessage({
          type: 'CHECK_PENDING_LINKS',
          data: {
            url: window.location.href,
            title: chatInfo.title,
            tabId: await this.getCurrentTabId()
          }
        });
        
        if (response?.success && response?.linked) {
          console.log('✅ Successfully linked conversation to pending item');
          return;
        }
        
        // If no pending link, save as regular chat
        await chrome.runtime.sendMessage({
          type: MESSAGE_TYPES.SAVE_CHAT,
          data: chatInfo
        });
      } catch (error) {
        console.error('Failed to save chat:', error);
      }
    }
  }

  async getCurrentTabId() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'GET_TAB_ID' }, (response) => {
        resolve(response?.tabId || null);
      });
    });
  }

  extractChatInfo() {
    const url = window.location.href;
    const title = this.getChatTitle();
    const preview = this.getChatPreview();

    if (!title || title === 'ChatGPT') {
      return null;
    }

    return {
      url,
      title,
      preview,
      folderId: 'root' // Default to root folder
    };
  }

  getChatTitle() {
    const hostname = window.location.hostname;
    
    // Provider-specific title extraction
    if (hostname === 'chatgpt.com' || hostname === 'chat.openai.com') {
      return this.getChatGPTTitle();
    } else if (hostname === 'claude.ai') {
      return this.getClaudeTitle();
    } else if (hostname === 'gemini.google.com') {
      return this.getGeminiTitle();
    } else if (hostname === 'www.perplexity.ai') {
      return this.getPerplexityTitle();
    } else if (hostname === 'grok.x.ai') {
      return this.getGrokTitle();
    } else if (hostname === 'chat.deepseek.com') {
      return this.getDeepSeekTitle();
    }
    
    // Fallback to document title
    const docTitle = document.title.trim();
    if (docTitle && docTitle.length > 3) {
      return docTitle;
    }

    return null;
  }

  getChatGPTTitle() {
    const titleSelectors = [
      'h1',
      '[role="heading"]', 
      '.text-xl',
      '.text-lg'
    ];

    for (const selector of titleSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        const text = element.textContent?.trim();
        if (text && text !== 'ChatGPT' && text.length > 3 && text.length < 200) {
          return text;
        }
      }
    }
    return document.title !== 'ChatGPT' ? document.title : null;
  }

  getClaudeTitle() {
    // Claude conversation titles
    const titleSelectors = [
      'h1',
      '[data-testid="conversation-title"]',
      '.conversation-title',
      'main h1'
    ];
    
    for (const selector of titleSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent?.trim();
        if (text && text !== 'Claude' && text.length > 3) {
          return text;
        }
      }
    }
    return document.title !== 'Claude' ? document.title : null;
  }

  getGeminiTitle() {
    // Try various Gemini title selectors
    const titleSelectors = [
      'h1',
      '[data-test-id="conversation-title"]', 
      '.conversation-title',
      '.chat-title',
      '[role="heading"]',
      'main h1',
      'article h1'
    ];
    
    // First try to find conversation-specific title
    for (const selector of titleSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        const text = element.textContent?.trim();
        if (text && text !== 'Gemini' && text.length > 3 && text.length < 200 &&
            !text.includes('Google AI') && !text.includes('Sign in')) {
          return text;
        }
      }
    }
    
    // Try to extract from first user message or prompt
    const messageSelectors = [
      '[data-test-id="user-input"]',
      '.user-message', 
      '.message-content',
      '[role="textbox"]',
      'textarea'
    ];
    
    for (const selector of messageSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent?.trim() || element.value?.trim();
        if (text && text.length > 5 && text.length < 100) {
          // Use first few words as title
          return text.split(' ').slice(0, 6).join(' ') + (text.split(' ').length > 6 ? '...' : '');
        }
      }
    }
    
    // Fallback to document title if it's meaningful
    const docTitle = document.title.trim();
    if (docTitle && docTitle !== 'Gemini' && !docTitle.includes('Google AI') && docTitle.length > 3) {
      return docTitle;
    }
    
    // Generate a generic title with timestamp
    return `Gemini Chat ${new Date().toLocaleString()}`;
  }

  hasGeminiConversation() {
    // Check if there's actual conversation content on the page
    const conversationIndicators = [
      '[data-test-id="conversation"]',
      '.conversation',
      '.chat-container',
      '.messages',
      '[role="main"] .message',
      'main article',
      '.response-container'
    ];
    
    for (const selector of conversationIndicators) {
      const element = document.querySelector(selector);
      if (element && element.textContent?.trim().length > 10) {
        return true;
      }
    }
    
    // Check for input that has been used
    const inputElements = document.querySelectorAll('textarea, [role="textbox"]');
    for (const input of inputElements) {
      if (input.value?.trim() || input.textContent?.trim()) {
        return true;
      }
    }
    
    return false;
  }

  getPerplexityTitle() {
    // Perplexity search titles
    const titleSelectors = [
      'h1',
      '.search-title',
      '[data-testid="search-title"]'
    ];
    
    for (const selector of titleSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent?.trim();
        if (text && text !== 'Perplexity' && text.length > 3) {
          return text;
        }
      }
    }
    return document.title !== 'Perplexity' ? document.title : null;
  }

  getGrokTitle() {
    // Grok conversation titles
    const titleSelectors = [
      'h1',
      '.chat-title',
      '[data-testid="chat-title"]'
    ];
    
    for (const selector of titleSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent?.trim();
        if (text && text !== 'Grok' && text.length > 3) {
          return text;
        }
      }
    }
    return document.title !== 'Grok' ? document.title : null;
  }

  getDeepSeekTitle() {
    // DeepSeek conversation titles
    const titleSelectors = [
      'h1',
      '.conversation-title',
      '[data-testid="conversation-title"]'
    ];
    
    for (const selector of titleSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent?.trim();
        if (text && text !== 'DeepSeek' && text.length > 3) {
          return text;
        }
      }
    }
    return document.title !== 'DeepSeek' ? document.title : null;
  }

  getChatPreview() {
    // Try to extract first message or conversation content
    const messageSelectors = [
      '[data-message-author-role="user"]',
      '.user-message',
      '[role="article"]',
      '.message'
    ];

    for (const selector of messageSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent?.trim();
        if (text && text.length > 10) {
          return text.substring(0, 200) + (text.length > 200 ? '...' : '');
        }
      }
    }

    return '';
  }

  isValidAIConversation() {
    const url = window.location.href;
    const title = document.title;
    const hostname = window.location.hostname;
    
    // Check if this looks like an AI conversation
    if (!title || title.length <= 3) return false;
    
    // ChatGPT/OpenAI
    if ((hostname === 'chatgpt.com' || hostname === 'chat.openai.com') && 
        url.includes('/c/') && title !== 'ChatGPT') {
      return true;
    }
    
    // Claude
    if (hostname === 'claude.ai' && 
        (url.includes('/chat/') || url.includes('/conversation/')) && 
        title !== 'Claude') {
      return true;
    }
    
    // Gemini
    if (hostname === 'gemini.google.com' && 
        (url.includes('/app') || window.location.pathname === '/app') && 
        title !== 'Gemini' && !title.includes('Google AI')) {
      // Check if there's actual conversation content
      const hasConversation = this.hasGeminiConversation();
      return hasConversation;
    }
    
    // Perplexity
    if (hostname === 'www.perplexity.ai' && 
        (url.includes('/search/') || window.location.pathname.length > 1) && 
        title !== 'Perplexity') {
      return true;
    }
    
    // Grok
    if (hostname === 'grok.x.ai' && 
        window.location.pathname.length > 1 && 
        title !== 'Grok') {
      return true;
    }
    
    // DeepSeek
    if (hostname === 'chat.deepseek.com' && 
        window.location.pathname.length > 1 && 
        title !== 'DeepSeek') {
      return true;
    }
    
    return false;
  }

  async extractAndSendChatInfo(sendResponse) {
    const chatInfo = this.extractChatInfo();
    if (chatInfo) {
      sendResponse({ success: true, data: chatInfo });
    } else {
      sendResponse({ success: false, error: 'Could not extract chat info' });
    }
  }
}

// Initialize content script
new ChatGPTContentScript();
