// DOM Elements Module - Central registry of all UI elements

const elements = {
    chatArea: document.getElementById('chat-area'),
    messagesContainer: document.getElementById('messages-container'),
    messageInput: document.getElementById('message-input'),
    sendBtn: document.getElementById('send-btn'),
    pinBtn: document.getElementById('pin-btn'),
    mazenCounter: document.getElementById('mazen-counter'),
    asmaaCounter: document.getElementById('asmaa-counter'),
    
    identityModal: document.getElementById('identity-modal'),
    finalNoteModal: document.getElementById('final-note-modal'),
    warningModal: document.getElementById('warning-modal'),
    presenceModal: document.getElementById('presence-modal'),
    
    inputWrapper: document.getElementById('input-wrapper'),
    blockedPanel: document.getElementById('blocked-panel'),
    blockedMessage: document.getElementById('blocked-message'),
    countdownContainer: document.getElementById('countdown-container'),
    countdownTimer: document.getElementById('countdown-timer'),
    finalNoteBtn: document.getElementById('final-note-btn'),
    
    finalNoteInput: document.getElementById('final-note-input'),
    finalNoteSend: document.getElementById('final-note-send'),
    finalNoteCancel: document.getElementById('final-note-cancel'),
    
    replyPreviewBar: document.getElementById('reply-preview-bar'),
    replyPreviewSender: document.getElementById('reply-preview-sender'),
    replyPreviewMessage: document.getElementById('reply-preview-message'),
    replyPreviewClose: document.getElementById('reply-preview-close'),
    
    searchInput: document.getElementById('search-input'),
    searchClearBtn: document.getElementById('search-clear-btn'),
    searchControls: document.getElementById('search-controls'),
    searchCounter: document.getElementById('search-counter'),
    searchPrevBtn: document.getElementById('search-prev-btn'),
    searchNextBtn: document.getElementById('search-next-btn'),
    
    quickMessagesContainer: document.getElementById('quick-messages-container'),
    quickMainButtons: document.getElementById('quick-main-buttons'),
    quickPresetPanel: document.getElementById('quick-preset-panel'),
    quickPresetButtons: document.getElementById('quick-preset-buttons'),
    
    reactionPopup: document.getElementById('reaction-popup'),
    reactionEmojis: document.getElementById('reaction-emojis'),
    reactionAddBtn: document.getElementById('reaction-add-btn'),
    
    headerNormalView: document.getElementById('header-normal-view'),
    headerSearchView: document.getElementById('header-search-view'),
    searchTriggerBtn: document.getElementById('search-trigger-btn'),
    searchBackBtn: document.getElementById('search-back-btn'),
    
    otherUserNameBtn: document.getElementById('other-user-name-btn'),
    otherUserNameDisplay: document.getElementById('other-user-name-display'),
    presenceIndicatorDot: document.getElementById('presence-indicator-dot'),
    presenceModalIndicator: document.getElementById('presence-modal-indicator'),
    presenceModalName: document.getElementById('presence-modal-name'),
    presenceModalStatus: document.getElementById('presence-modal-status')
};