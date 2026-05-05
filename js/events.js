// Event Listeners Module - Central event handler setup

function setupEventListeners(updateCountersCallback, handleReplyClick, handleEditClick) {
    // Pin button to toggle preset panel
    const pinBtn = document.getElementById('pin-btn');
    if (pinBtn) {
        pinBtn.onclick = (e) => {
            e.stopPropagation();
            togglePresetPanel();
        };
    }
    
    // Outside click detection for preset panel, reaction popup, and presence modal
    document.addEventListener('click', (e) => {
        // Close presence modal if clicking outside
        if (elements.presenceModal.classList.contains('show')) {
            const isClickInsideModal = elements.presenceModal.querySelector('.modal-content').contains(e.target);
            const isClickOnNameBtn = elements.otherUserNameBtn.contains(e.target);
            
            if (!isClickInsideModal && !isClickOnNameBtn) {
                elements.presenceModal.classList.remove('show');
            }
        }
        
        // Close preset panel if clicking outside (Only in Normal Mode)
        const isBlocked = elements.blockedPanel && elements.blockedPanel.style.display !== 'none';
        if (!isBlocked && elements.quickMessagesContainer.style.display === 'block') {
            const isClickInsidePresetArea = elements.quickMessagesContainer.contains(e.target);
            const isClickOnPinBtn = pinBtn && pinBtn.contains(e.target);
            
            if (!isClickInsidePresetArea && !isClickOnPinBtn) {
                closePresetPanel();
            }
        }
        
        // Reaction popup outside click
        handleReactionPopupOutsideClick(e);
    });
    
    // Identity selection
    document.getElementById('select-mazen').onclick = () => setIdentity('MAZEN', handleReplyClick, handleEditClick);
    document.getElementById('select-asmaa').onclick = () => setIdentity('ASMAA', handleReplyClick, handleEditClick);
    
    // Messaging
    elements.sendBtn.onclick = () => {
        sendMessage(elements, handleReplyClick, handleEditClick, updateCountersCallback);
        // Update activity when sending message
        const currentUser = getCurrentSender();
        if (currentUser) {
            updateUserActivity(currentUser);
            updatePresenceStatus(elements);
        }
    };
    
    // Keyboard behavior based on device type
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                     (window.innerWidth <= 800 && window.matchMedia("(pointer: coarse)").matches);

    elements.messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            if (!isMobile) {
                // Desktop/Laptop: Enter sends, Shift+Enter new line
                if (!e.shiftKey) {
                    e.preventDefault();
                    sendMessage(elements, handleReplyClick, handleEditClick, updateCountersCallback);
                    
                    const currentUser = getCurrentSender();
                    if (currentUser) {
                        updateUserActivity(currentUser);
                        updatePresenceStatus(elements);
                    }
                }
            }
            // Mobile: Default behavior for textarea is new line, so we do nothing extra
        }
    });

    // Auto resize and quick message visibility
    elements.messageInput.oninput = () => {
        elements.messageInput.style.height = 'auto';
        elements.messageInput.style.height = elements.messageInput.scrollHeight + 'px';
        updateQuickMessageVisibility();
    };

    // Final Note Modal
    elements.finalNoteSend.onclick = () => sendFinalNote(elements, handleReplyClick, handleEditClick);
    elements.finalNoteCancel.onclick = () => elements.finalNoteModal.classList.remove('show');
    elements.finalNoteBtn.onclick = () => elements.finalNoteModal.classList.add('show');

    // Generic Modal close
    document.getElementById('modal-close').onclick = () => elements.warningModal.classList.remove('show');
    
    // Reply Preview Close
    elements.replyPreviewClose.onclick = () => cancelReply(elements);
    
    // Search functionality
    elements.searchInput.oninput = () => handleSearch(elements);
    elements.searchClearBtn.onclick = () => {
        clearSearch(elements);
        closeSearchView();
    };
    elements.searchNextBtn.onclick = () => navigateSearchNext(elements);
    elements.searchPrevBtn.onclick = () => navigateSearchPrev(elements);
    
    // Header search toggle
    elements.searchTriggerBtn.onclick = () => openSearchView();
    elements.searchBackBtn.onclick = () => closeSearchView();
    
    // Presence modal toggle
    elements.otherUserNameBtn.onclick = () => {
        elements.presenceModal.classList.add('show');
        updatePresenceStatus(elements);
    };
    
    // Quick message system
    setupQuickMessageListeners(updateCountersCallback, handleReplyClick, handleEditClick);
    
    // Reaction system
    setupReactionListeners(handleReplyClick, handleEditClick);
    
    // Media buttons
    elements.attachBtn.onclick = () => {
        elements.fileInput.click();
    };
    
    elements.fileInput.onchange = (e) => {
        handleFileSelection(e.target.files);
    };
    
    elements.voiceBtn.onclick = () => {
        if (elements.voiceBtn.classList.contains('recording')) {
            stopVoiceRecording(false);
        } else {
            startVoiceRecording();
        }
    };
    
    elements.voiceCancel.onclick = () => {
        stopVoiceRecording(false);
    };
    
    elements.voiceSend.onclick = () => {
        stopVoiceRecording(true);
    };
    
    // Media preview modal
    elements.mediaPreviewCancel.onclick = () => {
        elements.mediaPreviewModal.classList.remove('show');
        pendingMediaFiles = [];
    };
    
    elements.mediaPreviewSend.onclick = () => {
        sendMediaFromPreview();
    };
}

function openSearchView() {
    elements.headerNormalView.style.display = 'none';
    elements.headerSearchView.style.display = 'block';
    setTimeout(() => elements.searchInput.focus(), 100);
}

function closeSearchView() {
    elements.headerSearchView.style.display = 'none';
    elements.headerNormalView.style.display = 'flex';
    clearSearch(elements);
}

function setIdentity(id, handleReplyClick, handleEditClick) {
    setCurrentSender(id);
    localStorage.setItem(IDENTITY_KEY, id);
    elements.identityModal.classList.remove('show');
    
    // Firebase-ready: Mark user as online
    markUserOnline(id);
        // 🔥 Start Firebase real-time listeners
        firebaseListenMessages(handleReplyClick, handleEditClick);
        firebaseListenLimits();
        firebaseListenReactions(handleReplyClick, handleEditClick);
        firebaseListenPresence(getOtherUser(id));
    
    // Check for unread messages and re-render with divider if needed
    const firstUnreadIndex = getFirstUnreadIndex(id);
    renderAllMessages(elements, handleReplyClick, handleEditClick, firstUnreadIndex);
    
    // Mark messages as read
    if (firstUnreadIndex !== -1) {
        markMessagesAsRead(id);
    }
    
    checkUIState(elements);
    updateQuickMessageVisibility();
    
    // Start presence updates
    startPresenceUpdates(elements);
    setupPresenceTracking(handleReplyClick, handleEditClick);
    
    // Request notification permission after identity is set
    requestNotificationPermission();
}

// Presence Tracking Setup
// Firebase-ready: This would be replaced with Firebase presence system in production
function setupPresenceTracking(handleReplyClick, handleEditClick) {
    const currentUser = getCurrentSender();
    if (!currentUser) return;
    
    // Update activity on user interactions
    const updateActivity = () => {
        updateUserActivity(currentUser);
        updatePresenceStatus(elements);
    };
    
    // Track interactions
    document.addEventListener('click', updateActivity);
    document.addEventListener('keydown', updateActivity);
    document.addEventListener('touchstart', updateActivity);
    
    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // Firebase-ready: Mark user offline when page hidden
            markUserOffline(currentUser);
        } else {
            // Firebase-ready: Mark user online when page visible
            markUserOnline(currentUser);
            updatePresenceStatus(elements);
        }
    });
    
    // Handle page unload
    window.addEventListener('beforeunload', () => {
        // Firebase-ready: Mark user offline when page closed
        markUserOffline(currentUser);
    });
    
    // Periodic activity update while page is active
    setInterval(() => {
        if (!document.hidden && currentUser) {
            updateUserActivity(currentUser);
        }
    }, 60000); // Update every minute
}