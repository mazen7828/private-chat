// Reaction Handlers Module - UI interaction logic for reactions

let currentReactionMessageId = null;
let cachedHandlers = {
    handleReply: null,
    handleEdit: null
};

function getCurrentReactionMessageId() {
    return currentReactionMessageId;
}

function setupReactionListeners(handleReply, handleEdit) {
    cachedHandlers = { handleReply, handleEdit };
    
    // Reaction trigger button (delegated)
    elements.messagesContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('reaction-trigger-btn')) {
            const messageId = parseInt(e.target.dataset.messageId);
            showReactionPopup(messageId, e.target);
        }
    });
    
    // Reaction add button
    elements.reactionAddBtn.onclick = () => {
        const emoji = prompt('أدخل إيموجي واحد:');
        if (emoji && emoji.trim()) {
            addReaction(currentReactionMessageId, emoji.trim());
            elements.reactionPopup.style.display = 'none';
        }
    };
}

function showReactionPopup(messageId, triggerElement) {
    currentReactionMessageId = messageId;
    
    // Get top emojis
    const topEmojis = getTopEmojis();
    
    // Render emoji buttons
    elements.reactionEmojis.innerHTML = '';
    topEmojis.forEach(emoji => {
        const btn = document.createElement('button');
        btn.className = 'reaction-emoji-btn';
        btn.textContent = emoji;
        btn.onclick = () => {
            addReaction(messageId, emoji);
            elements.reactionPopup.style.display = 'none';
        };
        elements.reactionEmojis.appendChild(btn);
    });
    
    // Position popup near the button
    const rect = triggerElement.getBoundingClientRect();
    elements.reactionPopup.style.display = 'block';
    elements.reactionPopup.style.top = (rect.top - 60) + 'px';
    elements.reactionPopup.style.left = (rect.left - 80) + 'px';
}

function addReaction(messageId, emoji) {
    if (!reactions[messageId]) {
        reactions[messageId] = [];
    }
    
    reactions[messageId].push(emoji);
    
    // Update emoji usage count
    emojiUsage[emoji] = (emojiUsage[emoji] || 0) + 1;
    
    saveReactions();
    saveEmojiUsage();
    // 🔥 Sync to Firebase
    firebaseSaveReactions();
    firebaseSaveEmojiUsage();
    
    // Re-render messages to show updated reactions
    renderAllMessages(elements, cachedHandlers.handleReply, cachedHandlers.handleEdit);
}

function handleReactionPopupOutsideClick(e) {
    // Close reaction popup if clicking outside
    if (elements.reactionPopup.style.display === 'block') {
        const isClickInsideReactionPopup = elements.reactionPopup.contains(e.target);
        const isReactionTrigger = e.target.classList.contains('reaction-trigger-btn');
        
        if (!isClickInsideReactionPopup && !isReactionTrigger) {
            elements.reactionPopup.style.display = 'none';
            currentReactionMessageId = null;
        }
    }
}