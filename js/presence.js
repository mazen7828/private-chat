// Presence Tracking Module - Handles user online/offline status

let presenceUpdateInterval = null;

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