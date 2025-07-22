// Clean minimal UI for ChatGPT Tree Manager
console.log('🎨 Loading clean sidepanel interface');

const MESSAGE_TYPES = {
  GET_ALL_DATA: 'GET_ALL_DATA',
  CREATE_FOLDER: 'CREATE_FOLDER',
  DELETE_FOLDER: 'DELETE_FOLDER',
  RENAME_CHAT: 'RENAME_CHAT',
  DELETE_CHAT: 'DELETE_CHAT',
  CREATE_SUBCHAT: 'CREATE_SUBCHAT',
  CREATE_CHAT_IN_FOLDER: 'CREATE_CHAT_IN_FOLDER'
};

let currentData = { folders: [], chats: [], settings: {} };

// Track collapsed/expanded state
let collapsedItems = new Set();

// Utility functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function sendMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

// Data loading
async function loadData() {
  try {
    console.log('📥 Loading data from background script...');
    const response = await sendMessage({ type: MESSAGE_TYPES.GET_ALL_DATA });
    
    if (response?.success) {
      currentData = response.data;
      console.log('✅ Data loaded:', {
        folders: currentData.folders?.length || 0,
        chats: currentData.chats?.length || 0,
        settings: Object.keys(currentData.settings || {}).length
      });
      renderTree();
    } else {
      throw new Error(response?.error || 'Failed to load data');
    }
  } catch (error) {
    console.error('❌ Load error:', error);
    showNotification('Failed to load data: ' + error.message, 'error');
    
    // Show error in tree view
    const treeView = document.getElementById('treeView');
    if (treeView) {
      treeView.innerHTML = `
        <div class="error-state">
          <p>Failed to load data</p>
          <p class="error-message">${error.message}</p>
          <button class="retry-btn" data-action="retry">Retry</button>
        </div>
      `;
    }
  }
}

// Clean list-style rendering
function renderTree() {
  const treeView = document.getElementById('treeView');
  treeView.innerHTML = '';
  
  if (!currentData || (!currentData.folders?.length && !currentData.chats?.length)) {
    treeView.innerHTML = '<div class="loading">No folders or chats found. Create a folder to get started.</div>';
    return;
  }
  
  // Group folders with their chat counts
  const rootFolders = currentData.folders.filter(f => !f.parent_id);
  
  rootFolders.forEach(folder => {
    const chatCount = currentData.chats.filter(c => c.folder_id === folder.id).length;
    renderFolderListItem(folder, chatCount, treeView);
    
    // Render root chats under each folder (chats without parent_chat_id) if folder is expanded
    const isExpanded = collapsedItems.has(`folder-${folder.id}`) ? false : true;
    if (isExpanded) {
      const folderChats = currentData.chats.filter(c => c.folder_id === folder.id && !c.parent_chat_id);
      folderChats.forEach(chat => {
        renderChatListItem(chat, treeView, 0);
      });
    }
  });

  // Show orphaned chats (root level chats without parent)
  const orphanedChats = currentData.chats.filter(c => !c.folder_id && !c.parent_chat_id);
  if (orphanedChats.length > 0) {
    orphanedChats.forEach(chat => {
      renderChatListItem(chat, treeView, 0);
    });
  }
}

function renderFolderListItem(folder, chatCount, container) {
  const listItem = document.createElement('div');
  listItem.className = 'list-item folder-item';
  if (chatCount > 0) listItem.classList.add('has-chats');
  
  // Check if folder is expanded (default: expanded)
  const isExpanded = collapsedItems.has(`folder-${folder.id}`) ? false : true;
  
  // Status indicator based on activity
  const hasRecentActivity = chatCount > 0;
  const statusClass = hasRecentActivity ? 'success' : 'loading';
  
  listItem.innerHTML = `
    <div class="list-item-content">
      ${chatCount > 0 ? `
        <button class="tree-toggle" data-folder-id="${folder.id}" title="${isExpanded ? 'Collapse' : 'Expand'} folder">
          <span class="toggle-icon ${isExpanded ? 'expanded' : 'collapsed'}">${isExpanded ? '▼' : '▶'}</span>
        </button>
      ` : '<span class="tree-spacer"></span>'}
      <button class="expand-btn folder-add-btn" data-folder-id="${folder.id}" title="Add chat to folder">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14"></path>
          <path d="M5 12h14"></path>
        </svg>
      </button>
      <div class="list-item-icon">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="#8e8e93">
          <path d="M1.75 2.5h3.5l1.5 1.5h6.5c.55 0 1 .45 1 1v7c0 .55-.45 1-1 1h-11c-.55 0-1-.45-1-1v-9c0-.55.45-1 1-1z"/>
        </svg>
      </div>
      <span class="list-item-label">${escapeHtml(folder.name)}</span>
    </div>
    <div class="list-item-meta">
      ${chatCount > 0 ? `<span class="count-badge">${chatCount}</span>` : ''}
      <div class="status-indicator ${statusClass}"></div>
      <div class="item-actions">
        <button class="action-btn delete-btn" data-folder-id="${folder.id}" title="Delete folder">
          <svg width="12" height="12" viewBox="0 0 16 16">
            <path fill="currentColor" d="M6.5 1h3c.3 0 .5.2.5.5v1H13c.3 0 .5.2.5.5s-.2.5-.5.5h-.5v9c0 .8-.7 1.5-1.5 1.5H4.5c-.8 0-1.5-.7-1.5-1.5v-9H2.5c-.3 0-.5-.2-.5-.5s.2-.5.5-.5H6V1.5c0-.3.2-.5.5-.5z"/>
          </svg>
        </button>
      </div>
    </div>
  `;
  
  // Add toggle listener if folder has chats
  if (chatCount > 0) {
    const toggleBtn = listItem.querySelector('.tree-toggle');
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFolder(folder.id);
    });
  }
  
  // Add create chat listener
  const addBtn = listItem.querySelector('.folder-add-btn');
  addBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    createChatInFolder(folder.id);
  });
  
  // Add delete listener
  const deleteBtn = listItem.querySelector('.delete-btn');
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    deleteFolder(folder.id);
  });
  
  container.appendChild(listItem);
}

function renderChatListItem(chat, container, depth = 0) {
  const listItem = document.createElement('div');
  listItem.className = 'list-item chat-item';
  listItem.style.paddingLeft = (depth * 20 + 40) + 'px';
  
  const hasUrl = chat.url && isValidLLMUrl(chat.url);
  const statusClass = hasUrl ? 'success' : 'loading';
  
  // Check if this chat has subchats
  const subchats = currentData.chats.filter(c => c.parent_chat_id === chat.id);
  const hasSubchats = subchats.length > 0;
  
  // Check if chat is expanded (default: expanded)
  const isExpanded = collapsedItems.has(`chat-${chat.id}`) ? false : true;
  
  listItem.innerHTML = `
    <div class="list-item-content">
      ${hasSubchats ? `
        <button class="tree-toggle" data-chat-id="${chat.id}" title="${isExpanded ? 'Collapse' : 'Expand'} subchats">
          <span class="toggle-icon ${isExpanded ? 'expanded' : 'collapsed'}">${isExpanded ? '▼' : '▶'}</span>
        </button>
      ` : '<span class="tree-spacer"></span>'}
      <button class="expand-btn ${hasSubchats ? 'has-children' : ''}" data-chat-id="${chat.id}" title="Add subchat">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14"></path>
          <path d="M5 12h14"></path>
        </svg>
      </button>
      <div class="list-item-icon">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="#007aff">
          <rect x="2" y="3" width="12" height="8" rx="2" fill="#007aff"/>
          <circle cx="5" cy="7" r="1" fill="white"/>
          <circle cx="8" cy="7" r="1" fill="white"/>
          <circle cx="11" cy="7" r="1" fill="white"/>
        </svg>
      </div>
      <span class="list-item-label ${hasUrl ? 'chat-clickable' : ''}" title="${chat.url || 'No URL available'}" ${hasUrl ? `data-url="${chat.url}"` : ''}>${escapeHtml(chat.title)}</span>
      ${chat.llm_name ? `<span class="llm-badge">${chat.llm_name}</span>` : ''}
      ${hasSubchats ? `<span class="subchat-count">(${subchats.length})</span>` : ''}
    </div>
    <div class="list-item-meta">
      <div class="status-indicator ${statusClass}"></div>
      <div class="item-actions">
        <button class="action-btn rename-btn" data-chat-id="${chat.id}" title="Rename chat">
          <svg width="12" height="12" viewBox="0 0 16 16">
            <path fill="currentColor" d="M13.5 1c.8 0 1.5.7 1.5 1.5 0 .4-.2.8-.5 1.1L6.9 11.2c-.1.1-.3.2-.4.2l-3 .5c-.3.1-.6-.2-.5-.5l.5-3c0-.2.1-.3.2-.4L11.4 1.5c.3-.3.7-.5 1.1-.5z"/>
          </svg>
        </button>
        <button class="action-btn delete-btn" data-chat-id="${chat.id}" title="Delete chat">
          <svg width="12" height="12" viewBox="0 0 16 16">
            <path fill="currentColor" d="M6.5 1h3c.3 0 .5.2.5.5v1H13c.3 0 .5.2.5.5s-.2.5-.5.5h-.5v9c0 .8-.7 1.5-1.5 1.5H4.5c-.8 0-1.5-.7-1.5-1.5v-9H2.5c-.3 0-.5-.2-.5-.5s.2-.5.5-.5H6V1.5c0-.3.2-.5.5-.5z"/>
          </svg>
        </button>
      </div>
    </div>
  `;
  
  // Add toggle listener if chat has subchats
  if (hasSubchats) {
    const toggleBtn = listItem.querySelector('.tree-toggle');
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleChat(chat.id);
    });
  }
  
  // Add click listener for chat URL
  const chatLabel = listItem.querySelector('.list-item-label');
  if (hasUrl) {
    chatLabel.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await chrome.tabs.create({ url: chat.url });
      } catch (error) {
        showNotification('Failed to open chat', 'error');
      }
    });
  }
  
  // Add expand/add subchat listener
  const expandBtn = listItem.querySelector('.expand-btn');
  expandBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    createSubchat(chat.id);
  });
  
  // Add rename listener
  const renameBtn = listItem.querySelector('.rename-btn');
  renameBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    renameChat(chat.id, chat.title);
  });
  
  // Add delete listener
  const deleteBtn = listItem.querySelector('.delete-btn');
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    deleteChat(chat.id);
  });
  
  container.appendChild(listItem);
  
  // Render subchats recursively if expanded
  if (hasSubchats && isExpanded) {
    subchats.forEach(subchat => {
      renderChatListItem(subchat, container, depth + 1);
    });
  }
}

// Custom Modal Functions
function showInputModal(title, placeholder, description, buttonText = 'Create', showLLMDropdown = false) {
  return new Promise((resolve) => {
    const modal = document.getElementById('inputModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalInput = document.getElementById('modalInput');
    const modalDescription = document.getElementById('modalDescription');
    const modalConfirmBtn = document.getElementById('modalConfirmBtn');
    const modalCancelBtn = document.getElementById('modalCancelBtn');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    const llmDropdownContainer = document.getElementById('llmDropdownContainer');
    const llmSelect = document.getElementById('llmSelect');

    // Set modal content
    modalTitle.textContent = title;
    modalInput.placeholder = placeholder;
    modalInput.value = '';
    modalDescription.textContent = description || '';
    modalConfirmBtn.textContent = buttonText;

    // Show/hide LLM dropdown
    if (showLLMDropdown) {
      llmDropdownContainer.style.display = 'block';
      llmSelect.value = '';
    } else {
      llmDropdownContainer.style.display = 'none';
    }

    // Show modal
    modal.style.display = 'flex';
    modalInput.focus();

    // Handle confirm
    const handleConfirm = () => {
      const value = modalInput.value.trim();
      const llmValue = showLLMDropdown ? llmSelect.value : null;
      
      if (!value) {
        modalInput.style.borderColor = '#ff3b30';
        setTimeout(() => {
          modalInput.style.borderColor = '#333';
        }, 1000);
        return;
      }
      
      if (showLLMDropdown && !llmValue) {
        llmSelect.style.borderColor = '#ff3b30';
        setTimeout(() => {
          llmSelect.style.borderColor = '#333';
        }, 1000);
        return;
      }
      
      cleanup();
      resolve(showLLMDropdown ? { title: value, llm: llmValue } : value);
    };

    // Handle cancel
    const handleCancel = () => {
      cleanup();
      resolve(null);
    };

    // Cleanup function
    const cleanup = () => {
      modal.style.display = 'none';
      modalConfirmBtn.removeEventListener('click', handleConfirm);
      modalCancelBtn.removeEventListener('click', handleCancel);
      modalCloseBtn.removeEventListener('click', handleCancel);
      document.removeEventListener('keydown', handleKeydown);
      modal.removeEventListener('click', handleOutsideClick);
    };

    // Handle keyboard events
    const handleKeydown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleConfirm();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    };

    // Handle clicking outside modal
    const handleOutsideClick = (e) => {
      if (e.target === modal) {
        handleCancel();
      }
    };

    // Add event listeners
    modalConfirmBtn.addEventListener('click', handleConfirm);
    modalCancelBtn.addEventListener('click', handleCancel);
    modalCloseBtn.addEventListener('click', handleCancel);
    document.addEventListener('keydown', handleKeydown);
    modal.addEventListener('click', handleOutsideClick);
  });
}

// Actions
async function createFolder() {
  const name = await showInputModal(
    'Create New Folder',
    'Enter folder name...',
    'Create a custom folder to organize your AI conversations.'
  );
  
  if (!name) return;

  try {
    await sendMessage({
      type: MESSAGE_TYPES.CREATE_FOLDER,
      data: { name: name, parentId: null }
    });
    
    showNotification('Folder created successfully', 'success');
    await loadData();
  } catch (error) {
    showNotification('Failed to create folder: ' + error.message, 'error');
  }
}

async function deleteFolder(folderId) {
  if (!confirm('Are you sure you want to delete this folder and all its chats?')) {
    return;
  }

  try {
    await sendMessage({
      type: MESSAGE_TYPES.DELETE_FOLDER,
      data: { folderId }
    });
    
    showNotification('Folder deleted successfully', 'success');
    await loadData();
  } catch (error) {
    showNotification('Failed to delete folder: ' + error.message, 'error');
  }
}

async function renameChat(chatId, currentTitle) {
  const newTitle = await showInputModal(
    'Rename Chat',
    currentTitle,
    'Give this conversation a more descriptive name.',
    'Rename'
  );
  
  if (!newTitle || newTitle === currentTitle) return;

  try {
    await sendMessage({
      type: MESSAGE_TYPES.RENAME_CHAT,
      data: { 
        chatId: chatId,
        newTitle: newTitle
      }
    });
    
    showNotification('Chat renamed successfully', 'success');
    await loadData();
  } catch (error) {
    showNotification('Failed to rename chat: ' + error.message, 'error');
  }
}

async function deleteChat(chatId) {
  if (!confirm('Are you sure you want to delete this chat?')) {
    return;
  }

  try {
    await sendMessage({
      type: MESSAGE_TYPES.DELETE_CHAT,
      data: { chatId }
    });
    
    showNotification('Chat deleted successfully', 'success');
    await loadData();
  } catch (error) {
    showNotification('Failed to delete chat: ' + error.message, 'error');
  }
}

async function refreshData() {
  console.log('🔄 Refreshing data...');
  showNotification('Refreshing data...', 'info');
  
  try {
    await loadData();
    showNotification('Data refreshed successfully', 'success');
    console.log('✅ Data refreshed successfully');
  } catch (error) {
    console.error('❌ Failed to refresh data:', error);
    showNotification('Failed to refresh data: ' + error.message, 'error');
  }
}

async function createSubchat(parentChatId) {
  const result = await showInputModal(
    'Create Subchat',
    'Enter subchat name...',
    'Create a subchat to organize related conversations.',
    'Create',
    true // Show LLM dropdown
  );
  
  if (!result) return;

  try {
    await sendMessage({
      type: MESSAGE_TYPES.CREATE_SUBCHAT,
      data: { 
        parentChatId: parentChatId,
        title: result.title,
        llm: result.llm
      }
    });
    
    showNotification('Subchat created successfully', 'success');
    await loadData();
  } catch (error) {
    showNotification('Failed to create subchat: ' + error.message, 'error');
  }
}

async function createChatInFolder(folderId) {
  const result = await showInputModal(
    'Create Chat',
    'Enter chat name...',
    'Create a new conversation in this folder.',
    'Create',
    true // Show LLM dropdown
  );
  
  if (!result) return;

  try {
    await sendMessage({
      type: MESSAGE_TYPES.CREATE_CHAT_IN_FOLDER,
      data: { 
        folderId: folderId,
        title: result.title,
        llm: result.llm
      }
    });
    
    showNotification('Chat created successfully', 'success');
    await loadData();
  } catch (error) {
    showNotification('Failed to create chat: ' + error.message, 'error');
  }
}

// Toggle functions for expand/collapse
function toggleFolder(folderId) {
  const itemKey = `folder-${folderId}`;
  if (collapsedItems.has(itemKey)) {
    collapsedItems.delete(itemKey);
  } else {
    collapsedItems.add(itemKey);
  }
  renderTree();
}

function toggleChat(chatId) {
  const itemKey = `chat-${chatId}`;
  if (collapsedItems.has(itemKey)) {
    collapsedItems.delete(itemKey);
  } else {
    collapsedItems.add(itemKey);
  }
  renderTree();
}

function collapseAll() {
  console.log('📁 Collapsing all items');
  
  // Add all folders with chats to collapsed set
  currentData.folders.forEach(folder => {
    const chatCount = currentData.chats.filter(c => c.folder_id === folder.id).length;
    if (chatCount > 0) {
      collapsedItems.add(`folder-${folder.id}`);
    }
  });
  
  // Add all chats with subchats to collapsed set
  currentData.chats.forEach(chat => {
    const subchats = currentData.chats.filter(c => c.parent_chat_id === chat.id);
    if (subchats.length > 0) {
      collapsedItems.add(`chat-${chat.id}`);
    }
  });
  
  renderTree();
  showNotification('All items collapsed', 'success');
}

function expandAll() {
  console.log('📂 Expanding all items');
  collapsedItems.clear();
  renderTree();
  showNotification('All items expanded', 'success');
}

// LLM Selection Modal
function showLLMSelectionModal() {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'llm-modal-overlay';
    modal.innerHTML = `
      <div class="llm-modal">
        <div class="llm-modal-header">
          <h3>Select Language Model</h3>
          <button class="llm-modal-close">&times;</button>
        </div>
        <div class="llm-modal-content">
          <div class="llm-options">
            <div class="llm-option" data-llm="openai">
              <div class="llm-icon">🤖</div>
              <div class="llm-info">
                <div class="llm-name">OpenAI GPT</div>
                <div class="llm-desc">ChatGPT-4, GPT-3.5</div>
              </div>
            </div>
            <div class="llm-option" data-llm="anthropic">
              <div class="llm-icon">🧠</div>
              <div class="llm-info">
                <div class="llm-name">Anthropic Claude</div>
                <div class="llm-desc">Claude 3.5 Sonnet, Haiku</div>
              </div>
            </div>
            <div class="llm-option" data-llm="google">
              <div class="llm-icon">💎</div>
              <div class="llm-info">
                <div class="llm-name">Google Gemini</div>
                <div class="llm-desc">Gemini Pro, Ultra</div>
              </div>
            </div>
            <div class="llm-option" data-llm="perplexity">
              <div class="llm-icon">🔍</div>
              <div class="llm-info">
                <div class="llm-name">Perplexity</div>
                <div class="llm-desc">Real-time search AI</div>
              </div>
            </div>
            <div class="llm-option" data-llm="xai">
              <div class="llm-icon">🚀</div>
              <div class="llm-info">
                <div class="llm-name">xAI Grok</div>
                <div class="llm-desc">Grok-1, Grok-2</div>
              </div>
            </div>
            <div class="llm-option" data-llm="deepseek">
              <div class="llm-icon">🌊</div>
              <div class="llm-info">
                <div class="llm-name">DeepSeek</div>
                <div class="llm-desc">DeepSeek Coder, Chat</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Add event listeners
    const closeBtn = modal.querySelector('.llm-modal-close');
    const options = modal.querySelectorAll('.llm-option');

    closeBtn.addEventListener('click', () => {
      document.body.removeChild(modal);
      resolve(null);
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
        resolve(null);
      }
    });

    options.forEach(option => {
      option.addEventListener('click', () => {
        const llm = option.getAttribute('data-llm');
        document.body.removeChild(modal);
        resolve(llm);
      });
    });
  });
}

async function debugPendingLinks() {
  try {
    const response = await sendMessage({ type: 'DEBUG_PENDING_LINKS' });
    console.log('Debug pending links:', response);
    showNotification('Check console for debug info', 'info');
  } catch (error) {
    console.error('Debug error:', error);
  }
}

// Helper function to check if URL is a valid LLM URL
function isValidLLMUrl(url) {
  if (!url) return false;
  
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

// Notifications
function showNotification(message, type = 'info') {
  const notification = document.getElementById('notification');
  notification.textContent = message;
  notification.className = `notification ${type}`;
  notification.classList.add('show');
  
  setTimeout(() => {
    notification.classList.remove('show');
  }, 3000);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  console.log('Clean sidepanel DOM loaded');
  
  // Add event listeners
  document.getElementById('createFolderBtn').addEventListener('click', createFolder);
  document.getElementById('refreshBtn').addEventListener('click', refreshData);
  
  // Event delegation for dynamically added buttons
  document.addEventListener('click', (e) => {
    // Handle retry button clicks
    if (e.target.matches('.retry-btn[data-action="retry"]')) {
      e.preventDefault();
      loadData();
    }
  });
  
  // Add collapse/expand all button functionality
  const collapseBtn = document.querySelector('.collapse-btn');
  if (collapseBtn) {
    let isCollapsed = false;
    collapseBtn.addEventListener('click', () => {
      if (isCollapsed) {
        expandAll();
        collapseBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 18l6-6-6-6"></path>
          </svg>
        `;
        collapseBtn.title = 'Collapse All';
        isCollapsed = false;
      } else {
        collapseAll();
        collapseBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 18l-6-6 6-6"></path>
          </svg>
        `;
        collapseBtn.title = 'Expand All';
        isCollapsed = true;
      }
    });
  }
  
  if (document.getElementById('debugBtn')) {
    document.getElementById('debugBtn').addEventListener('click', debugPendingLinks);
  }
  
  // Load initial data
  loadData();
});