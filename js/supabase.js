// =============================================
// Supabase Integration — Private Chat v2
// Realtime Database + Storage (للصور والميديا)
// =============================================

const SUPABASE_URL = 'https://czysueerdrjvubsovxpw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_7rTdRxmr5S6naDFfaLnfvQ_3Zihtpes';

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =============================================
// Load all data once on init
// =============================================
window.firebaseLoadData = async function () {
    try {
        const [msgRes, limRes, reactRes, emojiRes] = await Promise.all([
            _supabase.from('messages').select('*').order('timestamp', { ascending: true }),
            _supabase.from('limits').select('*'),
            _supabase.from('reactions').select('*').limit(1),
            _supabase.from('emoji_usage').select('*').limit(1)
        ]);

        if (msgRes.data && msgRes.data.length > 0) {
            state.messages = msgRes.data.map(msg => {
                if (!msg.readBy) msg.readBy = { MAZEN: true, ASMAA: true };
                return msg;
            });
        }

        if (limRes.data && limRes.data.length > 0) {
            limRes.data.forEach(row => {
                if (row.user_id === 'MAZEN') state.limits.MAZEN = { count: row.count, date: row.date, finalNoteSent: row.finalNoteSent };
                if (row.user_id === 'ASMAA') state.limits.ASMAA = { count: row.count, date: row.date, finalNoteSent: row.finalNoteSent };
            });
        }

        if (reactRes.data && reactRes.data.length > 0 && reactRes.data[0].data) {
            Object.assign(reactions, reactRes.data[0].data);
        }

        if (emojiRes.data && emojiRes.data.length > 0 && emojiRes.data[0].data) {
            Object.assign(emojiUsage, emojiRes.data[0].data);
        }

    } catch (e) {
        console.error("Supabase load error:", e);
    }
};

// =============================================
// Save limits
// =============================================
window.firebaseSaveData = async function () {
    for (const user of ['MAZEN', 'ASMAA']) {
        const lim = state.limits[user];
        await _supabase.from('limits').upsert({
            user_id: user,
            count: lim.count,
            date: lim.date,
            finalNoteSent: lim.finalNoteSent
        }, { onConflict: 'user_id' });
    }
};

// =============================================
// Save reactions
// =============================================
window.firebaseSaveReactions = async function () {
    const { data } = await _supabase.from('reactions').select('id').limit(1);
    if (data && data.length > 0) {
        await _supabase.from('reactions').update({ data: reactions }).eq('id', data[0].id);
    } else {
        await _supabase.from('reactions').insert({ data: reactions });
    }
};

// =============================================
// Save emoji usage
// =============================================
window.firebaseSaveEmojiUsage = async function () {
    const { data } = await _supabase.from('emoji_usage').select('id').limit(1);
    if (data && data.length > 0) {
        await _supabase.from('emoji_usage').update({ data: emojiUsage }).eq('id', data[0].id);
    } else {
        await _supabase.from('emoji_usage').insert({ data: emojiUsage });
    }
};

// =============================================
// Send text message
// =============================================
window.firebaseSendMessage = async function (msg) {
    const { error } = await _supabase.from('messages').upsert(msg, { onConflict: 'id' });
    if (error) console.error("Send msg error:", error);

    // Save limits too
    await window.firebaseSaveData();
};

// =============================================
// Upload media to Supabase Storage then send
// =============================================
window.firebaseUploadAndSendMedia = async function (mediaType, dataUrl, fileName, fileSize, caption, onProgress) {
    try {
        // Convert base64 dataUrl to blob
        const response = await fetch(dataUrl);
        const blob = await response.blob();

        // Build storage path
        const ext = fileName.split('.').pop() || 'bin';
        const storageFileName = `${Date.now()}_${Math.random().toString(36).substr(2, 6)}.${ext}`;
        const folder = mediaType === 'voice' ? 'voice' : mediaType === 'video' ? 'videos' : 'images';
        const storagePath = `${folder}/${storageFileName}`;

        if (onProgress) onProgress(10);

        const { error: uploadError } = await _supabase.storage
            .from('media')
            .upload(storagePath, blob, { contentType: blob.type, upsert: false });

        if (uploadError) throw uploadError;
        if (onProgress) onProgress(80);

        const { data: urlData } = _supabase.storage.from('media').getPublicUrl(storagePath);
        const downloadURL = urlData.publicUrl;

        if (onProgress) onProgress(100);

        const msg = {
            id: Date.now() + Math.random(),
            sender: currentSender,
            text: caption || '',
            timestamp: Date.now(),
            type: 'media',
            mediaType: mediaType,
            mediaUrl: downloadURL,
            fileName: fileName,
            fileSize: fileSize,
            replyTo: null,
            edited: false,
            readBy: {
                MAZEN: currentSender === 'MAZEN',
                ASMAA: currentSender === 'ASMAA'
            }
        };

        const { error: msgError } = await _supabase.from('messages').insert(msg);
        if (msgError) throw msgError;

        return msg;

    } catch (e) {
        console.error("Upload & send error:", e);
        throw e;
    }
};

// =============================================
// Upload gallery (multiple images)
// =============================================
window.firebaseUploadGallery = async function (imageDataArray, caption, onProgress) {
    try {
        const uploadedImages = [];
        let completed = 0;

        for (const imgData of imageDataArray) {
            const response = await fetch(imgData.dataUrl);
            const blob = await response.blob();
            const ext = imgData.name.split('.').pop() || 'jpg';
            const storageFileName = `${Date.now()}_${Math.random().toString(36).substr(2, 6)}.${ext}`;
            const storagePath = `images/${storageFileName}`;

            const { error: uploadError } = await _supabase.storage
                .from('media')
                .upload(storagePath, blob, { contentType: blob.type });

            if (uploadError) throw uploadError;

            const { data: urlData } = _supabase.storage.from('media').getPublicUrl(storagePath);

            uploadedImages.push({
                dataUrl: urlData.publicUrl,
                name: imgData.name,
                size: imgData.size
            });

            completed++;
            if (onProgress) onProgress(Math.round((completed / imageDataArray.length) * 100));
        }

        const msg = {
            id: Date.now() + Math.random(),
            sender: currentSender,
            text: caption || '',
            timestamp: Date.now(),
            type: 'media',
            mediaType: 'gallery',
            mediaUrl: uploadedImages,
            fileName: `${uploadedImages.length} صور`,
            fileSize: 0,
            replyTo: null,
            edited: false,
            readBy: {
                MAZEN: currentSender === 'MAZEN',
                ASMAA: currentSender === 'ASMAA'
            }
        };

        const { error } = await _supabase.from('messages').insert(msg);
        if (error) throw error;

        return msg;

    } catch (e) {
        console.error("Gallery upload error:", e);
        throw e;
    }
};

// =============================================
// Edit message
// =============================================
window.firebaseEditMessage = async function (msgId, newText) {
    const { error } = await _supabase
        .from('messages')
        .update({ text: newText, edited: true })
        .eq('id', msgId);
    if (error) console.error("Edit msg error:", error);
};

// =============================================
// Mark messages as read
// =============================================
window.firebaseMarkMessagesAsRead = async function (user) {
    const unread = state.messages.filter(
        msg => msg.sender !== user && msg.readBy && !msg.readBy[user]
    );
    for (const msg of unread) {
        const updatedReadBy = { ...msg.readBy, [user]: true };
        await _supabase.from('messages').update({ readBy: updatedReadBy }).eq('id', msg.id);
    }
};

// =============================================
// Real-time listeners
// =============================================
window.firebaseListenMessages = function (onReplyClick, onEditClick) {
    _supabase
        .channel('messages-channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
            // Reload all messages on any change
            _supabase.from('messages').select('*').order('timestamp', { ascending: true })
                .then(({ data }) => {
                    if (!data) return;
                    state.messages = data.map(msg => {
                        if (!msg.readBy) msg.readBy = { MAZEN: true, ASMAA: true };
                        return msg;
                    });

                    const currentUser = getCurrentSender();
                    const firstUnreadIndex = currentUser ? getFirstUnreadIndex(currentUser) : -1;
                    renderAllMessages(elements, onReplyClick, onEditClick, firstUnreadIndex);
                    updateCounters(elements);
                    checkUIState(elements);

                    if (currentUser && firstUnreadIndex !== -1) {
                        markMessagesAsRead(currentUser);
                        firebaseMarkMessagesAsRead(currentUser);
                    }
                });
        })
        .subscribe();
};

window.firebaseListenLimits = function () {
    _supabase
        .channel('limits-channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'limits' }, ({ new: row }) => {
            if (!row || !row.user_id) return;
            state.limits[row.user_id] = {
                count: row.count,
                date: row.date,
                finalNoteSent: row.finalNoteSent
            };
            updateCounters(elements);
            checkUIState(elements);
        })
        .subscribe();
};

window.firebaseListenReactions = function (onReplyClick, onEditClick) {
    _supabase
        .channel('reactions-channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, ({ new: row }) => {
            if (row && row.data) {
                Object.assign(reactions, row.data);
                renderAllMessages(elements, onReplyClick, onEditClick);
            }
        })
        .subscribe();
};

// =============================================
// Presence System
// =============================================
window.firebaseSetupPresence = function (user) {
    if (!user) return;

    // Mark online immediately
    _supabase.from('presence').upsert({
        user_id: user,
        isOnline: true,
        lastSeen: Date.now()
    }, { onConflict: 'user_id' });

    // Mark offline on page unload
    window.addEventListener('beforeunload', () => {
        navigator.sendBeacon(
            `${SUPABASE_URL}/rest/v1/presence?user_id=eq.${user}`,
            JSON.stringify({ isOnline: false, lastSeen: Date.now() })
        );
    });
};

window.firebaseMarkOnline = async function (user) {
    if (!user) return;
    await _supabase.from('presence').upsert({
        user_id: user,
        isOnline: true,
        lastSeen: Date.now()
    }, { onConflict: 'user_id' });
};

window.firebaseMarkOffline = async function (user) {
    if (!user) return;
    await _supabase.from('presence').upsert({
        user_id: user,
        isOnline: false,
        lastSeen: Date.now()
    }, { onConflict: 'user_id' });
};

window.firebaseListenPresence = function (otherUser) {
    if (!otherUser) return;
    _supabase
        .channel('presence-channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'presence', filter: `user_id=eq.${otherUser}` }, ({ new: row }) => {
            if (!row) return;
            presence[otherUser] = { isOnline: row.isOnline, lastSeen: row.lastSeen };
            updatePresenceStatus(elements);
        })
        .subscribe();

    // Load initial presence
    _supabase.from('presence').select('*').eq('user_id', otherUser).single()
        .then(({ data }) => {
            if (data) {
                presence[otherUser] = { isOnline: data.isOnline, lastSeen: data.lastSeen };
                updatePresenceStatus(elements);
            }
        });
};

console.log("✅ Supabase v2 (with Storage) loaded");
