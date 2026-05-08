// ============================================================
// Event Listeners Module - Supabase Edition
// ============================================================

function setupEventListeners(updateCountersCallback, handleReplyClick, handleEditClick) {
    const pinBtn = document.getElementById('pin-btn');
    if (pinBtn) {
        pinBtn.onclick = (e) => {
            e.stopPropagation();
            togglePresetPanel();
        };
    }

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.message-options-btn') && !e.target.closest('.message-dropdown')) {
            document.querySelectorAll('.message-dropdown').forEach(m => m.remove());
        }

        if (elements.presenceModal.classList.contains('show')) {
            const isClickInsideModal = elements.presenceModal.querySelector('.modal-content').contains(e.target);
            const isClickOnNameBtn = elements.otherUserNameBtn.contains(e.target);
            if (!isClickInsideModal && !isClickOnNameBtn) {
                elements.presenceModal.classList.remove('show');
            }
        }

        const isBlocked = elements.blockedPanel && elements.blockedPanel.style.display !== 'none';
        if (!isBlocked && elements.quickMessagesContainer.style.display === 'block') {
            const isClickInsidePresetArea = elements.quickMessagesContainer.contains(e.target);
            const isClickOnPinBtn = pinBtn && pinBtn.contains(e.target);
            if (!isClickInsidePresetArea && !isClickOnPinBtn) {
                closePresetPanel();
            }
        }

        handleReactionPopupOutsideClick(e);

        if (e.detail === 2) {
            const bubble = e.target.closest('.message-bubble');
            if (bubble) {
                const messageId = parseFloat(bubble.dataset.messageId);
                showMessageInfo(messageId);
                elements.messageInput.focus();
            }
        }
    });

    // Identity selection
    document.getElementById('select-mazen').onclick = () => setIdentity('MAZEN', handleReplyClick, handleEditClick);
    document.getElementById('select-asmaa').onclick = () => setIdentity('ASMAA', handleReplyClick, handleEditClick);

    // Long Press for reactions
    let longPressTimer;
    elements.messagesContainer.addEventListener('touchstart', (e) => {
        const msg = e.target.closest('.message');
        const bubble = e.target.closest('.message-bubble');
        if (!msg || !bubble) return;

        longPressTimer = setTimeout(() => {
            if (window.navigator && window.navigator.vibrate) {
                window.navigator.vibrate(40);
            }
            msg.classList.add('long-press-active');
            const messageId = parseFloat(bubble.dataset.messageId);
            showEmojiReactionBar(messageId, bubble);
            elements.messageInput.focus();
            setTimeout(() => msg.classList.remove('long-press-active'), 200);
        }, 500);
    }, { passive: true });

    elements.messagesContainer.addEventListener('touchend', (e) => {
        clearTimeout(longPressTimer);
        const msg = e.target.closest('.message');
        if (msg) msg.classList.remove('long-press-active');
    });

    elements.messagesContainer.addEventListener('touchmove', (e) => {
        clearTimeout(longPressTimer);
        const msg = e.target.closest('.message');
        if (msg) msg.classList.remove('long-press-active');
    });

    elements.sendBtn.onmousedown = (e) => { e.preventDefault(); };

    elements.sendBtn.onclick = async (e) => {
        await sendMessage(elements, handleReplyClick, handleEditClick, updateCountersCallback);
        const currentUser = getCurrentSender();
        if (currentUser) {
            updateUserActivity(currentUser);
            updatePresenceStatus(elements);
        }
    };

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        (window.innerWidth <= 800 && window.matchMedia("(pointer: coarse)").matches);

    elements.messageInput.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            if (!isMobile) {
                if (!e.shiftKey) {
                    e.preventDefault();
                    await sendMessage(elements, handleReplyClick, handleEditClick, updateCountersCallback);
                    const currentUser = getCurrentSender();
                    if (currentUser) {
                        updateUserActivity(currentUser);
                        updatePresenceStatus(elements);
                    }
                }
            }
        }
    });

    elements.messageInput.oninput = () => {
        elements.messageInput.style.height = 'auto';
        elements.messageInput.style.height = elements.messageInput.scrollHeight + 'px';
        updateQuickMessageVisibility();
    };

    elements.finalNoteSend.onclick = () => sendFinalNote(elements, handleReplyClick, handleEditClick);
    elements.finalNoteCancel.onclick = () => elements.finalNoteModal.classList.remove('show');
    elements.finalNoteBtn.onclick = () => elements.finalNoteModal.classList.add('show');

    document.getElementById('modal-close').onclick = () => elements.warningModal.classList.remove('show');

    elements.replyPreviewClose.onmousedown = (e) => { e.preventDefault(); };
    elements.replyPreviewClose.onclick = (e) => {
        e.preventDefault();
        cancelReply(elements);
        elements.messageInput.focus();
    };

    elements.messagesContainer.addEventListener('mousedown', (e) => {
        const target = e.target;
        if (target.closest('.message-bubble') ||
            target.closest('.message-action-btn') ||
            target.closest('.reaction-trigger-btn') ||
            target.closest('.message-options-btn')) {
            if (document.activeElement === elements.messageInput || elements.messageInput.value.length > 0) {
                e.preventDefault();
            }
        }
    });

    elements.searchInput.oninput = () => handleSearch(elements);
    elements.searchClearBtn.onclick = () => {
        clearSearch(elements);
        closeSearchView();
    };
    elements.searchNextBtn.onclick = () => navigateSearchNext(elements);
    elements.searchPrevBtn.onclick = () => navigateSearchPrev(elements);

    elements.searchTriggerBtn.onclick = () => openSearchView();
    elements.searchBackBtn.onclick = () => closeSearchView();

    elements.otherUserNameBtn.onclick = () => {
        elements.presenceModal.classList.add('show');
        updatePresenceStatus(elements);
    };

    setupQuickMessageListeners(updateCountersCallback, handleReplyClick, handleEditClick);
    setupReactionListeners(handleReplyClick, handleEditClick);

    elements.attachBtn.onclick = () => { elements.fileInput.click(); };
    elements.fileInput.onchange = (e) => { handleFileSelection(e.target.files); };

    elements.voiceBtn.onclick = () => {
        if (elements.voiceBtn.classList.contains('recording')) {
            stopVoiceRecording(false);
        } else {
            startVoiceRecording();
        }
    };

    elements.voiceCancel.onclick = () => { stopVoiceRecording(false); };
    elements.voiceSend.onclick = () => { stopVoiceRecording(true); };

    elements.mediaPreviewCancel.onclick = () => {
        elements.mediaPreviewModal.classList.remove('show');
        pendingMediaFiles = [];
    };
    elements.mediaPreviewSend.onclick = () => { sendMediaFromPreview(); };

    elements.messageInfoClose.onmousedown = (e) => { e.preventDefault(); };
    elements.messageInfoClose.onclick = (e) => {
        e.preventDefault();
        elements.messageInfoModal.classList.remove('show');
        elements.messageInput.focus();
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

async function setIdentity(id, handleReplyClick, handleEditClick) {
    setCurrentSender(id);
    localStorage.setItem(IDENTITY_KEY, id);
    elements.identityModal.classList.remove('show');

    await markUserOnline(id);

    const firstUnreadIndex = getFirstUnreadIndex(id);
    renderAllMessages(elements, handleReplyClick, handleEditClick, firstUnreadIndex);

    if (firstUnreadIndex !== -1) {
        await markMessagesAsRead(id);
    }

    checkUIState(elements);
    updateQuickMessageVisibility();

    startPresenceUpdates(elements);
    setupPresenceTracking(handleReplyClick, handleEditClick);
    requestNotificationPermission();

    // Setup realtime subscriptions after identity is set
    setupRealtimeSubscriptions(
        (msg, eventType) => handleRealtimeMessage(msg, eventType, handleReplyClick, handleEditClick),
        () => updatePresenceStatus(elements),
        () => {
            // Re-render messages to update reaction badges
            elements.messagesContainer.innerHTML = '';
            state.messages.forEach(m => renderSingleMessage(m, elements, false, handleReplyClick, handleEditClick));
        }
    );
}

// Handle realtime message events from Supabase
function handleRealtimeMessage(msg, eventType, handleReplyClick, handleEditClick) {
    const currentUser = getCurrentSender();

    if (eventType === 'INSERT') {
        // Render new message if it's from the OTHER user (ours was already rendered optimistically)
        if (msg.sender !== currentUser) {
            renderSingleMessage(msg, elements, true, handleReplyClick, handleEditClick);
            scrollToBottom(elements);

            // Notify
            if (msg.type === 'media') {
                notifyNewMedia(msg.sender, msg.mediaType);
            } else if (msg.text) {
                notifyNewMessage(msg.sender, msg.text);
            }

            // Mark as read if we're online
            if (!document.hidden && currentUser) {
                markMessagesAsRead(currentUser);
            }
        }
    } else if (eventType === 'UPDATE') {
        // Re-render the updated message (e.g., edited, read status changed)
        const bubble = document.querySelector(`.message-bubble[data-message-id="${msg.id}"]`);
        if (bubble) {
            const msgEl = bubble.closest('.message');
            if (msgEl) {
                const newEl = document.createElement('div');
                const tempContainer = document.createElement('div');
                elements.messagesContainer.innerHTML = '';
                state.messages.forEach(m => renderSingleMessage(m, elements, false, handleReplyClick, handleEditClick));
            }
        }
    } else if (eventType === 'DELETE') {
        // Remove deleted message from DOM
        const bubble = document.querySelector(`.message-bubble[data-message-id="${msg.id}"]`);
        if (bubble) {
            const msgEl = bubble.closest('.message');
            if (msgEl) msgEl.remove();
        }
    }

    updateCounters(elements);
    checkUIState(elements);
}

// Presence Tracking Setup
async function setupPresenceTracking(handleReplyClick, handleEditClick) {
    const currentUser = getCurrentSender();
    if (!currentUser) return;

    const updateActivity = async () => {
        await updateUserActivity(currentUser);
        updatePresenceStatus(elements);
    };

    document.addEventListener('click', updateActivity);
    document.addEventListener('keydown', updateActivity);
    document.addEventListener('touchstart', updateActivity);

    document.addEventListener('visibilitychange', async () => {
        if (document.hidden) {
            await markUserOffline(currentUser);
        } else {
            await markUserOnline(currentUser);
            updatePresenceStatus(elements);
        }
    });

    window.addEventListener('beforeunload', async () => {
        await markUserOffline(currentUser);
    });

    setInterval(async () => {
        if (!document.hidden && currentUser) {
            await updateUserActivity(currentUser);
        }
    }, 60000);
}

// Connection Monitoring
window.addEventListener('online', () => {
    if (typeof state !== 'undefined' && state.messages) {
        state.messages.forEach(msg => {
            if (msg.sender === currentSender && msg.status === 'sent') {
                if (typeof updateMessageStatus === 'function') {
                    updateMessageStatus(msg.id, 'delivered');
                    setTimeout(() => {
                        updateMessageStatus(msg.id, 'read');
                    }, 1500 + Math.random() * 2000);
                }
            }
        });
    }
});
