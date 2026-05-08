// ============================================================
// State Management Module - Supabase Edition
// ============================================================

const DAILY_LIMIT = 20;
const IDENTITY_KEY = 'privateChatIdentity';

const IS_TIMER_ENABLED = true;
const DAILY_LIMIT_SYSTEM_ENABLED = false;

const BLOCK_MESSAGES = {
    ASMAA: "يلا يا بنوتي قومي خلصي اللي وراكي او نامي يا ماما وبكره نبقي نكمل كلامنا",
    MAZEN: "قوم بقي ياعم بطل محن بقي قوم يلاااا"
};

// In-memory state (synced from Supabase)
let state = {
    messages: [],
    limits: {
        MAZEN: { count: 0, date: getTodayDate(), finalNoteSent: false },
        ASMAA: { count: 0, date: getTodayDate(), finalNoteSent: false }
    }
};

let reactions = {};
let emojiUsage = {};

let presence = {
    MAZEN: { isOnline: false, lastSeen: Date.now() },
    ASMAA: { isOnline: false, lastSeen: Date.now() }
};

let currentSender = null;

// Realtime subscriptions
let messagesChannel = null;
let limitsChannel = null;
let presenceChannel = null;
let reactionsChannel = null;
let bellChannel = null;

function setCurrentSender(sender) {
    currentSender = sender;
}

function getCurrentSender() {
    return currentSender;
}

function getTodayDate() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getOtherUser(currentUser) {
    if (currentUser === 'MAZEN') return 'ASMAA';
    if (currentUser === 'ASMAA') return 'MAZEN';
    return null;
}

// ============================================================
// LOAD DATA FROM SUPABASE
// ============================================================

async function loadData() {
    try {
        // Load messages
        const { data: msgs, error: msgErr } = await supabase
            .from('messages')
            .select('*')
            .order('timestamp', { ascending: true });

        if (!msgErr && msgs) {
            state.messages = msgs.map(normalizeMessage);
        }

        // Load limits
        const { data: limits, error: limErr } = await supabase
            .from('limits')
            .select('*');

        if (!limErr && limits) {
            limits.forEach(row => {
                state.limits[row.user_id] = {
                    count: row.count || 0,
                    date: row.date || getTodayDate(),
                    finalNoteSent: row.finalNoteSent || false
                };
            });
        }

        // Load reactions
        const { data: rxData, error: rxErr } = await supabase
            .from('reactions')
            .select('data')
            .eq('id', 1)
            .single();

        if (!rxErr && rxData) {
            reactions = rxData.data || {};
        }

        // Load emoji usage
        const { data: euData, error: euErr } = await supabase
            .from('emoji_usage')
            .select('data')
            .eq('id', 1)
            .single();

        if (!euErr && euData) {
            emojiUsage = euData.data || {};
        }

        // Load presence
        const { data: presData, error: presErr } = await supabase
            .from('presence')
            .select('*');

        if (!presErr && presData) {
            presData.forEach(row => {
                presence[row.user_id] = {
                    isOnline: row.isOnline || false,
                    lastSeen: row.lastSeen || Date.now()
                };
            });
        }

    } catch (err) {
        console.error('loadData error:', err);
    }
}

// Normalize DB row to local message format
function normalizeMessage(row) {
    return {
        id: row.id,
        sender: row.sender,
        text: row.text || '',
        timestamp: row.timestamp,
        type: row.type || 'normal',
        mediaType: row.mediaType,
        mediaUrl: row.mediaUrl,
        fileName: row.fileName,
        fileSize: row.fileSize,
        replyTo: row.replyTo,
        edited: row.edited || false,
        isPreset: row.isPreset || false,
        readBy: row.readBy || { MAZEN: false, ASMAA: false },
        status: 'sent'
    };
}

// ============================================================
// SAVE DATA TO SUPABASE
// ============================================================

async function saveMessage(msg) {
    const row = {
        id: String(msg.id),
        sender: msg.sender,
        text: msg.text || '',
        timestamp: msg.timestamp,
        type: msg.type || 'normal',
        mediaType: msg.mediaType || null,
        mediaUrl: msg.mediaUrl || null,
        fileName: msg.fileName || null,
        fileSize: msg.fileSize || null,
        replyTo: msg.replyTo ? String(msg.replyTo) : null,
        edited: msg.edited || false,
        isPreset: msg.isPreset || false,
        readBy: msg.readBy || { MAZEN: false, ASMAA: false }
    };

    const { error } = await supabase.from('messages').upsert(row, { onConflict: 'id' });
    if (error) console.error('saveMessage error:', error);
}

async function saveData() {
    // Save limits for both users
    for (const user of ['MAZEN', 'ASMAA']) {
        const lim = state.limits[user];
        const { error } = await supabase.from('limits').upsert({
            user_id: user,
            count: lim.count,
            date: lim.date,
            finalNoteSent: lim.finalNoteSent
        }, { onConflict: 'user_id' });
        if (error) console.error('saveData limits error:', error);
    }
}

async function saveReactions() {
    const { error } = await supabase.from('reactions').upsert({ id: 1, data: reactions });
    if (error) console.error('saveReactions error:', error);
}

async function saveEmojiUsage() {
    const { error } = await supabase.from('emoji_usage').upsert({ id: 1, data: emojiUsage });
    if (error) console.error('saveEmojiUsage error:', error);
}

async function savePresence() {
    if (!currentSender) return;
    const { error } = await supabase.from('presence').upsert({
        user_id: currentSender,
        isOnline: presence[currentSender].isOnline,
        lastSeen: presence[currentSender].lastSeen
    }, { onConflict: 'user_id' });
    if (error) console.error('savePresence error:', error);
}

// ============================================================
// PRESENCE MANAGEMENT
// ============================================================

async function markUserOnline(user) {
    if (!user) return;
    presence[user] = { isOnline: true, lastSeen: Date.now() };
    await savePresence();
}

async function markUserOffline(user) {
    if (!user) return;
    presence[user] = { isOnline: false, lastSeen: Date.now() };
    await savePresence();
}

async function updateUserActivity(user) {
    if (!user) return;
    presence[user] = { isOnline: true, lastSeen: Date.now() };
    await savePresence();
}

// ============================================================
// READ STATUS
// ============================================================

function getUnreadCount(user) {
    if (!user) return 0;
    return state.messages.filter(msg =>
        msg.sender !== user && msg.readBy && !msg.readBy[user]
    ).length;
}

async function markMessagesAsRead(user) {
    if (!user) return;
    const unread = state.messages.filter(msg =>
        msg.sender !== user && msg.readBy && !msg.readBy[user]
    );

    for (const msg of unread) {
        const newReadBy = { ...msg.readBy, [user]: true };
        msg.readBy = newReadBy;

        await supabase.from('messages').update({ readBy: newReadBy }).eq('id', String(msg.id));
    }
}

function getFirstUnreadIndex(user) {
    if (!user) return -1;
    return state.messages.findIndex(msg =>
        msg.sender !== user && msg.readBy && !msg.readBy[user]
    );
}

// ============================================================
// DAILY LIMITS
// ============================================================

async function checkAndResetDailyLimits(onResetCallback) {
    if (!IS_TIMER_ENABLED) return;

    const today = getTodayDate();
    let resetHappened = false;

    for (const user of ['MAZEN', 'ASMAA']) {
        if (state.limits[user].date !== today) {
            state.limits[user] = { count: 0, date: today, finalNoteSent: false };
            resetHappened = true;
        }
    }

    if (resetHappened) {
        await saveData();
        if (onResetCallback) onResetCallback();
        console.log('Midnight Reset Triggered: Limits cleared.');
    }
}

function updateCounters(elements) {
    if (elements.mazenCounter) {
        elements.mazenCounter.textContent = `${state.limits.MAZEN.count}/${DAILY_LIMIT}`;
    }
    if (elements.asmaaCounter) {
        elements.asmaaCounter.textContent = `${state.limits.ASMAA.count}/${DAILY_LIMIT}`;
    }
}

// ============================================================
// REALTIME SUBSCRIPTIONS
// ============================================================

function setupRealtimeSubscriptions(onNewMessage, onPresenceUpdate, onReactionsUpdate) {
    // Messages channel
    messagesChannel = supabase
        .channel('messages-realtime')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'messages'
        }, (payload) => {
            handleMessageChange(payload, onNewMessage);
        })
        .subscribe();

    // Presence channel
    presenceChannel = supabase
        .channel('presence-realtime')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'presence'
        }, (payload) => {
            if (payload.new) {
                const row = payload.new;
                presence[row.user_id] = {
                    isOnline: row.isOnline,
                    lastSeen: row.lastSeen
                };
                if (onPresenceUpdate) onPresenceUpdate();
            }
        })
        .subscribe();

    // Reactions channel
    reactionsChannel = supabase
        .channel('reactions-realtime')
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'reactions'
        }, (payload) => {
            if (payload.new && payload.new.data) {
                reactions = payload.new.data;
                if (onReactionsUpdate) onReactionsUpdate();
            }
        })
        .subscribe();

    // Limits channel (for sync between tabs/devices)
    limitsChannel = supabase
        .channel('limits-realtime')
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'limits'
        }, (payload) => {
            if (payload.new) {
                const row = payload.new;
                state.limits[row.user_id] = {
                    count: row.count,
                    date: row.date,
                    finalNoteSent: row.finalNoteSent
                };
            }
        })
        .subscribe();
}

function handleMessageChange(payload, onNewMessage) {
    const { eventType, new: newRow, old: oldRow } = payload;

    if (eventType === 'INSERT') {
        const msg = normalizeMessage(newRow);
        // Avoid duplicates (we already added optimistically for our own messages)
        const exists = state.messages.find(m => String(m.id) === String(msg.id));
        if (!exists) {
            state.messages.push(msg);
            if (onNewMessage) onNewMessage(msg, 'INSERT');
        } else {
            // Update the existing message with server data (readBy, etc.)
            const idx = state.messages.findIndex(m => String(m.id) === String(msg.id));
            if (idx !== -1) state.messages[idx] = { ...state.messages[idx], ...msg };
        }
    } else if (eventType === 'UPDATE') {
        const msg = normalizeMessage(newRow);
        const idx = state.messages.findIndex(m => String(m.id) === String(msg.id));
        if (idx !== -1) {
            state.messages[idx] = msg;
            if (onNewMessage) onNewMessage(msg, 'UPDATE');
        }
    } else if (eventType === 'DELETE') {
        const id = oldRow.id;
        state.messages = state.messages.filter(m => String(m.id) !== String(id));
        if (onNewMessage) onNewMessage({ id }, 'DELETE');
    }
}

// ============================================================
// MEDIA UPLOAD TO SUPABASE STORAGE
// ============================================================

async function uploadMediaToStorage(file, mediaType) {
    const ext = file.name ? file.name.split('.').pop() : (mediaType === 'voice' ? 'webm' : 'bin');
    const path = `${Date.now()}_${Math.random().toString(36).substr(2, 8)}.${ext}`;

    const { data, error } = await supabase.storage
        .from(MEDIA_BUCKET)
        .upload(path, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (error) {
        console.error('Upload error:', error);
        return null;
    }

    const { data: urlData } = supabase.storage
        .from(MEDIA_BUCKET)
        .getPublicUrl(path);

    return urlData.publicUrl;
}

async function uploadBlobToStorage(blob, fileName) {
    const path = `${Date.now()}_${Math.random().toString(36).substr(2, 8)}_${fileName}`;

    const { data, error } = await supabase.storage
        .from(MEDIA_BUCKET)
        .upload(path, blob, {
            cacheControl: '3600',
            upsert: false
        });

    if (error) {
        console.error('Upload blob error:', error);
        return null;
    }

    const { data: urlData } = supabase.storage
        .from(MEDIA_BUCKET)
        .getPublicUrl(path);

    return urlData.publicUrl;
}

// Upload base64 data URL to Supabase storage
async function uploadDataUrlToStorage(dataUrl, fileName) {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return await uploadBlobToStorage(blob, fileName);
}
