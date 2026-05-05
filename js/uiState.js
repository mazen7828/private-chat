// UI State Management Module - Handles UI state transitions and countdown

let countdownInterval = null;

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