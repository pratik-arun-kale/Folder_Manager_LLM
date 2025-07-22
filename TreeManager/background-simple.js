// Simple background script using Chrome storage only
console.log('🚀 Simple background script starting...');

const MESSAGE_TYPES = {
  GET_ALL_DATA: 'GET_ALL_DATA',
  CREATE_FOLDER: 'CREATE_FOLDER',
  DELETE_FOLDER: 'DELETE_FOLDER',
  SAVE_CHAT: 'SAVE_CHAT',
  DELETE_CHAT: 'DELETE_CHAT',
  UPDATE_SETTINGS: 'UPDATE_SETTINGS'
};

class SimpleBackgroundService {
  constructor() {
    console.log('🏗️ Initializing simple background service...');
    this.setupListeners();
    this.initializeStorage();
  }

  setupListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('📨 Message received:', message.type);
      this.handleMessage(message, sender, sendResponse);
      return true;
    });

    // Listen for tab updates to detect new AI conversations
    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      if (tab.url && this.isValidLLMUrl(tab.url)) {
        console.log('🔄 Tab updated:', {
          tabId,
          url: changeInfo.url || tab.url,
          title: tab.title,
          isLLMSite: this.isValidLLMUrl(tab.url),
          isConversation: this.isConversationUrl(tab.url),
          changeInfo: changeInfo
        });
        
        // For Gemini and other SPA sites, check on title changes too
        if (this.isConversationUrl(tab.url) || 
            (changeInfo.title && tab.url.includes('gemini.google.com/app'))) {
          console.log('✅ AI conversation detected, checking for pending links...');
          await this.checkPendingLinks(tab.url, tab.title, tabId);
        }
      }
    });

    try {
      chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
      console.log('✅ Side panel configured');
    } catch (error) {
      console.warn('⚠️ Side panel not available');
    }
  }

  async initializeStorage() {
    try {
      const result = await chrome.storage.local.get(['folders', 'chats', 'settings']);
      
      if (!result.folders) {
        await chrome.storage.local.set({
          folders: [{ id: 'root', name: 'Root', parent_id: null, expanded: true }],
          chats: [],
          settings: { auto_capture: true, theme: 'dark' }
        });
        console.log('✅ Default storage initialized');
      } else {
        console.log('✅ Storage already exists');
      }
    } catch (error) {
      console.error('❌ Storage initialization failed:', error);
    }
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.type) {
        case 'HEALTH_CHECK':
          sendResponse({ 
            success: true, 
            data: { status: 'healthy', storage: 'chrome-local' } 
          });
          break;

        case MESSAGE_TYPES.GET_ALL_DATA:
          const data = await this.getAllData();
          sendResponse({ success: true, data });
          break;

        case MESSAGE_TYPES.CREATE_FOLDER:
          await this.createFolder(message.data);
          sendResponse({ success: true });
          break;

        case MESSAGE_TYPES.DELETE_FOLDER:
          await this.deleteFolder(message.data.folderId);
          sendResponse({ success: true });
          break;

        case MESSAGE_TYPES.DELETE_CHAT:
          await this.deleteChat(message.data.chatId);
          sendResponse({ success: true });
          break;

        case 'OPEN_FOLDER_CHAT':
          await this.openFolderChat(message.data.folderId);
          sendResponse({ success: true });
          break;

        case 'DEBUG_PENDING_LINKS':
          const debugResult = await chrome.storage.local.get(['pendingFolderLink']);
          console.log('🐛 Debug pending links:', debugResult);
          sendResponse({ success: true, data: debugResult });
          break;

        case 'RENAME_CHAT':
          await this.renameChat(message.data.chatId, message.data.newTitle);
          sendResponse({ success: true });
          break;

        case 'CREATE_SUBCHAT':
          await this.createSubchat(message.data.parentChatId, message.data.title, message.data.llm);
          sendResponse({ success: true });
          break;

        case 'CREATE_CHAT_IN_FOLDER':
          await this.createChatInFolder(message.data.folderId, message.data.title, message.data.llm);
          sendResponse({ success: true });
          break;

        case 'CHECK_PENDING_LINKS':
          const linkResult = await this.checkPendingLinks(message.data.url, message.data.title, sender.tab?.id);
          sendResponse(linkResult);
          break;

        case 'GET_TAB_ID':
          sendResponse({ tabId: sender.tab?.id });
          break;

        case 'SAVE_CHAT':
          // Handle saving chat from content script
          console.log('💾 Saving chat from content script:', message.data);
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('❌ Message handling error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async getAllData() {
    const result = await chrome.storage.local.get(['folders', 'chats', 'settings']);
    return {
      folders: result.folders || [],
      chats: result.chats || [],
      settings: result.settings || { auto_capture: true, theme: 'dark' }
    };
  }

  async createFolder(data) {
    const { name, parentId } = data;
    const result = await chrome.storage.local.get(['folders', 'chats']);
    const folders = result.folders || [];
    const chats = result.chats || [];
    
    const newFolder = {
      id: Math.random().toString(36).substr(2, 9),
      name: name.trim(),
      parent_id: parentId || null,
      expanded: false,
      created_at: new Date().toISOString(),
      chat_url: null // Will be set when ChatGPT conversation is detected
    };
    
    folders.push(newFolder);
    
    // Just save the folder - no automatic ChatGPT tab creation
    // Users can create chats using the + button on folders
    await chrome.storage.local.set({ folders });
    
    console.log('✅ Folder created:', newFolder.name);
    
    return newFolder.id;
  }

  async deleteFolder(folderId) {
    const result = await chrome.storage.local.get(['folders', 'chats']);
    const folders = (result.folders || []).filter(f => f.id !== folderId);
    const chats = (result.chats || []).filter(c => c.folder_id !== folderId);
    
    await chrome.storage.local.set({ folders, chats });
  }

  async deleteChat(chatId) {
    const result = await chrome.storage.local.get(['chats']);
    const chats = (result.chats || []).filter(c => c.id !== chatId);
    await chrome.storage.local.set({ chats });
  }

  async linkTabToFolder(tabId, url, title) {
    try {
      console.log('🔗 Attempting to link tab to folder:', { tabId, url, title });
      
      const result = await chrome.storage.local.get(['pendingFolderLink', 'folders', 'chats']);
      const pendingLink = result.pendingFolderLink;
      
      console.log('📋 Current pending link:', pendingLink);
      
      if (pendingLink && pendingLink.tabId === tabId) {
        const folders = result.folders || [];
        const chats = result.chats || [];
        
        console.log('🎯 Found matching pending link for tab:', tabId);
        
        // Update folder with chat URL
        const folderIndex = folders.findIndex(f => f.id === pendingLink.folderId);
        if (folderIndex !== -1) {
          folders[folderIndex].chat_url = url;
          
          // Create a chat entry
          const newChat = {
            id: Math.random().toString(36).substr(2, 9),
            title: title || 'New Chat',
            url: url,
            folder_id: pendingLink.folderId,
            created_at: new Date().toISOString()
          };
          
          chats.push(newChat);
          
          await chrome.storage.local.set({ 
            folders, 
            chats,
            pendingFolderLink: null 
          });
          
          console.log('✅ Successfully linked chat to folder:', {
            folderName: folders[folderIndex].name,
            chatUrl: url,
            chatTitle: title
          });
        } else {
          console.warn('⚠️ Folder not found for pending link:', pendingLink.folderId);
        }
      } else {
        console.log('ℹ️ No matching pending link found for tab:', tabId);
      }
    } catch (error) {
      console.error('❌ Error linking tab to folder:', error);
    }
  }

  async openFolderChat(folderId) {
    try {
      const result = await chrome.storage.local.get(['folders']);
      const folders = result.folders || [];
      const folder = folders.find(f => f.id === folderId);
      
      if (folder?.chat_url) {
        await chrome.tabs.create({ url: folder.chat_url });
        console.log('✅ Opened chat for folder:', folder.name);
      } else {
        console.warn('⚠️ No chat URL found for folder:', folderId);
      }
    } catch (error) {
      console.error('❌ Error opening folder chat:', error);
    }
  }

  async renameChat(chatId, newTitle) {
    try {
      const result = await chrome.storage.local.get(['chats']);
      const chats = result.chats || [];
      
      const chatIndex = chats.findIndex(c => c.id === chatId);
      if (chatIndex !== -1) {
        chats[chatIndex].title = newTitle;
        chats[chatIndex].updated_at = new Date().toISOString();
        
        await chrome.storage.local.set({ chats });
        console.log('✅ Chat renamed:', newTitle);
      } else {
        console.warn('⚠️ Chat not found for rename:', chatId);
      }
    } catch (error) {
      console.error('❌ Error renaming chat:', error);
      throw error;
    }
  }

  async createSubchat(parentChatId, title) {
    try {
      const result = await chrome.storage.local.get(['chats']);
      const chats = result.chats || [];
      
      // Find parent chat to get folder_id
      const parentChat = chats.find(c => c.id === parentChatId);
      if (!parentChat) {
        throw new Error('Parent chat not found');
      }

      // Create new subchat with temporary ID
      const subchatId = Date.now().toString();
      const newSubchat = {
        id: subchatId,
        title: title,
        folder_id: parentChat.folder_id,
        parent_chat_id: parentChatId,
        url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Add subchat to storage first
      chats.push(newSubchat);
      await chrome.storage.local.set({ chats });
      
      console.log('✅ Subchat created:', title, 'under parent:', parentChat.title);

      // Create new ChatGPT tab for the subchat
      try {
        const chatgptTab = await chrome.tabs.create({ 
          url: 'https://chatgpt.com/', 
          active: false 
        });
        
        console.log('🌐 Created ChatGPT tab for subchat:', chatgptTab.id);
        
        // Store pending link for this subchat
        await chrome.storage.local.set({
          pendingSubchatLink: {
            subchatId: subchatId,
            tabId: chatgptTab.id,
            title: title,
            timestamp: Date.now()
          }
        });
        
        console.log('⏳ Stored pending subchat link:', subchatId);
        
      } catch (tabError) {
        console.error('❌ Error creating ChatGPT tab for subchat:', tabError);
        // Subchat still exists, just without URL initially
      }
      
    } catch (error) {
      console.error('❌ Error creating subchat:', error);
      throw error;
    }
  }

  async linkTabToSubchat(tabId, url, subchatId) {
    try {
      console.log('🔗 Linking tab to subchat:', { tabId, url, subchatId });
      
      const result = await chrome.storage.local.get(['chats']);
      const chats = result.chats || [];
      
      // Find and update the subchat with the URL
      const subchatIndex = chats.findIndex(c => c.id === subchatId);
      if (subchatIndex !== -1) {
        chats[subchatIndex].url = url;
        chats[subchatIndex].updated_at = new Date().toISOString();
        
        await chrome.storage.local.set({ chats });
        
        console.log('✅ Successfully linked subchat to URL:', {
          subchatTitle: chats[subchatIndex].title,
          url: url
        });
      } else {
        console.warn('⚠️ Subchat not found for linking:', subchatId);
      }
    } catch (error) {
      console.error('❌ Error linking tab to subchat:', error);
    }
  }

  async checkPendingLinks(url, title, tabId) {
    try {
      const result = await chrome.storage.local.get(['pendingFolderLink', 'pendingSubchatLink', 'pendingChatLink']);
      const pendingFolderLink = result.pendingFolderLink;
      const pendingSubchatLink = result.pendingSubchatLink;
      const pendingChatLink = result.pendingChatLink;
      
      // Check for folder link
      if (pendingFolderLink && pendingFolderLink.tabId === tabId) {
        await this.linkTabToFolder(tabId, url, title);
        await chrome.storage.local.remove(['pendingFolderLink']);
        return { success: true, linked: true, type: 'folder' };
      }
      
      // Check for subchat link
      if (pendingSubchatLink && pendingSubchatLink.tabId === tabId) {
        await this.linkTabToSubchat(tabId, url, pendingSubchatLink.subchatId);
        await chrome.storage.local.remove(['pendingSubchatLink']);
        return { success: true, linked: true, type: 'subchat' };
      }
      
      // Check for regular chat link
      if (pendingChatLink && pendingChatLink.tabId === tabId) {
        await this.linkTabToChat(tabId, url, pendingChatLink.chatId);
        await chrome.storage.local.remove(['pendingChatLink']);
        return { success: true, linked: true, type: 'chat' };
      }
      
      return { success: true, linked: false };
    } catch (error) {
      console.error('❌ Error checking pending links:', error);
      return { success: false, error: error.message };
    }
  }

  isValidLLMUrl(url) {
    const validHosts = [
      'chat.openai.com',
      'chatgpt.com',
      'claude.ai',
      'gemini.google.com',
      'www.perplexity.ai',
      'grok.x.ai',
      'chat.deepseek.com'
    ];
    
    try {
      const urlObj = new URL(url);
      return validHosts.includes(urlObj.hostname);
    } catch (error) {
      return false;
    }
  }

  isConversationUrl(url) {
    if (!url) return false;
    
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      const pathname = urlObj.pathname;
      
      // Check for conversation patterns for each LLM provider
      if (hostname === 'chatgpt.com' || hostname === 'chat.openai.com') {
        return pathname.includes('/c/') || pathname.includes('/chat');
      } else if (hostname === 'claude.ai') {
        return pathname.includes('/chat/') || pathname.includes('/conversation/');
      } else if (hostname === 'gemini.google.com') {
        // Gemini uses fragment routing, check if it's the app page with conversation
        return pathname.includes('/app') || pathname === '/app' || url.includes('#');
      } else if (hostname === 'www.perplexity.ai') {
        return pathname.includes('/search/') || pathname.length > 1;
      } else if (hostname === 'grok.x.ai') {
        return pathname.includes('/chat') || pathname.length > 1;
      } else if (hostname === 'chat.deepseek.com') {
        return pathname.includes('/chat') || pathname.length > 1;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  async linkTabToChat(tabId, url, chatId) {
    try {
      console.log('🔗 Linking tab to chat:', { tabId, url, chatId });
      
      const result = await chrome.storage.local.get(['chats']);
      const chats = result.chats || [];
      
      // Find and update the chat with the URL
      const chatIndex = chats.findIndex(c => c.id === chatId);
      if (chatIndex !== -1) {
        chats[chatIndex].url = url;
        chats[chatIndex].updated_at = new Date().toISOString();
        
        await chrome.storage.local.set({ chats });
        
        console.log('✅ Successfully linked chat to URL:', {
          chatTitle: chats[chatIndex].title,
          url: url
        });
      } else {
        console.warn('⚠️ Chat not found for linking:', chatId);
      }
    } catch (error) {
      console.error('❌ Error linking tab to chat:', error);
    }
  }

  async createChatInFolder(folderId, title, llm) {
    try {
      const result = await chrome.storage.local.get(['chats']);
      const chats = result.chats || [];

      // Generate appropriate URL based on LLM selection
      const chatUrl = this.getLLMUrl(llm);

      // Create new chat with temporary ID
      const chatId = Date.now().toString();
      const newChat = {
        id: chatId,
        title: title,
        folder_id: folderId,
        parent_chat_id: null,
        url: null,
        llm: llm,
        llm_name: this.getLLMName(llm),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Add chat to storage first
      chats.push(newChat);
      await chrome.storage.local.set({ chats });
      
      console.log('✅ Chat created:', title, 'with', llm, 'in folder:', folderId);

      // Create new tab for the selected LLM
      try {
        const tab = await chrome.tabs.create({ 
          url: chatUrl, 
          active: false 
        });
        
        console.log('🌐 Created', llm, 'tab for chat:', tab.id);
        
        // Store pending link for this chat
        await chrome.storage.local.set({
          pendingChatLink: {
            chatId: chatId,
            tabId: tab.id,
            title: title,
            llm: llm,
            timestamp: Date.now()
          }
        });
        
        console.log('⏳ Stored pending chat link:', chatId);
        
      } catch (tabError) {
        console.error('❌ Error creating', llm, 'tab for chat:', tabError);
        // Chat still exists, just without URL initially
      }
      
    } catch (error) {
      console.error('❌ Error creating chat in folder:', error);
      throw error;
    }
  }

  getLLMUrl(llm) {
    const urls = {
      'openai': 'https://chatgpt.com/',
      'anthropic': 'https://claude.ai/chat/',
      'google': 'https://gemini.google.com/app',
      'perplexity': 'https://www.perplexity.ai/',
      'xai': 'https://grok.x.ai/',
      'deepseek': 'https://chat.deepseek.com/'
    };
    return urls[llm] || 'https://chatgpt.com/';
  }

  getLLMName(llm) {
    const names = {
      'openai': 'OpenAI GPT',
      'anthropic': 'Anthropic Claude',
      'google': 'Google Gemini',
      'perplexity': 'Perplexity',
      'xai': 'xAI Grok',
      'deepseek': 'DeepSeek'
    };
    return names[llm] || 'OpenAI GPT';
  }

  async createSubchat(parentChatId, title, llm) {
    try {
      const result = await chrome.storage.local.get(['chats']);
      const chats = result.chats || [];

      // Find parent chat to get folder ID
      const parentChat = chats.find(c => c.id === parentChatId);
      if (!parentChat) {
        throw new Error('Parent chat not found');
      }

      // Generate appropriate URL based on LLM selection
      const chatUrl = this.getLLMUrl(llm);

      // Create new subchat
      const subchatId = Date.now().toString();
      const newSubchat = {
        id: subchatId,
        title: title,
        folder_id: parentChat.folder_id,
        parent_chat_id: parentChatId,
        url: null,
        llm: llm,
        llm_name: this.getLLMName(llm),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Add subchat to storage first
      chats.push(newSubchat);
      await chrome.storage.local.set({ chats });
      
      console.log('✅ Subchat created:', title, 'with', llm, 'under parent:', parentChatId);

      // Create new tab for the selected LLM
      try {
        const tab = await chrome.tabs.create({ 
          url: chatUrl, 
          active: false 
        });
        
        console.log('🌐 Created', llm, 'tab for subchat:', tab.id);
        
        // Store pending link for this subchat
        await chrome.storage.local.set({
          pendingSubchatLink: {
            subchatId: subchatId,
            tabId: tab.id,
            title: title,
            llm: llm,
            timestamp: Date.now()
          }
        });
        
        console.log('⏳ Stored pending subchat link:', subchatId);
        
      } catch (tabError) {
        console.error('❌ Error creating', llm, 'tab for subchat:', tabError);
        // Subchat still exists, just without URL initially
      }
      
    } catch (error) {
      console.error('❌ Error creating subchat:', error);
      throw error;
    }
  }
}

new SimpleBackgroundService();
console.log('✅ Simple background service ready');