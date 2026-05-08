// Swipe to Reply Module

let touchStartX = 0;
let touchStartY = 0;
let currentMessageEl = null;
let currentBubbleEl = null;
let currentIndicatorEl = null;
let swipeDistance = 0;
let isSwiping = false;
const SWIPE_THRESHOLD = 70;
const MAX_SWIPE = 90;

function initSwipeToReply() {
    const container = document.getElementById('messages-container');
    if (!container) return;

    // Use non-passive for touchstart to optionally prevent focus loss 
    // but we handle focus maintenance carefully in events.js and here.
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
}

function handleTouchStart(e) {
    const touch = e.touches[0];
    const target = e.target.closest('.message');
    
    if (!target || target.classList.contains('final-note')) return;

    // Maintenance: if input is focused, we want to keep it that way
    // without blocking scroll. Most mobile browsers handle this fine
    // as long as we don't blur() manually or hit a focusable element.

    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    currentMessageEl = target;
    currentBubbleEl = target.querySelector('.message-bubble');
    currentIndicatorEl = target.querySelector('.swipe-indicator');
    isSwiping = false;
    swipeDistance = 0;
}

function handleTouchMove(e) {
    if (!currentMessageEl || !currentBubbleEl) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = Math.abs(touch.clientY - touchStartY);

    // If initial movement is more vertical than horizontal, don't start swiping
    // Threshold of 10px to decide if it's a swipe or a scroll
    if (!isSwiping) {
        if (deltaY > 10 && deltaY > Math.abs(deltaX)) {
            currentMessageEl = null;
            return;
        }
        if (Math.abs(deltaX) > 10) {
            isSwiping = true;
        } else {
            return;
        }
    }

    // Only allow swiping to the right (reveal indicator on the left)
    // WhatsApp reply gesture is typically left-to-right on the row
    if (deltaX < 0) return;

    // We are definitely swiping horizontally now
    e.preventDefault(); // Prevent scrolling

    // Resistance feel: reduce the actual movement as distance increases
    // and clamp it.
    const resistance = 0.8;
    swipeDistance = Math.min(deltaX * resistance, MAX_SWIPE);
    
    currentMessageEl.classList.add('swiping');
    // Using translateX for 60fps performance
    currentBubbleEl.style.transform = `translateX(${swipeDistance}px)`;
    
    // Update indicator visuals dynamically
    if (currentIndicatorEl) {
        const absDistance = Math.abs(swipeDistance);
        const progress = Math.min(absDistance / SWIPE_THRESHOLD, 1);
        const opacity = progress;
        const scale = 0.5 + (progress * 0.7); // 0.5 to 1.2 scale
        
        currentIndicatorEl.style.opacity = opacity;
        currentIndicatorEl.style.transform = `translateY(-50%) scale(${scale})`;
        
        if (Math.abs(swipeDistance) >= SWIPE_THRESHOLD) {
            if (!currentIndicatorEl.classList.contains('active')) {
                currentIndicatorEl.classList.add('active');
                // Haptic feedback simulation
                if (window.navigator && window.navigator.vibrate) {
                    window.navigator.vibrate(15);
                }
            }
        } else {
            currentIndicatorEl.classList.remove('active');
        }
    }
}

function handleTouchEnd(e) {
    if (!currentMessageEl || !currentBubbleEl) return;

    const messageId = parseFloat(currentBubbleEl.dataset.messageId);

    if (Math.abs(swipeDistance) >= SWIPE_THRESHOLD) {
        // Prevent default to help keep focus if possible
        if (e.cancelable) e.preventDefault();
        
        // Trigger reply
        if (typeof handleReplyClick === 'function') {
            handleReplyClick(messageId);
        }
        
        // Immediate focus back to input to ensure keyboard stays open
        if (elements && elements.messageInput) {
            elements.messageInput.focus();
        }
    }

    // Reset visuals - CSS transition will handle the "bounce back"
    currentMessageEl.classList.remove('swiping');
    currentBubbleEl.style.transform = '';
    
    if (currentIndicatorEl) {
        currentIndicatorEl.style.opacity = '';
        currentIndicatorEl.style.transform = '';
        currentIndicatorEl.classList.remove('active');
    }

    // Clear state
    currentMessageEl = null;
    currentBubbleEl = null;
    currentIndicatorEl = null;
    swipeDistance = 0;
    isSwiping = false;
}

// Auto-initialize when the script loads
document.addEventListener('DOMContentLoaded', () => {
    // We might need to wait for elements to be ready, but init handles delegation
    initSwipeToReply();
});