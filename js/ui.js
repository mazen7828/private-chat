// UI Utilities Module - Miscellaneous UI helpers

// removed: let countdownInterval = null;
// removed: let presenceUpdateInterval = null;
// removed: function renderAllMessages() - moved to js/rendering.js
// removed: function renderSingleMessage() - moved to js/rendering.js
// removed: function formatTime() - moved to js/rendering.js
// removed: function scrollToBottom() - moved to js/rendering.js
// removed: function checkUIState() - moved to js/uiState.js
// removed: function startCountdown() - moved to js/uiState.js
// removed: function stopCountdown() - moved to js/uiState.js
// removed: function getTopEmojis() - moved to js/uiState.js
// removed: function formatLastSeen() - moved to js/presence.js
// removed: function updatePresenceStatus() - moved to js/presence.js
// removed: function startPresenceUpdates() - moved to js/presence.js
// removed: function stopPresenceUpdates() - moved to js/presence.js

function viewFullGallery(images, startIndex = 0) {
    // Simple full-screen gallery viewer
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);z-index:2000;display:flex;align-items:center;justify-content:center;flex-direction:column;';
    
    let currentIndex = startIndex;
    
    const img = document.createElement('img');
    img.style.cssText = 'max-width:90%;max-height:80vh;border-radius:12px;';
    img.src = images[currentIndex].dataUrl || images[currentIndex];
    
    const counter = document.createElement('div');
    counter.style.cssText = 'color:#fff;font-size:16px;margin-top:16px;font-weight:600;';
    counter.textContent = `${currentIndex + 1} / ${images.length}`;
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = 'position:absolute;top:20px;right:20px;background:rgba(255,255,255,0.2);border:none;color:#fff;width:40px;height:40px;border-radius:50%;font-size:20px;cursor:pointer;';
    closeBtn.onclick = () => document.body.removeChild(overlay);
    
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '←';
    prevBtn.style.cssText = 'position:absolute;left:20px;top:50%;transform:translateY(-50%);background:rgba(255,255,255,0.2);border:none;color:#fff;width:50px;height:50px;border-radius:50%;font-size:24px;cursor:pointer;';
    prevBtn.onclick = () => {
        currentIndex = (currentIndex - 1 + images.length) % images.length;
        img.src = images[currentIndex].dataUrl || images[currentIndex];
        counter.textContent = `${currentIndex + 1} / ${images.length}`;
    };
    
    const nextBtn = document.createElement('button');
    nextBtn.textContent = '→';
    nextBtn.style.cssText = 'position:absolute;right:20px;top:50%;transform:translateY(-50%);background:rgba(255,255,255,0.2);border:none;color:#fff;width:50px;height:50px;border-radius:50%;font-size:24px;cursor:pointer;';
    nextBtn.onclick = () => {
        currentIndex = (currentIndex + 1) % images.length;
        img.src = images[currentIndex].dataUrl || images[currentIndex];
        counter.textContent = `${currentIndex + 1} / ${images.length}`;
    };
    
    overlay.appendChild(img);
    overlay.appendChild(counter);
    overlay.appendChild(closeBtn);
    if (images.length > 1) {
        overlay.appendChild(prevBtn);
        overlay.appendChild(nextBtn);
    }
    
    document.body.appendChild(overlay);
}