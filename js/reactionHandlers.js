// Reaction Handlers Module - UI interaction logic for premium reactions

let currentReactionMessageId = null;
const REACTION_EMOJIS = ['😂', '😍', '😁', '😘', '❤️', '☺️', '✨', '🤣', '😎', '😅', '🤔', '🫡'];

let cachedHandlers = {
    handleReply: null,
    handleEdit: null
};

function setupReactionListeners(handleReply, handleEdit) {
    cachedHandlers = { handleReply, handleEdit };
    
    // Setup delegated click for reaction bar trigger (the button inside message)
    elements.messagesContainer.addEventListener('click', (e) => {
        const trigger = e.target.closest('.reaction-trigger-btn');
        if (trigger) {
            const messageId = parseFloat(trigger.dataset.messageId);
            const bubble = trigger.closest('.message-bubble');
            showEmojiReactionBar(messageId, bubble);
        }
    });

    // Close reaction bar on click outside
    document.addEventListener('touchstart', (e) => {
        if (elements.emojiReactionBar.style.display === 'block') {
            if (!elements.emojiReactionBar.contains(e.target)) {
                hideEmojiReactionBar();
            }
        }
    }, { passive: true });
}

function showEmojiReactionBar(messageId, bubbleEl) {
    currentReactionMessageId = messageId;
    
    // Populate emojis
    elements.emojiReactionList.innerHTML = '';
    REACTION_EMOJIS.forEach(emoji => {
        const span = document.createElement('span');
        span.className = 'emoji-item';
        span.textContent = emoji;
        
        // Critical: Prevent focus loss
        span.onmousedown = (e) => e.preventDefault();
        
        span.onclick = (e) => {
            e.stopPropagation();
            addReaction(messageId, emoji);
            hideEmojiReactionBar();
            // Re-focus immediately to ensure keyboard persistence
            elements.messageInput.focus();
        };
        
        elements.emojiReactionList.appendChild(span);
    });

    // Show it hidden first to get dimensions
    elements.emojiReactionBar.style.visibility = 'hidden';
    elements.emojiReactionBar.style.display = 'flex';
    
    const barWidth = elements.emojiReactionBar.offsetWidth;
    const barHeight = elements.emojiReactionBar.offsetHeight;
    const rect = bubbleEl.getBoundingClientRect();
    const screenWidth = window.innerWidth;
    const headerHeight = elements.headerNormalView.closest('.chat-header').offsetHeight;
    const margin = 8;
    
    // Determine alignment (mazen is left-aligned, asmaa is right-aligned)
    const isRightAligned = bubbleEl.closest('.message').classList.contains('asmaa');
    
    // Calculate Horizontal Position
    let left;
    if (isRightAligned) {
        // Outgoing: Align right edges
        left = rect.right - barWidth;
    } else {
        // Incoming: Align left edges
        left = rect.left;
    }
    
    // Clamp to screen bounds
    left = Math.max(margin, Math.min(left, screenWidth - barWidth - margin));
    
    // Calculate Vertical Position
    let top = rect.top - barHeight - margin;
    
    // Flip if it would hit the header
    if (top < headerHeight + margin) {
        top = rect.bottom + margin;
        elements.emojiReactionBar.style.transformOrigin = isRightAligned ? 'right top' : 'left top';
    } else {
        elements.emojiReactionBar.style.transformOrigin = isRightAligned ? 'right bottom' : 'left bottom';
    }
    
    elements.emojiReactionBar.style.top = `${top}px`;
    elements.emojiReactionBar.style.left = `${left}px`;
    elements.emojiReactionBar.style.visibility = 'visible';
    
    // Aggressively maintain focus
    elements.messageInput.focus();
}

function hideEmojiReactionBar() {
    elements.emojiReactionBar.style.display = 'none';
    currentReactionMessageId = null;
}

function addReaction(messageId, emoji) {
    const sender = getCurrentSender();
    if (!sender) return;

    if (!reactions[messageId]) {
        reactions[messageId] = {};
    }
    
    // Toggle/Replace Logic
    if (reactions[messageId][sender] === emoji) {
        // Toggle off if same emoji
        delete reactions[messageId][sender];
        if (Object.keys(reactions[messageId]).length === 0) {
            delete reactions[messageId];
        }
    } else {
        // Add or Replace with new emoji
        reactions[messageId][sender] = emoji;
        // Update usage count
        emojiUsage[emoji] = (emojiUsage[emoji] || 0) + 1;
    }
    
    saveReactions();
    saveEmojiUsage();
    
    // Update UI immediately
    renderAllMessages(elements, cachedHandlers.handleReply, cachedHandlers.handleEdit);
}

function removeUserReaction(messageId) {
    const sender = getCurrentSender();
    if (!sender || !reactions[messageId]) return;

    if (reactions[messageId][sender]) {
        delete reactions[messageId][sender];
        if (Object.keys(reactions[messageId]).length === 0) {
            delete reactions[messageId];
        }
        saveReactions();
        renderAllMessages(elements, cachedHandlers.handleReply, cachedHandlers.handleEdit);
    }
}

function handleReactionPopupOutsideClick(e) {
    if (elements.emojiReactionBar.style.display === 'block') {
        if (!elements.emojiReactionBar.contains(e.target)) {
            hideEmojiReactionBar();
        }
    }
}