// Message Rendering Module - Handles all message display logic

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

    // Message content (text or media)
    if (msg.type === 'media') {
        const mediaContainer = document.createElement('div');
        mediaContainer.className = 'message-media';
        
        if (msg.mediaType === 'gallery') {
            const galleryDiv = document.createElement('div');
            galleryDiv.className = 'message-gallery';
            
            const images = Array.isArray(msg.mediaUrl) ? msg.mediaUrl : [];
            images.slice(0, 4).forEach((imgData, index) => {
                const imgItem = document.createElement('div');
                imgItem.className = 'message-gallery-item';
                
                const img = document.createElement('img');
                img.src = imgData.dataUrl || imgData;
                imgItem.appendChild(img);
                
                if (index === 3 && images.length > 4) {
                    const count = document.createElement('div');
                    count.className = 'message-gallery-count';
                    count.textContent = `+${images.length - 4}`;
                    imgItem.appendChild(count);
                }
                
                // Click to view full gallery
                imgItem.onclick = () => viewFullGallery(images, index);
                
                galleryDiv.appendChild(imgItem);
            });
            
            mediaContainer.appendChild(galleryDiv);
        } else if (msg.mediaType === 'image') {
            const img = document.createElement('img');
            img.src = msg.mediaUrl;
            img.alt = msg.fileName;
            mediaContainer.appendChild(img);
        } else if (msg.mediaType === 'video') {
            const video = document.createElement('video');
            video.src = msg.mediaUrl;
            video.controls = true;
            video.style.maxWidth = '100%';
            mediaContainer.appendChild(video);
        } else if (msg.mediaType === 'audio' || msg.mediaType === 'voice') {
            const audio = document.createElement('audio');
            audio.src = msg.mediaUrl;
            audio.controls = true;
            mediaContainer.appendChild(audio);
        } else {
            // File download
            const fileDiv = document.createElement('div');
            fileDiv.className = 'message-file';
            
            const fileIcon = document.createElement('div');
            fileIcon.className = 'message-file-icon';
            fileIcon.textContent = '📎';
            
            const fileInfo = document.createElement('div');
            fileInfo.className = 'message-file-info';
            
            const fileName = document.createElement('div');
            fileName.className = 'message-file-name';
            fileName.textContent = msg.fileName;
            
            const fileSize = document.createElement('div');
            fileSize.className = 'message-file-size';
            fileSize.textContent = formatFileSize(msg.fileSize);
            
            fileInfo.appendChild(fileName);
            fileInfo.appendChild(fileSize);
            
            const downloadBtn = document.createElement('button');
            downloadBtn.className = 'message-file-download';
            downloadBtn.innerHTML = '⬇️';
            downloadBtn.onclick = () => {
                const link = document.createElement('a');
                link.href = msg.mediaUrl;
                link.download = msg.fileName;
                link.click();
            };
            
            fileDiv.appendChild(fileIcon);
            fileDiv.appendChild(fileInfo);
            fileDiv.appendChild(downloadBtn);
            mediaContainer.appendChild(fileDiv);
        }
        
        bubble.appendChild(mediaContainer);
    }
    
    if (msg.text) {
        const text = document.createElement('div');
        text.className = 'message-text';
        text.textContent = msg.text;
        bubble.appendChild(text);
    }

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

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}