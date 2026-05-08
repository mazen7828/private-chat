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

function getStatusIcon(status) {
    const icons = {
        pending: `<svg class="status-icon pending" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
        sent: `<svg class="status-icon sent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
        delivered: `<svg class="status-icon delivered" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 12l5 5L22 7M2 12l5 5L12 12"/></svg>`,
        read: `<svg class="status-icon read" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 12l5 5L22 7M2 12l5 5L12 12"/></svg>`
    };
    return icons[status] || '';
}

function updateMessageStatusUI(messageId, status) {
    const bubble = document.querySelector(`.message-bubble[data-message-id="${messageId}"]`);
    if (!bubble) return;
    
    const container = bubble.querySelector('.status-container');
    if (container) {
        container.innerHTML = getStatusIcon(status);
    }
}

function renderSingleMessage(msg, elements, animate, onReplyClick, onEditClick) {
    const div = document.createElement('div');
    div.className = `message ${msg.sender.toLowerCase()} ${msg.type === 'final-note' ? 'final-note' : ''}`;
    if (!animate) div.style.animation = 'none';

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.dataset.messageId = msg.id;

    const indicator = document.createElement('div');
    indicator.className = 'swipe-indicator';
    indicator.innerHTML = '↩️';
    div.appendChild(indicator);

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

    const footer = document.createElement('div');
    footer.className = 'message-footer';

    const time = document.createElement('div');
    time.className = 'message-time';
    
    const timeText = document.createElement('span');
    timeText.textContent = formatTime(msg.timestamp);
    time.appendChild(timeText);

    // Only show status for messages sent by the current user
    if (msg.sender === currentSender) {
        const statusContainer = document.createElement('span');
        statusContainer.className = 'status-container';
        
        // Determine status based on readBy or explicitly set status
        let status = msg.status || 'sent';
        const otherUser = getOtherUser(currentSender);
        if (msg.readBy && msg.readBy[otherUser]) {
            status = 'read';
        } else if (status === 'sent' && !msg.isPending) {
            // Default to delivered for existing non-pending messages
            status = 'delivered';
        }
        
        statusContainer.innerHTML = getStatusIcon(status);
        time.appendChild(statusContainer);
    }
    
    if (msg.edited) {
        const editedLabel = document.createElement('div');
        editedLabel.className = 'message-edited-label';
        editedLabel.textContent = 'معدلة';
        time.appendChild(editedLabel);
    }

    // Reaction trigger button moved inside bubble footer
    const reactionBtn = document.createElement('button');
    reactionBtn.className = 'reaction-trigger-btn';
    reactionBtn.innerHTML = '😊';
    reactionBtn.dataset.messageId = msg.id;
    
    footer.appendChild(time);
    footer.appendChild(reactionBtn);

    bubble.appendChild(sender);
    bubble.appendChild(footer);
    
    // Reactions display
    if (reactions[msg.id]) {
        const reactionBadges = document.createElement('div');
        reactionBadges.className = 'reaction-badges';
        
        const emojiMap = reactions[msg.id];
        const uniqueEmojis = [...new Set(Object.values(emojiMap))];
        const currentUser = getCurrentSender();
        
        uniqueEmojis.forEach(emoji => {
            const count = Object.values(emojiMap).filter(e => e === emoji).length;
            const badge = document.createElement('span');
            badge.className = 'reaction-badge';
            
            // Check if current user reacted with THIS emoji
            const myEmoji = emojiMap[currentUser];
            if (myEmoji === emoji) {
                badge.classList.add('my-reaction');
                badge.dataset.reacted = "true";
            }
            
            badge.innerHTML = `<span class="emoji-icon">${emoji}</span>${count > 1 ? `<span class="reaction-count">${count}</span>` : ''}`;
            
            // Removal Logic: Tap badge to remove if it's yours
            badge.onmousedown = (e) => e.preventDefault(); // Keep keyboard open on desktop
            badge.onclick = (e) => {
                e.stopPropagation();
                if (myEmoji === emoji) {
                    badge.classList.add('removing');
                    setTimeout(() => {
                        if (typeof removeUserReaction === 'function') {
                            removeUserReaction(msg.id);
                        }
                        // Aggressive re-focus to keep keyboard open on mobile
                        elements.messageInput.focus();
                    }, 200);
                }
            };
            
            reactionBadges.appendChild(badge);
        });
        
        bubble.appendChild(reactionBadges);
    }
    
    // Action buttons (Icon only now)
    if (msg.type !== 'final-note') {
        const actions = document.createElement('div');
        actions.className = 'message-actions';
        
        const replyBtn = document.createElement('button');
        replyBtn.className = 'message-action-btn';
        replyBtn.title = "Reply";
        replyBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9L9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>`;
        
        // Keyboard Persistence: Prevent focus loss when clicking reply
        replyBtn.onmousedown = (e) => e.preventDefault();
        replyBtn.onclick = (e) => { 
            e.stopPropagation(); 
            onReplyClick(msg.id); 
            elements.messageInput.focus(); // Re-focus after action
        };
        actions.appendChild(replyBtn);
        
        // Only show edit button if message is NOT a preset and belongs to current user
        if (msg.sender === currentSender && !msg.isPreset) {
            const editBtn = document.createElement('button');
            editBtn.className = 'message-action-btn';
            editBtn.title = "Edit";
            editBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
            
            // Keyboard Persistence: Prevent focus loss when clicking edit
            editBtn.onmousedown = (e) => e.preventDefault();
            editBtn.onclick = (e) => { 
                e.stopPropagation(); 
                onEditClick(msg.id); 
                elements.messageInput.focus(); // Re-focus after action
            };
            actions.appendChild(editBtn);
        }
        
        bubble.appendChild(actions);
    }
    
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

