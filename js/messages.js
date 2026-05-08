// ============================================================
// Message Handling Module - Supabase Edition
// ============================================================

let replyingTo = null;
let editingMessage = null;
let lastSendTime = 0;
const SEND_DEBOUNCE_MS = 500;

async function sendMessage(elements, onReplyClick, onEditClick, updateCountersCallback) {
    const text = elements.messageInput.value.trim();
    if (!text || !currentSender) return;

    const now = Date.now();
    if (now - lastSendTime < SEND_DEBOUNCE_MS) return;
    lastSendTime = now;

    if (editingMessage) {
        await handleEditSave(text, elements, onReplyClick, onEditClick);
        return;
    }

    if (DAILY_LIMIT_SYSTEM_ENABLED && state.limits[currentSender].count >= DAILY_LIMIT) {
        checkUIState(elements);
        return;
    }

    const msgId = String(Date.now());
    const msg = {
        id: msgId,
        sender: currentSender,
        text: text,
        timestamp: Date.now(),
        type: 'normal',
        replyTo: replyingTo ? String(replyingTo.id) : null,
        edited: false,
        isPreset: false,
        readBy: {
            MAZEN: currentSender === 'MAZEN',
            ASMAA: currentSender === 'ASMAA'
        },
        status: 'pending'
    };

    // Optimistic add to local state
    state.messages.push(msg);
    state.limits[currentSender].count++;

    renderSingleMessage(msg, elements, true, onReplyClick, onEditClick);
    updateCountersCallback();
    checkUIState(elements);

    elements.messageInput.value = '';
    elements.messageInput.style.height = 'auto';
    cancelReply(elements);
    scrollToBottom(elements);
    elements.messageInput.focus();

    // Save to Supabase (triggers realtime for other user)
    await saveMessage(msg);
    await saveData();

    // Update status to sent
    updateMessageStatus(msg.id, 'sent');
}

async function sendPresetMessage(presetText, elements, onReplyClick, onEditClick, updateCountersCallback) {
    if (!presetText || !currentSender) return;

    const msgId = String(Date.now());
    const msg = {
        id: msgId,
        sender: currentSender,
        text: presetText,
        timestamp: Date.now(),
        type: 'normal',
        replyTo: replyingTo ? String(replyingTo.id) : null,
        edited: false,
        isPreset: true,
        readBy: {
            MAZEN: currentSender === 'MAZEN',
            ASMAA: currentSender === 'ASMAA'
        }
    };

    state.messages.push(msg);

    renderSingleMessage(msg, elements, true, onReplyClick, onEditClick);
    updateCountersCallback();
    cancelReply(elements);
    scrollToBottom(elements);

    await saveMessage(msg);
}

function startReply(messageId, elements) {
    const message = state.messages.find(m => String(m.id) === String(messageId));
    if (!message) return;

    replyingTo = message;

    elements.replyPreviewBar.style.display = 'block';
    elements.replyPreviewSender.textContent = message.sender;

    let previewText = message.text || '';
    if (message.type === 'media') {
        previewText = `📎 ${message.mediaType}${previewText ? ': ' + previewText : ''}`;
    }

    elements.replyPreviewMessage.textContent = previewText.substring(0, 60) + (previewText.length > 60 ? '...' : '');

    elements.messageInput.focus();
    setTimeout(() => elements.messageInput.focus(), 0);
    requestAnimationFrame(() => elements.messageInput.focus());
}

function cancelReply(elements) {
    replyingTo = null;
    elements.replyPreviewBar.style.display = 'none';
    elements.messageInput.focus();
    setTimeout(() => elements.messageInput.focus(), 10);
}

function startEdit(messageId, elements) {
    const message = state.messages.find(m => String(m.id) === String(messageId));
    if (!message || message.sender !== currentSender) return;

    editingMessage = message;
    elements.messageInput.value = message.text;

    elements.messageInput.style.height = 'auto';
    elements.messageInput.style.height = elements.messageInput.scrollHeight + 'px';

    elements.messageInput.focus();
    const length = elements.messageInput.value.length;
    elements.messageInput.setSelectionRange(length, length);
    setTimeout(() => elements.messageInput.focus(), 0);

    elements.sendBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 13l4 4L19 7"/></svg>';
}

function updateMessageStatus(messageId, status) {
    const message = state.messages.find(m => String(m.id) === String(messageId));
    if (message) {
        message.status = status;
        const now = Date.now();
        if (status === 'sent' && !message.sentAt) message.sentAt = now;
        if (status === 'delivered' && !message.deliveredAt) message.deliveredAt = now;
        if (status === 'read' && !message.readAt) message.readAt = now;
        updateMessageStatusUI(messageId, status);
    }
}

function showMessageInfo(messageId) {
    const message = state.messages.find(m => String(m.id) === String(messageId));
    if (!message) return;

    elements.messageInfoList.innerHTML = '';

    const otherUser = getOtherUser(message.sender);
    const isRead = message.readBy && message.readBy[otherUser];

    const steps = [
        { label: 'تم الإرسال', time: message.sentAt || message.timestamp, icon: 'sent' },
        { label: 'تم التسليم', time: message.deliveredAt || (message.sentAt ? message.sentAt + 500 : null), icon: 'delivered' }
    ];

    if (isRead || message.readAt) {
        steps.push({ label: 'تمت القراءة', time: message.readAt || Date.now(), icon: 'read' });
    }

    steps.forEach(step => {
        if (!step.time) return;
        const item = document.createElement('div');
        item.className = 'info-item';
        item.innerHTML = `
            <div class="info-label">
                ${getStatusIcon(step.icon)}
                <span>${step.label}</span>
            </div>
            <div class="info-time">${formatTime(step.time)}</div>
        `;
        elements.messageInfoList.appendChild(item);
    });

    elements.messageInfoModal.classList.add('show');
    setTimeout(() => elements.messageInput.focus(), 10);
}

async function handleEditSave(newText, elements, onReplyClick, onEditClick) {
    if (!editingMessage || !newText.trim()) return;

    editingMessage.text = newText.trim();
    editingMessage.edited = true;
    editingMessage.editedAt = Date.now();

    // Save to Supabase
    await saveMessage(editingMessage);

    elements.messagesContainer.innerHTML = '';
    state.messages.forEach(m => renderSingleMessage(m, elements, false, onReplyClick, onEditClick));

    editingMessage = null;
    elements.messageInput.value = '';
    elements.messageInput.style.height = 'auto';
    elements.sendBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>';

    elements.messageInput.focus();
}

async function sendFinalNote(elements, onReplyClick, onEditClick) {
    const rawText = elements.finalNoteInput.value;
    if (!rawText || !currentSender) return;

    const lines = rawText.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

    if (lines.length === 0) return;

    const formattedText = lines
        .map((line, index) => `${index + 1}. ${line}`)
        .join('\n');

    const msgId = String(Date.now());
    const msg = {
        id: msgId,
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

    await saveMessage(msg);
    await saveData();

    renderSingleMessage(msg, elements, true, onReplyClick, onEditClick);

    elements.finalNoteModal.classList.remove('show');
    elements.finalNoteInput.value = '';

    checkUIState(elements);
    scrollToBottom(elements);
}
