// =============================================
// Supabase Integration — Private Chat v2
// Realtime Database + Storage (للصور والميديا)
// بديل Firebase → Supabase
// =============================================

const SUPABASE_URL = 'https://emipkeyyaqyiddgknwkj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_qEU3Hyzew_Gr9EMApC2sOA_3ZhJLupN';

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// =============================================
// Load all data once on init
// =============================================
window.firebaseLoadData = async function () {
    try {
        const [
            { data: messages },
            { data: limits },
            { data: reactionsData },
            { data: emojiData }
        ] = await Promise.all([
            _supabase.from('messages').select('*').order('timestamp', { ascending: true }),
            _supabase.from('limits').select('*'),
            _supabase.from('reactions').select('*'),
            _supabase.from('emoji_usage').select('*')
        ]);

        if (messages && messages.length > 0) {
            state.messages = messages.map(msg => {
                if (!msg.readBy) msg.readBy = { MAZEN: true, ASMAA: true };
                return msg;
            });
        }

        if (limits && limits.length > 0) {
            limits.forEach(row => {
                if (row.user === 'MAZEN') state.limits.MAZEN = row.data;
                if (row.user === 'ASMAA') state.limits.ASMAA = row.data;
            });
        }

        if (reactionsData && reactionsData.length > 0) {
            reactionsData.forEach(row => {
                reactions[row.msg_id] = row.data;
            });
        }

        if (emojiData && emojiData.length > 0) {
            emojiData.forEach(row => {
                emojiUsage[row.emoji] = row.count;
            });
        }

    } catch (e) {
        console.error("Supabase load error:", e);
    }
};

// =============================================
// Save limits
// =============================================
window.firebaseSaveData = async function () {
    try {
        await Promise.all([
            _supabase.from('limits').upsert({ user: 'MAZEN', data: state.limits.MAZEN }, { onConflict: 'user' }),
            _supabase.from('limits').upsert({ user: 'ASMAA', data: state.limits.ASMAA }, { onConflict: 'user' })
        ]);
    } catch (e) {
        console.error("Save limits:", e);
    }
};

// =============================================
// Save reactions
// =============================================
window.firebaseSaveReactions = async function () {
    try {
        const upserts = Object.entries(reactions).map(([msg_id, data]) => ({ msg_id, data }));
        if (upserts.length > 0) {
            await _supabase.from('reactions').upsert(upserts, { onConflict: 'msg_id' });
        }
    } catch (e) {
        console.error("Save reactions:", e);
    }
};

// =============================================
// Save emoji usage
// =============================================
window.firebaseSaveEmojiUsage = async function () {
    try {
        const upserts = Object.entries(emojiUsage).map(([emoji, count]) => ({ emoji, count }));
        if (upserts.length > 0) {
            await _supabase.from('emoji_usage').upsert(upserts, { onConflict: 'emoji' });
        }
    } catch (e) {
        console.error("Save emoji:", e);
    }
};

// =============================================
// Send text message
// =============================================
window.firebaseSendMessage = async function (msg) {
    try {
        await _supabase.from('messages').insert(msg);
        await window.firebaseSaveData();
    } catch (e) {
        console.error("Send msg:", e);
    }
};

// =============================================
// Upload media to Supabase Storage then send
// =============================================
window.firebaseUploadAndSendMedia = async function (mediaType, dataUrl, fileName, fileSize, caption, onProgress) {
    try {
        const response = await fetch(dataUrl);
        const blob = await response.blob();

        const ext = fileName.split('.').pop() || 'bin';
        const storageFileName = `${Date.now()}_${Math.random().toString(36).substr(2, 6)}.${ext}`;
        const folder = mediaType === 'voice' ? 'voice' : mediaType === 'video' ? 'videos' : 'images';
        const storagePath = `media/${folder}/${storageFileName}`;

        if (onProgress) onProgress(30);

        const { error: uploadError } = await _supabase.storage
            .from('chat-media')
            .upload(storagePath, blob, { contentType: blob.type });

        if (uploadError) throw uploadError;

        if (onProgress) onProgress(80);

        const { data: urlData } = _supabase.storage
            .from('chat-media')
            .getPublicUrl(storagePath);

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

        await _supabase.from('messages').insert(msg);
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
            const storagePath = `media/images/${storageFileName}`;

            await _supabase.storage.from('chat-media').upload(storagePath, blob, { contentType: blob.type });

            const { data: urlData } = _supabase.storage.from('chat-media').getPublicUrl(storagePath);

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

        await _supabase.from('messages').insert(msg);
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
    try {
        await _supabase.from('messages').update({ text: newText, edited: true }).eq('id', msgId);
    } catch (e) {
        console.error("Edit msg:", e);
    }
};

// =============================================
// Mark messages as read
// =============================================
window.firebaseMarkMessagesAsRead = async function (user) {
    try {
        const unread = state.messages.filter(msg => msg.sender !== user && msg.readBy && !msg.readBy[user]);
        for (const msg of unread) {
            const newReadBy = { ...msg.readBy, [user]: true };
            await _supabase.from('messages').update({ readBy: newReadBy }).eq('id', msg.id);
        }
    } catch (e) {
        console.error("Mark read:", e);
    }
};

// =============================================
// Real-time listeners
// =============================================
window.firebaseListenMessages = function (onReplyClick, onEditClick) {
    _supabase.channel('messages-channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
            _supabase.from('messages').select('*').order('timestamp', { ascending: true }).then(({ data }) => {
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
    _supabase.channel('limits-channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'limits' }, ({ new: row }) => {
            if (!row) return;
            if (row.user === 'MAZEN') state.limits.MAZEN = row.data;
            if (row.user === 'ASMAA') state.limits.ASMAA = row.data;
            updateCounters(elements);
            checkUIState(elements);
        })
        .subscribe();
};

window.firebaseListenReactions = function (onReplyClick, onEditClick) {
    _supabase.channel('reactions-channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, ({ new: row }) => {
            if (!row) return;
            reactions[row.msg_id] = row.data;
            renderAllMessages(elements, onReplyClick, onEditClick);
        })
        .subscribe();
};

// =============================================
// Presence System
// =============================================
window.firebaseSetupPresence = async function (user) {
    if (!user) return;
    // Mark online when connected
    await _supabase.from('presence').upsert({ user, isOnline: true, lastSeen: Date.now() }, { onConflict: 'user' });

    // Mark offline on page hide/close
    window.addEventListener('beforeunload', () => {
        navigator.sendBeacon(
            `${SUPABASE_URL}/rest/v1/presence?user=eq.${user}`,
            JSON.stringify({ isOnline: false, lastSeen: Date.now() })
        );
    });

    document.addEventListener('visibilitychange', async () => {
        if (document.hidden) {
            await _supabase.from('presence').upsert({ user, isOnline: false, lastSeen: Date.now() }, { onConflict: 'user' });
        } else {
            await _supabase.from('presence').upsert({ user, isOnline: true, lastSeen: Date.now() }, { onConflict: 'user' });
        }
    });
};

window.firebaseMarkOnline = async function (user) {
    if (!user) return;
    await _supabase.from('presence').upsert({ user, isOnline: true, lastSeen: Date.now() }, { onConflict: 'user' });
};

window.firebaseMarkOffline = async function (user) {
    if (!user) return;
    await _supabase.from('presence').upsert({ user, isOnline: false, lastSeen: Date.now() }, { onConflict: 'user' });
};

window.firebaseListenPresence = function (otherUser) {
    if (!otherUser) return;
    _supabase.channel('presence-channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'presence', filter: `user=eq.${otherUser}` }, ({ new: row }) => {
            if (!row) return;
            presence[otherUser] = { isOnline: row.isOnline, lastSeen: row.lastSeen };
            updatePresenceStatus(elements);
        })
        .subscribe();
};

console.log("✅ Supabase v2 (with Storage) loaded");
