// State Management Module — Firebase Edition v2

const DAILY_LIMIT = 20;
const IDENTITY_KEY = 'privateChatIdentity';

const IS_TIMER_ENABLED = true;
const DAILY_LIMIT_SYSTEM_ENABLED = false;

const BLOCK_MESSAGES = {
    ASMAA: "يلا يا بنوتي قومي خلصي اللي وراكي او نامي يا ماما وبكره نبقي نكمل كلامنا",
    MAZEN: "قوم بقي ياعم بطل محن بقي قوم يلاااا"
};

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

function setCurrentSender(sender) { currentSender = sender; }
function getCurrentSender() { return currentSender; }

async function loadData() {
    await firebaseLoadData();
}

function saveData() { firebaseSaveData(); }
function saveReactions() { firebaseSaveReactions(); }
function saveEmojiUsage() { firebaseSaveEmojiUsage(); }
function savePresence() {}

function markUserOnline(user) {
    if (!user) return;
    presence[user] = { isOnline: true, lastSeen: Date.now() };
    firebaseMarkOnline(user);
    firebaseSetupPresence(user);
}

function markUserOffline(user) {
    if (!user) return;
    presence[user] = { isOnline: false, lastSeen: Date.now() };
    firebaseMarkOffline(user);
}

function updateUserActivity(user) {
    if (!user) return;
    presence[user] = { isOnline: true, lastSeen: Date.now() };
    firebaseMarkOnline(user);
}

function getOtherUser(currentUser) {
    if (currentUser === 'MAZEN') return 'ASMAA';
    if (currentUser === 'ASMAA') return 'MAZEN';
    return null;
}

function getTodayDate() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function checkAndResetDailyLimits(onResetCallback) {
    if (!IS_TIMER_ENABLED) return;
    const today = getTodayDate();
    let resetHappened = false;
    ['MAZEN', 'ASMAA'].forEach(user => {
        if (state.limits[user].date !== today) {
            state.limits[user] = { count: 0, date: today, finalNoteSent: false };
            resetHappened = true;
        }
    });
    if (resetHappened) {
        saveData();
        if (onResetCallback) onResetCallback();
    }
}

function updateCounters(elements) {
    if (elements.mazenCounter) elements.mazenCounter.textContent = `${state.limits.MAZEN.count}/${DAILY_LIMIT}`;
    if (elements.asmaaCounter) elements.asmaaCounter.textContent = `${state.limits.ASMAA.count}/${DAILY_LIMIT}`;
}

function getUnreadCount(user) {
    if (!user) return 0;
    return state.messages.filter(msg => msg.sender !== user && !msg.readBy[user]).length;
}

function markMessagesAsRead(user) {
    if (!user) return;
    state.messages.forEach(msg => {
        if (msg.sender !== user && !msg.readBy[user]) {
            msg.readBy[user] = true;
        }
    });
}

function simulateReceivedMessage(msg) {
    if (currentSender && msg.sender !== currentSender) {
        if (msg.type === 'media') {
            notifyNewMedia(msg.sender, msg.mediaType);
        } else if (msg.text) {
            notifyNewMessage(msg.sender, msg.text);
        }
    }
}

function getFirstUnreadIndex(user) {
    if (!user) return -1;
    return state.messages.findIndex(msg => msg.sender !== user && !msg.readBy[user]);
}
