// =============================================
// Firebase Integration — Private Chat v2
// Realtime Database + Storage (للصور والميديا)
// Compatible with file:// (Compat SDK)
// =============================================

const firebaseConfig = {
    apiKey: "AIzaSyDV9sJRgLY3Lt81CLqxEm4YpQAJGepFQEc",
    authDomain: "private-chat-83e85.firebaseapp.com",
    databaseURL: "https://private-chat-83e85-default-rtdb.firebaseio.com",
    projectId: "private-chat-83e85",
    storageBucket: "private-chat-83e85.firebasestorage.app",
    messagingSenderId: "257346884188",
    appId: "1:257346884188:web:b5d0f5032fdf6b98ce8c99"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const storage = firebase.storage();

// =============================================
// DB References
// =============================================
const messagesRef = db.ref('messages');
const limitsRef   = db.ref('limits');
const reactionsRef = db.ref('reactions');
const emojiUsageRef = db.ref('emojiUsage');

// =============================================
// Load all data once on init
// =============================================
window.firebaseLoadData = async function () {
    try {
        const [msgSnap, limSnap, reactSnap, emojiSnap] = await Promise.all([
            messagesRef.once('value'),
            limitsRef.once('value'),
            reactionsRef.once('value'),
            emojiUsageRef.once('value')
        ]);

        if (msgSnap.exists()) {
            const raw = msgSnap.val();
            state.messages = Object.values(raw).sort((a, b) => a.timestamp - b.timestamp);
            state.messages = state.messages.map(msg => {
                if (!msg.readBy) msg.readBy = { MAZEN: true, ASMAA: true };
                return msg;
            });
        }

        if (limSnap.exists()) {
            const fbLimits = limSnap.val();
            if (fbLimits.MAZEN) state.limits.MAZEN = fbLimits.MAZEN;
            if (fbLimits.ASMAA) state.limits.ASMAA = fbLimits.ASMAA;
        }

        if (reactSnap.exists()) Object.assign(reactions, reactSnap.val());
        if (emojiSnap.exists()) Object.assign(emojiUsage, emojiSnap.val());

    } catch (e) {
        console.error("Firebase load error:", e);
    }
};

// =============================================
// Save functions
// =============================================
window.firebaseSaveData = function () {
    limitsRef.set(state.limits).catch(e => console.error("Save limits:", e));
};

window.firebaseSaveReactions = function () {
    reactionsRef.set(reactions).catch(e => console.error("Save reactions:", e));
};

window.firebaseSaveEmojiUsage = function () {
    emojiUsageRef.set(emojiUsage).catch(e => console.error("Save emoji:", e));
};

// =============================================
// Send text message
// =============================================
window.firebaseSendMessage = function (msg) {
    db.ref('messages/' + msg.id).set(msg).catch(e => console.error("Send msg:", e));
    limitsRef.set(state.limits).catch(e => console.error("Save limits:", e));
};

// =============================================
// Upload media to Firebase Storage then send
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
        const storageRef = storage.ref(`media/${folder}/${storageFileName}`);

        // Upload with progress
        const uploadTask = storageRef.put(blob);

        return new Promise((resolve, reject) => {
            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    if (onProgress) onProgress(Math.round(progress));
                },
                (error) => {
                    console.error("Upload error:", error);
                    reject(error);
                },
                async () => {
                    // Get download URL
                    const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();

                    const msg = {
                        id: Date.now() + Math.random(),
                        sender: currentSender,
                        text: caption || '',
                        timestamp: Date.now(),
                        type: 'media',
                        mediaType: mediaType,
                        mediaUrl: downloadURL,   // Firebase Storage URL (permanent)
                        fileName: fileName,
                        fileSize: fileSize,
                        replyTo: null,
                        edited: false,
                        readBy: {
                            MAZEN: currentSender === 'MAZEN',
                            ASMAA: currentSender === 'ASMAA'
                        }
                    };

                    await db.ref('messages/' + msg.id).set(msg);
                    resolve(msg);
                }
            );
        });

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
            const storageRef = storage.ref(`media/images/${storageFileName}`);

            await storageRef.put(blob);
            const downloadURL = await storageRef.getDownloadURL();

            uploadedImages.push({
                dataUrl: downloadURL,
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

        await db.ref('messages/' + msg.id).set(msg);
        return msg;

    } catch (e) {
        console.error("Gallery upload error:", e);
        throw e;
    }
};

// =============================================
// Edit message
// =============================================
window.firebaseEditMessage = function (msgId, newText) {
    db.ref('messages/' + msgId).update({ text: newText, edited: true })
      .catch(e => console.error("Edit msg:", e));
};

// =============================================
// Mark messages as read
// =============================================
window.firebaseMarkMessagesAsRead = function (user) {
    const updates = {};
    state.messages.forEach(msg => {
        if (msg.sender !== user && msg.readBy && !msg.readBy[user]) {
            updates['messages/' + msg.id + '/readBy/' + user] = true;
        }
    });
    if (Object.keys(updates).length > 0) {
        db.ref().update(updates).catch(e => console.error("Mark read:", e));
    }
};

// =============================================
// Real-time listeners
// =============================================
window.firebaseListenMessages = function (onReplyClick, onEditClick) {
    messagesRef.on('value', (snapshot) => {
        if (!snapshot.exists()) return;

        const raw = snapshot.val();
        const newMessages = Object.values(raw).sort((a, b) => a.timestamp - b.timestamp);
        state.messages = newMessages.map(msg => {
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
};

window.firebaseListenLimits = function () {
    limitsRef.on('value', (snapshot) => {
        if (!snapshot.exists()) return;
        const fbLimits = snapshot.val();
        if (fbLimits.MAZEN) state.limits.MAZEN = fbLimits.MAZEN;
        if (fbLimits.ASMAA) state.limits.ASMAA = fbLimits.ASMAA;
        updateCounters(elements);
        checkUIState(elements);
    });
};

window.firebaseListenReactions = function (onReplyClick, onEditClick) {
    reactionsRef.on('value', (snapshot) => {
        if (!snapshot.exists()) return;
        Object.assign(reactions, snapshot.val());
        renderAllMessages(elements, onReplyClick, onEditClick);
    });
};

// =============================================
// Presence System
// =============================================
window.firebaseSetupPresence = function (user) {
    if (!user) return;
    const userPresenceRef = db.ref('presence/' + user);
    db.ref('.info/connected').on('value', (snap) => {
        if (!snap.val()) return;
        userPresenceRef.onDisconnect().set({
            isOnline: false,
            lastSeen: firebase.database.ServerValue.TIMESTAMP
        });
        userPresenceRef.set({
            isOnline: true,
            lastSeen: firebase.database.ServerValue.TIMESTAMP
        });
    });
};

window.firebaseMarkOnline = function (user) {
    if (!user) return;
    db.ref('presence/' + user).set({
        isOnline: true,
        lastSeen: firebase.database.ServerValue.TIMESTAMP
    });
};

window.firebaseMarkOffline = function (user) {
    if (!user) return;
    db.ref('presence/' + user).set({ isOnline: false, lastSeen: Date.now() });
};

window.firebaseListenPresence = function (otherUser) {
    if (!otherUser) return;
    db.ref('presence/' + otherUser).on('value', (snapshot) => {
        if (!snapshot.exists()) return;
        const data = snapshot.val();
        presence[otherUser] = { isOnline: data.isOnline, lastSeen: data.lastSeen };
        updatePresenceStatus(elements);
    });
};

console.log("✅ Firebase v2 (with Storage) loaded");
