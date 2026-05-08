// ============================================================
// Bell Notification System - Supabase Realtime Edition
// ============================================================

let audioContext = null;
let audioInitialized = false;
let ringAudio = null;
let isRinging = false;
let isSendingRing = false;
let bellRealtimeChannel = null;

// Initialize audio context after user interaction
function initializeAudio() {
    if (audioInitialized) return;

    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();

        const silentBuffer = audioContext.createBuffer(1, 1, 22050);
        const silentSource = audioContext.createBufferSource();
        silentSource.buffer = silentBuffer;
        silentSource.connect(audioContext.destination);
        silentSource.start();

        ringAudio = new Audio();
        ringAudio.loop = true;
        ringAudio.volume = 0.8;

        // Bell ring sound using Web Audio API generated tone
        ringAudio.src = generateBellSound();

        audioInitialized = true;
        console.log('Audio initialized successfully');
    } catch (error) {
        console.error('Error initializing audio:', error);
    }
}

// Generate a bell-like sound using oscillator
function generateBellSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const duration = 1.5;
        const sampleRate = ctx.sampleRate;
        const buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);

        // Bell tone: mix of harmonics
        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            const envelope = Math.exp(-t * 3);
            data[i] = envelope * (
                0.5 * Math.sin(2 * Math.PI * 440 * t) +
                0.3 * Math.sin(2 * Math.PI * 880 * t) +
                0.2 * Math.sin(2 * Math.PI * 1320 * t)
            );
        }

        // Convert to WAV blob
        const wav = bufferToWave(buffer, data.length);
        return URL.createObjectURL(wav);
    } catch (e) {
        // Fallback data URL
        return 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSyF0fPMeSwGLIHS8syALwgcZ7nt6KNQEQpQquL0sF8bCDSJ0/PPfC4GK3/P8N+KPQkXY7Xq7aJVFAo+m97yuGQcBjKJ1PLLei0GKX/P8+GIOgkWYrbr7aNUEwo8muD1v2wgBSyG0vTKeCwGKIDQ8+KKOgkXYrXq7aNWEwo8muD1v2wgBjCD0fTLeCwGKIDQ8+KKOwoYYrXq7KJXE=';
    }
}

function bufferToWave(abuffer, len) {
    const numOfChan = abuffer.numberOfChannels;
    const length = len * numOfChan * 2 + 44;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);
    const channels = [];
    let i, sample, offset = 0, pos = 0;

    function setUint16(data) { view.setUint16(pos, data, true); pos += 2; }
    function setUint32(data) { view.setUint32(pos, data, true); pos += 4; }

    setUint32(0x46464952); setUint32(length - 8); setUint32(0x45564157);
    setUint32(0x20746d66); setUint32(16); setUint16(1); setUint16(numOfChan);
    setUint32(abuffer.sampleRate); setUint32(abuffer.sampleRate * 2 * numOfChan);
    setUint16(numOfChan * 2); setUint16(16);
    setUint32(0x61746164); setUint32(length - pos - 4);

    for (i = 0; i < abuffer.numberOfChannels; i++) channels.push(abuffer.getChannelData(i));
    while (pos < length) {
        for (i = 0; i < numOfChan; i++) {
            sample = Math.max(-1, Math.min(1, channels[i][offset]));
            sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
            view.setInt16(pos, sample, true);
            pos += 2;
        }
        offset++;
    }
    return new Blob([buffer], { type: 'audio/wav' });
}

function showAutoplayModal() {
    if (elements.autoplayModal) {
        elements.autoplayModal.classList.add('show');
    }
}

function handleJoinChat() {
    initializeAudio();
    if (elements.autoplayModal) {
        elements.autoplayModal.classList.remove('show');
    }
}

// ============================================================
// SUPABASE REALTIME BELL - Database-based approach
// ============================================================

async function broadcastRinging(action) {
    const sender = getCurrentSender();
    if (!sender) return;

    console.log('Broadcasting ring via Supabase:', action, sender);

    const { error } = await supabase.from('bell_ring').upsert({
        id: 1,
        ringer: sender,
        active: action === 'START',
        rung_at: Date.now()
    });

    if (error) console.error('Bell broadcast error:', error);
}

// Start ringing (sender side)
function startRinging() {
    if (isSendingRing) return;
    isSendingRing = true;

    if (elements.bellTriggerBtn) {
        elements.bellTriggerBtn.classList.add('ringing');
    }

    broadcastRinging('START');
}

// Stop ringing (sender side)
function stopRinging() {
    if (!isSendingRing) return;
    isSendingRing = false;

    if (elements.bellTriggerBtn) {
        elements.bellTriggerBtn.classList.remove('ringing');
    }

    broadcastRinging('STOP');
}

// Handle incoming ring (receiver side)
function handleIncomingRing(senderName) {
    if (isRinging) return;
    isRinging = true;

    if (elements.incomingRingOverlay) {
        elements.incomingRingOverlay.style.display = 'flex';
    }

    if (elements.incomingRingSender) {
        elements.incomingRingSender.textContent = `${senderName} يرن عليك 🔔`;
    }

    if (ringAudio && audioInitialized) {
        ringAudio.currentTime = 0;
        ringAudio.play().catch(err => {
            console.error('Error playing ring sound:', err);
        });
    }

    // Vibrate if supported
    if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate([300, 200, 300, 200, 300]);
    }
}

// Stop incoming ring (receiver side)
function stopIncomingRing() {
    if (!isRinging) return;
    isRinging = false;

    if (elements.incomingRingOverlay) {
        elements.incomingRingOverlay.style.display = 'none';
    }

    if (ringAudio) {
        ringAudio.pause();
        ringAudio.currentTime = 0;
    }
}

// ============================================================
// SUPABASE REALTIME LISTENER FOR BELL
// ============================================================

function setupRingListener() {
    bellRealtimeChannel = supabase
        .channel('bell-realtime')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'bell_ring'
        }, (payload) => {
            const row = payload.new;
            if (!row) return;

            const currentUser = getCurrentSender();
            if (!currentUser) return;

            // Only react if the ringer is the OTHER user
            if (row.ringer && row.ringer !== currentUser) {
                if (row.active === true) {
                    handleIncomingRing(row.ringer);
                } else if (row.active === false) {
                    stopIncomingRing();
                }
            }

            // If we were the sender and it got stopped (other user stopped it)
            if (row.ringer === currentUser && row.active === false && isSendingRing) {
                isSendingRing = false;
                if (elements.bellTriggerBtn) {
                    elements.bellTriggerBtn.classList.remove('ringing');
                }
            }
        })
        .subscribe((status) => {
            console.log('Bell channel status:', status);
        });
}

// ============================================================
// INITIALIZE BELL SYSTEM
// ============================================================

function initializeBellSystem() {
    const hasSeenAutoplayModal = sessionStorage.getItem('autoplayModalSeen');
    if (!hasSeenAutoplayModal) {
        showAutoplayModal();
        sessionStorage.setItem('autoplayModalSeen', 'true');
    } else {
        initializeAudio();
    }

    setupRingListener();

    if (elements.joinChatBtn) {
        elements.joinChatBtn.onclick = handleJoinChat;
    }

    if (elements.bellTriggerBtn) {
        elements.bellTriggerBtn.onmousedown = (e) => { e.preventDefault(); };

        elements.bellTriggerBtn.onclick = (e) => {
            e.preventDefault();

            if (isSendingRing) {
                stopRinging();
            } else {
                startRinging();
            }

            if (elements.messageInput) {
                elements.messageInput.focus();
            }
        };
    }

    if (elements.stopRingBtn) {
        elements.stopRingBtn.onmousedown = (e) => { e.preventDefault(); };

        elements.stopRingBtn.onclick = (e) => {
            e.preventDefault();
            stopIncomingRing();
            broadcastRinging('STOP');

            if (elements.messageInput) {
                elements.messageInput.focus();
            }
        };
    }
}
