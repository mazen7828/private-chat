// =============================================
// Firebase Integration — file:// Compatible
// Uses Firebase Compat (v8-style, no ES modules)
// =============================================

const firebaseConfig = {
    apiKey: "AIzaSyDV9sJRgLY3Lt81CLqxEm4YpQAJGepFQEc",
    authDomain: "private-chat-83e85.firebaseapp.com",
    databaseURL: "https://private-chat-83e85-default-rtdb.firebaseio.com",
    projectId: "private-chat-83e85",
    storageBucket: "private-chat-83e85.firebasestorage.app",
    messagingSenderId: "257346884188",
    appId: "1:257346884188:web:b5d0f5032fdf6b98ce8c99",
    measurementId: "G-L9EPT63HHT"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// =============================================
// DB References
// =============================================
const messagesRef = db.ref('messages');
const limitsRef   = db.ref('limits');
const reactionsRef = db.ref('reactions');
const emojiUsageRef = db.ref('emojiUsage');
const presenceRef = db.ref('presence');

// =============================================
// Load all data from Firebase once
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
    limitsRef.set(state.limits).catch(e => console.error("Save limits error:", e));
};

window.firebaseSaveReactions = function () {
    reactionsRef.set(reactions).catch(e => console.error("Save reactions error:", e));
};

window.firebaseSaveEmojiUsage = function () {
    emojiUsageRef.set(emojiUsage).catch(e => console.error("Save emoji error:", e));
};

// =============================================
// Send message
// =============================================
window.firebaseSendMessage = function (msg) {
    db.ref('messages/' + msg.id).set(msg).catch(e => console.error("Send msg error:", e));
    limitsRef.set(state.limits).catch(e => console.error("Save limits error:", e));
};

// =============================================
// Edit message
// =============================================
window.firebaseEditMessage = function (msgId, newText) {
    db.ref('messages/' + msgId).update({ text: newText, edited: true })
      .catch(e => console.error("Edit msg error:", e));
};

// =============================================
// Mark messages as read
// =============================================
window.firebaseMarkMessagesAsRead = function (user) {
    const updates = {};
    state.messages.forEach(msg => {
        if (msg.sender !== user && !msg.readBy[user]) {
            updates['messages/' + msg.id + '/readBy/' + user] = true;
        }
    });
    if (Object.keys(updates).length > 0) {
        db.ref().update(updates).catch(e => console.error("Mark read error:", e));
    }
};

// =============================================
// Real-time listener — Messages
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

// =============================================
// Real-time listener — Limits
// =============================================
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

// =============================================
// Real-time listener — Reactions
// =============================================
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
    const connectedRef = db.ref('.info/connected');

    connectedRef.on('value', (snap) => {
        if (!snap.val()) return;
        userPresenceRef.onDisconnect().set({ isOnline: false, lastSeen: firebase.database.ServerValue.TIMESTAMP });
        userPresenceRef.set({ isOnline: true, lastSeen: firebase.database.ServerValue.TIMESTAMP });
    });
};

window.firebaseMarkOnline = function (user) {
    if (!user) return;
    db.ref('presence/' + user).set({
        isOnline: true,
        lastSeen: firebase.database.ServerValue.TIMESTAMP
    }).catch(e => console.error("Mark online error:", e));
};

window.firebaseMarkOffline = function (user) {
    if (!user) return;
    db.ref('presence/' + user).set({
        isOnline: false,
        lastSeen: Date.now()
    }).catch(e => console.error("Mark offline error:", e));
};

// =============================================
// Real-time listener — Presence (other user)
// =============================================
window.firebaseListenPresence = function (otherUser) {
    if (!otherUser) return;
    db.ref('presence/' + otherUser).on('value', (snapshot) => {
        if (!snapshot.exists()) return;
        const data = snapshot.val();
        presence[otherUser] = {
            isOnline: data.isOnline,
            lastSeen: data.lastSeen
        };
        updatePresenceStatus(elements);
    });
};

console.log("✅ Firebase (compat) loaded successfully");
