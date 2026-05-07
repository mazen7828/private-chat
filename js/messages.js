// Message Handling Module

let replyingTo = null;
let editingMessage = null;
let lastSendTime = 0;
const SEND_DEBOUNCE_MS = 500; // Prevent double-sends within 500ms

function sendMessage(elements, onReplyClick, onEditClick, updateCountersCallback) {
    const text = elements.messageInput.value.trim();
    if (!text || !currentSender) return;

    // Prevent double-sends
    const now = Date.now();
    if (now - lastSendTime < SEND_DEBOUNCE_MS) {
        return;
    }
    lastSendTime = now;

    if (editingMessage) {
        handleEditSave(text, elements, onReplyClick, onEditClick);
        return;
    }

    // Check if CURRENT user has reached their personal limit
    // The other user's limit is checked independently - they can still send
    if (DAILY_LIMIT_SYSTEM_ENABLED && state.limits[currentSender].count >= DAILY_LIMIT) {
        checkUIState(elements);
        return;
    }

    const msg = {
        id: Date.now(),
        sender: currentSender,
        text: text,
        timestamp: Date.now(),
        type: 'normal',
        replyTo: replyingTo ? replyingTo.id : null,
        edited: false,
        isPreset: false,
        readBy: {
            MAZEN: currentSender === 'MAZEN',
            ASMAA: currentSender === 'ASMAA'
        }
    };

    // Add message to shared message array (viewable by both users)
    state.messages.push(msg);
    // Increment only the CURRENT sender's personal count
    state.limits[currentSender].count++;
    
    firebaseSendMessage(msg);
    renderSingleMessage(msg, elements, true, onReplyClick, onEditClick);
    updateCountersCallback();
    checkUIState(elements); // Re-check if current user just hit their limit
    
    // Note: No notification sent here because the sender is the current user
    // Notifications are only for receiving messages from the OTHER user
    // In a real Firebase implementation, the OTHER user's device would receive
    // a notification via Firebase Cloud Messaging
    
    elements.messageInput.value = '';
    elements.messageInput.style.height = 'auto';
    cancelReply(elements);
    scrollToBottom(elements);
}

function sendPresetMessage(presetText, elements, onReplyClick, onEditClick, updateCountersCallback) {
    if (!presetText || !currentSender) return;

    const msg = {
        id: Date.now(),
        sender: currentSender,
        text: presetText,
        timestamp: Date.now(),
        type: 'normal',
        replyTo: replyingTo ? replyingTo.id : null,
        edited: false,
        isPreset: true,
        readBy: {
            MAZEN: currentSender === 'MAZEN',
            ASMAA: currentSender === 'ASMAA'
        }
    };

    // Add message but DON'T increment counter (preset messages are free)
    state.messages.push(msg);
    
    firebaseSendMessage(msg);
    renderSingleMessage(msg, elements, true, onReplyClick, onEditClick);
    updateCountersCallback();
    
    cancelReply(elements);
    scrollToBottom(elements);
}

function startReply(messageId, elements) {
    const message = state.messages.find(m => m.id === messageId);
    if (!message) return;
    
    replyingTo = message;
    
    elements.replyPreviewBar.style.display = 'block';
    elements.replyPreviewSender.textContent = message.sender;
    elements.replyPreviewMessage.textContent = message.text.substring(0, 60) + (message.text.length > 60 ? '...' : '');
    
    elements.messageInput.focus();
}

function cancelReply(elements) {
    replyingTo = null;
    elements.replyPreviewBar.style.display = 'none';
}

function startEdit(messageId, elements) {
    const message = state.messages.find(m => m.id === messageId);
    if (!message || message.sender !== currentSender) return;
    
    editingMessage = message;
    elements.messageInput.value = message.text;
    elements.messageInput.focus();
    elements.messageInput.style.height = 'auto';
    elements.messageInput.style.height = elements.messageInput.scrollHeight + 'px';
    
    elements.sendBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 13l4 4L19 7"/></svg>';
}

function handleEditSave(newText, elements, onReplyClick, onEditClick) {
    if (!editingMessage || !newText.trim()) return;
    
    editingMessage.text = newText.trim();
    editingMessage.edited = true;
    editingMessage.editedAt = Date.now();
    
    firebaseEditMessage(editingMessage.id, newText.trim());
    
    // Re-render all messages to update the edited one
    elements.messagesContainer.innerHTML = '';
    state.messages.forEach(m => renderSingleMessage(m, elements, false, onReplyClick, onEditClick));
    
    editingMessage = null;
    elements.messageInput.value = '';
    elements.messageInput.style.height = 'auto';
    elements.sendBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>';
}

function sendFinalNote(elements, onReplyClick, onEditClick) {
    const rawText = elements.finalNoteInput.value;
    if (!rawText || !currentSender) return;

    const lines = rawText.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

    if (lines.length === 0) return;

    const formattedText = lines
        .map((line, index) => `${index + 1}. ${line}`)
        .join('\n');

    const msg = {
        id: Date.now(),
        sender: currentSender,
        text: formattedText,
        timestamp: Date.now(),
        type: 'final-note',
        readBy: {
            MAZEN: currentSender === 'MAZEN',
            ASMAA: currentSender === 'ASMAA'
        }
    };

    state.messages.push(msg);
    state.limits[currentSender].finalNoteSent = true;
    
    firebaseSendMessage(msg);
    renderSingleMessage(msg, elements, true, onReplyClick, onEditClick);
    
    elements.finalNoteModal.classList.remove('show');
    elements.finalNoteInput.value = '';
    
    checkUIState(elements);
    scrollToBottom(elements);
}