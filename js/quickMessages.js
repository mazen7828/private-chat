// Quick Messages Module - Preset message system

// Preset messages for each user
const PRESETS = {
    MAZEN: {
        common: ['سيمو', 'اسماء', 'ام زين', 'ام يزن', 'ام حور', 'ام رزان', 'انا صحيت', 'انا داخل انام', 'انا في الدرس', 'انتي نمتي', 'انتي صحيتي'],
        sweet: ['قلبي', 'روحي', 'عقلي', 'بطتي', 'مزتي', 'بنوتي', 'نن عيوني'],
        status: ['حاضر', 'من عيوني', 'ذاكري وبطلي لعب', 'قوم صلي']
    },
    ASMAA: {
        common: ['مازن', 'زيزو', 'ابو زين', 'ابو يزن', 'ابو حور', 'ابو رزان', 'انا صحيت', 'انا داخل انام', 'انا روحت', 'انا في البيت', 'انا بذاكر'],
        sweet: ['بحبك', 'كتكوتي', 'قلبي', 'روحي', 'عشقي', 'خاللي بالك من نفسك'],
        status: ['حاضر', 'من عيوني', 'بس كدا', 'قوم صلي']
    }
};

let currentPresetCategory = null;
let cachedCallbacks = {
    updateCounters: null,
    handleReply: null,
    handleEdit: null
};

function getCurrentPresetCategory() {
    return currentPresetCategory;
}

function setCurrentPresetCategory(category) {
    currentPresetCategory = category;
}

function setupQuickMessageListeners(updateCounters, handleReply, handleEdit) {
    cachedCallbacks = { updateCounters, handleReply, handleEdit };
    
    // Main category buttons
    elements.quickMainButtons.querySelectorAll('.quick-main-btn').forEach(btn => {
        btn.onclick = () => {
            const category = btn.dataset.category;
            if (currentPresetCategory === category) {
                // Close if same category clicked again
                currentPresetCategory = null;
                elements.quickPresetPanel.style.display = 'none';
                btn.classList.remove('active');
            } else {
                // Open new category
                currentPresetCategory = category;
                showPresetButtons(category);
                elements.quickMainButtons.querySelectorAll('.quick-main-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            }
        };
    });
}

function showPresetButtons(category) {
    const sender = getCurrentSender();
    if (!sender) return;
    
    const presets = PRESETS[sender][category] || [];
    elements.quickPresetButtons.innerHTML = '';
    
    presets.forEach(text => {
        const btn = document.createElement('button');
        btn.className = 'quick-preset-btn';
        btn.textContent = text;
        btn.onclick = () => {
            sendPresetMessage(
                text, 
                elements, 
                cachedCallbacks.handleReply, 
                cachedCallbacks.handleEdit, 
                cachedCallbacks.updateCounters
            );
        };
        elements.quickPresetButtons.appendChild(btn);
    });
    
    elements.quickPresetPanel.style.display = 'block';
}

function updateQuickMessageVisibility() {
    const sender = getCurrentSender();
    if (!sender) return;

    const userLimit = state.limits[sender];
    const isBlocked = DAILY_LIMIT_SYSTEM_ENABLED && userLimit.count >= DAILY_LIMIT;
    const isEmpty = !elements.messageInput.value.trim();
    const pinBtn = elements.pinBtn;

    if (isBlocked) {
        // Blocked State: Show presets directly, hide pin
        if (pinBtn) pinBtn.style.display = 'none';
        elements.quickMessagesContainer.style.display = 'block';
        
        // Auto-open a category if none is active
        const activeBtn = elements.quickMainButtons.querySelector('.quick-main-btn.active');
        if (!activeBtn) {
            const commonBtn = elements.quickMainButtons.querySelector('[data-category="common"]');
            if (commonBtn) {
                currentPresetCategory = 'common';
                commonBtn.classList.add('active');
                showPresetButtons('common');
            }
        }
    } else {
        // Normal State: Hidden behind pin, pin only shown when empty
        if (isEmpty) {
            if (pinBtn) pinBtn.style.display = 'flex';
        } else {
            if (pinBtn) pinBtn.style.display = 'none';
            closePresetPanel();
        }
    }
}

function togglePresetPanel() {
    const pinBtn = document.getElementById('pin-btn');
    
    if (elements.quickMessagesContainer.style.display === 'block') {
        // Close panel
        closePresetPanel();
        if (pinBtn) pinBtn.classList.remove('active');
    } else {
        // Open panel
        elements.quickMessagesContainer.style.display = 'block';
        if (pinBtn) pinBtn.classList.add('active');
    }
}

function closePresetPanel() {
    elements.quickMessagesContainer.style.display = 'none';
    currentPresetCategory = null;
    elements.quickPresetPanel.style.display = 'none';
    elements.quickMainButtons.querySelectorAll('.quick-main-btn').forEach(b => b.classList.remove('active'));
    const pinBtn = document.getElementById('pin-btn');
    if (pinBtn) pinBtn.classList.remove('active');
}