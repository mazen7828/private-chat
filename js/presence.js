// ============================================================
// Presence Tracking Module - Supabase Edition
// ============================================================

let presenceUpdateInterval = null;

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

function updatePresenceStatus(elements) {
    if (!currentSender) return;

    const otherUser = getOtherUser(currentSender);
    if (!otherUser) return;

    const otherPresence = presence[otherUser];

    if (elements.otherUserNameDisplay) {
        elements.otherUserNameDisplay.textContent = otherUser;
    }

    if (elements.presenceIndicatorDot) {
        if (otherPresence && otherPresence.isOnline) {
            elements.presenceIndicatorDot.classList.add('online');
        } else {
            elements.presenceIndicatorDot.classList.remove('online');
        }
    }

    if (elements.presenceModalName) {
        elements.presenceModalName.textContent = otherUser;
    }

    if (elements.presenceModalIndicator) {
        if (otherPresence && otherPresence.isOnline) {
            elements.presenceModalIndicator.classList.add('online');
        } else {
            elements.presenceModalIndicator.classList.remove('online');
        }
    }

    if (elements.presenceModalStatus) {
        if (otherPresence && otherPresence.isOnline) {
            elements.presenceModalStatus.textContent = 'متصل الآن';
        } else if (otherPresence) {
            elements.presenceModalStatus.textContent = `آخر ظهور: ${formatLastSeen(otherPresence.lastSeen)}`;
        }
    }
}

function startPresenceUpdates(elements) {
    updatePresenceStatus(elements);

    if (presenceUpdateInterval) clearInterval(presenceUpdateInterval);
    presenceUpdateInterval = setInterval(() => {
        updatePresenceStatus(elements);
    }, 30000);
}

function stopPresenceUpdates() {
    if (presenceUpdateInterval) {
        clearInterval(presenceUpdateInterval);
        presenceUpdateInterval = null;
    }
}
