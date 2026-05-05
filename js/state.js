// State Management Module — Firebase Edition

const DAILY_LIMIT = 20;
const IDENTITY_KEY = 'privateChatIdentity';

const IS_TIMER_ENABLED = true;
const DAILY_LIMIT_SYSTEM_ENABLED = true;

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

// Load from Firebase (called once on init)
async function loadData() {
    await firebaseLoadData();
}

// Save to Firebase
function saveData() {
    firebaseSaveData();
}

function saveReactions() {
    firebaseSaveReactions();
}

function saveEmojiUsage() {
    firebaseSaveEmojiUsage();
}

// Presence wrappers
function savePresence() {} // handled by Firebase directly

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
        console.log("Midnight Reset Triggered: Limits cleared.");
    }
}

function updateCounters(elements) {
    elements.mazenCounter.textContent = `${state.limits.MAZEN.count}/${DAILY_LIMIT}`;
    elements.asmaaCounter.textContent = `${state.limits.ASMAA.count}/${DAILY_LIMIT}`;
}

function getUnreadCount(user) {
    if (!user) return 0;
    return state.messages.filter(msg => msg.sender !== user && !msg.readBy[user]).length;
}

function markMessagesAsRead(user) {
    if (!user) return;
    let updated = false;
    state.messages.forEach(msg => {
        if (msg.sender !== user && !msg.readBy[user]) {
            msg.readBy[user] = true;
            updated = true;
        }
    });
}

function getFirstUnreadIndex(user) {
    if (!user) return -1;
    return state.messages.findIndex(msg => msg.sender !== user && !msg.readBy[user]);
}
