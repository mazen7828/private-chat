/**
 * Private Chat — Main Orchestration (Firebase Edition)
 */

async function init() {
    // 🔥 Load data from Firebase first
    await loadData();

    checkAndResetDailyLimits(onReset);

    const savedIdentity = localStorage.getItem(IDENTITY_KEY);
    if (savedIdentity) {
        setCurrentSender(savedIdentity);

        // 🔥 Setup Firebase presence for this user
        markUserOnline(savedIdentity);

        const firstUnreadIndex = getFirstUnreadIndex(savedIdentity);
        renderAllMessages(elements, handleReplyClick, handleEditClick, firstUnreadIndex);

        if (firstUnreadIndex !== -1) {
            markMessagesAsRead(savedIdentity);
            firebaseMarkMessagesAsRead(savedIdentity);
        }

        checkUIState(elements);
        startPresenceUpdates(elements);

        // 🔥 Start real-time listeners
        firebaseListenMessages(handleReplyClick, handleEditClick);
        firebaseListenLimits();
        firebaseListenReactions(handleReplyClick, handleEditClick);

        const otherUser = getOtherUser(savedIdentity);
        firebaseListenPresence(otherUser);
    } else {
        renderAllMessages(elements, handleReplyClick, handleEditClick);
        elements.identityModal.classList.add('show');
    }

    updateCounters(elements);
    setupEventListeners(() => updateCounters(elements), handleReplyClick, handleEditClick);
    setupPresenceTracking(handleReplyClick, handleEditClick);
    setInterval(() => checkAndResetDailyLimits(onReset), 1000);
}

function onReset() {
    updateCounters(elements);
    checkUIState(elements);
}

function handleReplyClick(messageId) {
    startReply(messageId, elements);
}

function handleEditClick(messageId) {
    startEdit(messageId, elements);
    updateQuickMessageVisibility();
}

// App Kickoff
init();
updateQuickMessageVisibility();
