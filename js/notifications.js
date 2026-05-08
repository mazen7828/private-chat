// Notifications Module - Browser notification system

let notificationPermission = 'default';

async function initializeNotifications() {
    if (!('Notification' in window)) {
        console.log('This browser does not support notifications');
        return;
    }
    
    notificationPermission = Notification.permission;
    
    // If permission is already granted, we're done
    if (notificationPermission === 'granted') {
        return;
    }
    
    // If permission is default (not asked yet), we'll ask when user selects identity
    // If permission is denied, we respect that and don't ask again
}

async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        return;
    }
    
    // Only request if not already decided
    if (Notification.permission === 'default') {
        try {
            const permission = await Notification.requestPermission();
            notificationPermission = permission;
            
            if (permission === 'granted') {
                // Send a test notification
                sendNotification('إشعارات مفعلة', 'سيصلك إشعار عند وصول رسائل جديدة', '🔔');
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
        }
    }
}

function sendNotification(title, body, icon = '💬') {
    if (!('Notification' in window)) {
        return;
    }
    
    if (Notification.permission !== 'granted') {
        return;
    }
    
    // Don't send notification if page is visible
    if (!document.hidden) {
        return;
    }
    
    try {
        const notification = new Notification(title, {
            body: body,
            icon: icon,
            badge: icon,
            tag: 'private-chat',
            requireInteraction: false,
            silent: false
        });
        
        notification.onclick = () => {
            window.focus();
            notification.close();
        };
        
        // Auto-close after 5 seconds
        setTimeout(() => {
            notification.close();
        }, 5000);
        
    } catch (error) {
        console.error('Error showing notification:', error);
    }
}

function notifyNewMessage(senderName, messageText) {
    // Only notify if current user is not the sender
    if (!currentSender) return;
    
    const title = `رسالة جديدة من ${senderName}`;
    const body = messageText.length > 50 
        ? messageText.substring(0, 50) + '...' 
        : messageText;
    
    sendNotification(title, body, '💬');
}

function notifyNewMedia(senderName, mediaType) {
    if (!currentSender) return;
    
    let mediaText = '';
    switch(mediaType) {
        case 'image':
            mediaText = 'صورة';
            break;
        case 'video':
            mediaText = 'فيديو';
            break;
        case 'voice':
        case 'audio':
            mediaText = 'رسالة صوتية';
            break;
        case 'gallery':
            mediaText = 'مجموعة صور';
            break;
        default:
            mediaText = 'ملف';
    }
    
    const title = `رسالة جديدة من ${senderName}`;
    const body = `أرسل ${mediaText}`;
    
    sendNotification(title, body, '📎');
}