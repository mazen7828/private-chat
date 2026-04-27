// UI Rendering and Display Module

let countdownInterval = null;
let presenceUpdateInterval = null;

function renderAllMessages(elements, onReplyClick, onEditClick, firstUnreadIndex = -1) {
    // Always render all messages regardless of current user's blocked state
    // This ensures blocked users can still see incoming messages from the other person
    // Firebase-ready: Real-time listeners should call renderSingleMessage() for new messages
    elements.messagesContainer.innerHTML = '';
    state.messages.forEach((m, index) => {
        // Insert unread divider before first unread message
        if (firstUnreadIndex !== -1 && index === firstUnreadIndex) {
            const divider = document.createElement('div');
            divider.className = 'unread-divider';
            divider.innerHTML = '<span class="unread-divider-text">رسائل غير مقروءة</span>';
            elements.messagesContainer.appendChild(divider);
        }
        renderSingleMessage(m, elements, false, onReplyClick, onEditClick);
    });
    scrollToBottom(elements);
}

function renderSingleMessage(msg, elements, animate, onReplyClick, onEditClick) {
    const div = document.createElement('div');
    div.className = `message ${msg.sender.toLowerCase()} ${msg.type === 'final-note' ? 'final-note' : ''}`;
    if (!animate) div.style.animation = 'none';

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';

    if (msg.type === 'final-note') {
        const tag = document.createElement('span');
        tag.className = 'final-note-tag';
        tag.textContent = '✨ ملاحظات أخيرة';
        bubble.appendChild(tag);
    }

    const sender = document.createElement('div');
    sender.className = 'message-sender';
    sender.textContent = msg.sender;

    // Reply section
    if (msg.replyTo) {
        const originalMsg = state.messages.find(m => m.id === msg.replyTo);
        if (originalMsg) {
            const replySection = document.createElement('div');
            replySection.className = 'message-reply-section';
            
            const replySender = document.createElement('div');
            replySender.className = 'message-reply-sender';
            replySender.textContent = originalMsg.sender;
            
            const replyText = document.createElement('div');
            replyText.className = 'message-reply-text';
            replyText.textContent = originalMsg.text.substring(0, 50) + (originalMsg.text.length > 50 ? '...' : '');
            
            replySection.appendChild(replySender);
            replySection.appendChild(replyText);
            bubble.appendChild(replySection);
        }
    }

    const text = document.createElement('div');
    text.className = 'message-text';
    text.textContent = msg.text;

    const time = document.createElement('div');
    time.className = 'message-time';
    time.textContent = formatTime(msg.timestamp);
    
    if (msg.edited) {
        const editedLabel = document.createElement('div');
        editedLabel.className = 'message-edited-label';
        editedLabel.textContent = 'رسالة معدلة';
        time.appendChild(editedLabel);
    }

    bubble.appendChild(sender);
    bubble.appendChild(text);
    bubble.appendChild(time);
    
    // Reactions display
    if (reactions[msg.id]) {
        const reactionBadges = document.createElement('div');
        reactionBadges.className = 'reaction-badges';
        
        const reactionCounts = {};
        reactions[msg.id].forEach(emoji => {
            reactionCounts[emoji] = (reactionCounts[emoji] || 0) + 1;
        });
        
        Object.entries(reactionCounts).forEach(([emoji, count]) => {
            const badge = document.createElement('span');
            badge.className = 'reaction-badge';
            badge.textContent = `${emoji} ${count}`;
            reactionBadges.appendChild(badge);
        });
        
        bubble.appendChild(reactionBadges);
    }
    
    // Action buttons
    if (msg.type !== 'final-note') {
        const actions = document.createElement('div');
        actions.className = 'message-actions';
        
        const replyBtn = document.createElement('button');
        replyBtn.className = 'message-action-btn';
        replyBtn.innerHTML = '↩️ Reply';
        replyBtn.onclick = () => onReplyClick(msg.id);
        actions.appendChild(replyBtn);
        
        // Only show edit button if message is NOT a preset and belongs to current user
        if (msg.sender === currentSender && !msg.isPreset) {
            const editBtn = document.createElement('button');
            editBtn.className = 'message-action-btn';
            editBtn.innerHTML = '✏️ Edit';
            editBtn.onclick = () => onEditClick(msg.id);
            actions.appendChild(editBtn);
        }
        
        bubble.appendChild(actions);
    }
    
    // Reaction button
    const reactionBtn = document.createElement('button');
    reactionBtn.className = 'reaction-trigger-btn';
    reactionBtn.innerHTML = '😊';
    reactionBtn.dataset.messageId = msg.id;
    bubble.appendChild(reactionBtn);
    
    div.appendChild(bubble);
    elements.messagesContainer.appendChild(div);
}

function formatTime(ts) {
    const date = new Date(ts);
    return date.toLocaleTimeString([], { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
    });
}

function scrollToBottom(elements) {
    setTimeout(() => {
        elements.chatArea.scrollTop = elements.chatArea.scrollHeight;
    }, 50);
}

function checkUIState(elements) {
    if (!currentSender) return;
    
    const userLimit = state.limits[currentSender];
    
    if (DAILY_LIMIT_SYSTEM_ENABLED && userLimit.count >= DAILY_LIMIT) {
        // Blocked State - Only blocks THIS user's sending ability
        // Chat remains fully functional for viewing and receiving messages
        // Preset quick messages are still allowed even when blocked
        // Firebase-ready: Real-time message listeners continue to work even when blocked
        elements.inputWrapper.style.display = 'none';
        elements.blockedPanel.style.display = 'flex';
        elements.blockedMessage.textContent = BLOCK_MESSAGES[currentSender];
        
        elements.countdownContainer.style.display = IS_TIMER_ENABLED ? 'block' : 'none';

        if (!userLimit.finalNoteSent) {
            elements.finalNoteBtn.style.display = 'block';
            if (!sessionStorage.getItem('notified_limit_' + getTodayDate())) {
                elements.finalNoteModal.classList.add('show');
                sessionStorage.setItem('notified_limit_' + getTodayDate(), 'true');
            }
        } else {
            elements.finalNoteBtn.style.display = 'none';
        }
        
        startCountdown(elements);
    } else {
        // Normal State
        elements.inputWrapper.style.display = 'flex';
        elements.blockedPanel.style.display = 'none';
        stopCountdown();
    }
    
    // Sync quick message visibility whenever UI state changes
    if (typeof updateQuickMessageVisibility === 'function') {
        updateQuickMessageVisibility();
    }
}

function startCountdown(elements) {
    if (!IS_TIMER_ENABLED) return;

    if (countdownInterval) clearInterval(countdownInterval);
    
    const tick = () => {
        const now = new Date();
        const midnight = new Date();
        midnight.setHours(24, 0, 0, 0);
        
        const diff = midnight - now;
        
        if (diff <= 0) {
            // Timer reached midnight - will be handled by checkAndResetDailyLimits
            return;
        }
        
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        
        elements.countdownTimer.textContent = 
            `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };
    
    tick();
    countdownInterval = setInterval(tick, 1000);
}

function stopCountdown() {
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
}

// Get the top 3 most used emojis for reaction shortcuts
function getTopEmojis() {
    if (Object.keys(emojiUsage).length === 0) {
        return ['❤️', '😂', '😍'];
    }
    
    return Object.entries(emojiUsage)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([emoji]) => emoji);
}

// Format last seen time in a human-readable Arabic-friendly format
function formatLastSeen(timestamp) {
    const now = new Date();
    const lastSeen = new Date(timestamp);
    
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const lastSeenDate = new Date(lastSeen.getFullYear(), lastSeen.getMonth(), lastSeen.getDate());
    
    const timeStr = lastSeen.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
    });
    
    if (lastSeenDate.getTime() === today.getTime()) {
        return `اليوم ${timeStr}`;
    } else if (lastSeenDate.getTime() === yesterday.getTime()) {
        return `أمس ${timeStr}`;
    } else {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const day = lastSeen.getDate();
        const month = monthNames[lastSeen.getMonth()];
        return `${day} ${month} - ${timeStr}`;
    }
}

// Update presence status in header button and modal
function updatePresenceStatus(elements) {
    if (!currentSender) return;
    
    const otherUser = getOtherUser(currentSender);
    if (!otherUser) return;
    
    const otherPresence = presence[otherUser];
    
    // Update header button
    if (elements.otherUserNameDisplay) {
        elements.otherUserNameDisplay.textContent = otherUser;
    }
    
    if (elements.presenceIndicatorDot) {
        if (otherPresence.isOnline) {
            elements.presenceIndicatorDot.classList.add('online');
        } else {
            elements.presenceIndicatorDot.classList.remove('online');
        }
    }
    
    // Update modal content
    if (elements.presenceModalName) {
        elements.presenceModalName.textContent = otherUser;
    }
    
    if (elements.presenceModalIndicator) {
        if (otherPresence.isOnline) {
            elements.presenceModalIndicator.classList.add('online');
        } else {
            elements.presenceModalIndicator.classList.remove('online');
        }
    }
    
    if (elements.presenceModalStatus) {
        // Firebase-ready: In production, check real-time Firebase presence instead
        if (otherPresence.isOnline) {
            elements.presenceModalStatus.textContent = 'متصل الآن';
        } else {
            elements.presenceModalStatus.textContent = `آخر ظهور: ${formatLastSeen(otherPresence.lastSeen)}`;
        }
    }
}

// Start periodic presence status updates
function startPresenceUpdates(elements) {
    // Update immediately
    updatePresenceStatus(elements);
    
    // Update every 30 seconds
    if (presenceUpdateInterval) clearInterval(presenceUpdateInterval);
    presenceUpdateInterval = setInterval(() => {
        updatePresenceStatus(elements);
    }, 30000);
}

// Stop presence updates
function stopPresenceUpdates() {
    if (presenceUpdateInterval) {
        clearInterval(presenceUpdateInterval);
        presenceUpdateInterval = null;
    }
}