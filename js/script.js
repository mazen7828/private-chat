// ============================================================
// Main Orchestration - Supabase Edition
// ============================================================

async function init() {
    // Show loading indicator
    document.body.insertAdjacentHTML('beforeend', `
        <div id="loading-overlay" style="
            position:fixed;top:0;left:0;width:100%;height:100%;
            background:#1f2c34;display:flex;flex-direction:column;
            align-items:center;justify-content:center;z-index:9999;
        ">
            <div style="font-size:2rem;margin-bottom:16px;">💬</div>
            <div style="color:#8696a0;font-size:14px;font-family:Cairo,sans-serif;">جاري التحميل...</div>
        </div>
    `);

    try {
        // Load all data from Supabase
        await loadData();
    } catch (err) {
        console.error('Failed to load data from Supabase:', err);
    }

    // Remove loading overlay
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.remove();

    await checkAndResetDailyLimits(onReset);
    initializeNotifications();
    initializeBellSystem();

    const savedIdentity = localStorage.getItem(IDENTITY_KEY);
    if (savedIdentity) {
        setCurrentSender(savedIdentity);
        await markUserOnline(savedIdentity);

        const firstUnreadIndex = getFirstUnreadIndex(savedIdentity);
        renderAllMessages(elements, handleReplyClick, handleEditClick, firstUnreadIndex);

        if (firstUnreadIndex !== -1) {
            await markMessagesAsRead(savedIdentity);
        }

        checkUIState(elements);
        startPresenceUpdates(elements);
        requestNotificationPermission();

        // Setup realtime subscriptions
        setupRealtimeSubscriptions(
            (msg, eventType) => handleRealtimeMessage(msg, eventType, handleReplyClick, handleEditClick),
            () => updatePresenceStatus(elements),
            () => {
                elements.messagesContainer.innerHTML = '';
                state.messages.forEach(m => renderSingleMessage(m, elements, false, handleReplyClick, handleEditClick));
            }
        );

        setupPresenceTracking(handleReplyClick, handleEditClick);
    } else {
        renderAllMessages(elements, handleReplyClick, handleEditClick);
        elements.identityModal.classList.add('show');
    }

    updateCounters(elements);
    setupEventListeners(() => updateCounters(elements), handleReplyClick, handleEditClick);
    if (typeof initSwipeToReply === 'function') initSwipeToReply();

    // Periodic limit check
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
