// Media Handling Module - Voice recording and file attachments

let mediaRecorder = null;
let audioChunks = [];
let recordingStartTime = null;
let recordingInterval = null;

function startVoiceRecording() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showWarning('تسجيل الصوت غير مدعوم في هذا المتصفح');
        return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];
            
            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };
            
            mediaRecorder.onstop = () => {
                stream.getTracks().forEach(track => track.stop());
            };
            
            mediaRecorder.start();
            recordingStartTime = Date.now();
            
            elements.voiceBtn.classList.add('recording');
            elements.voiceModal.classList.add('show');
            
            updateRecordingTimer();
            recordingInterval = setInterval(updateRecordingTimer, 1000);
        })
        .catch(error => {
            console.error('Error accessing microphone:', error);
            showWarning('فشل الوصول إلى الميكروفون');
        });
}

function updateRecordingTimer() {
    const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    elements.voiceTimer.textContent = 
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function stopVoiceRecording(send = false) {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        
        if (recordingInterval) {
            clearInterval(recordingInterval);
            recordingInterval = null;
        }
        
        elements.voiceBtn.classList.remove('recording');
        elements.voiceModal.classList.remove('show');
        
        if (send) {
            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.onloadend = () => {
                    sendMediaMessage('voice', reader.result, 'Voice Message.webm', audioBlob.size);
                };
                reader.readAsDataURL(audioBlob);
                
                // Stop all tracks
                if (mediaRecorder.stream) {
                    mediaRecorder.stream.getTracks().forEach(track => track.stop());
                }
            };
        } else {
            // Stop all tracks
            if (mediaRecorder.stream) {
                mediaRecorder.stream.getTracks().forEach(track => track.stop());
            }
        }
        
        audioChunks = [];
        recordingStartTime = null;
    }
}

let pendingMediaFiles = [];

function handleFileSelection(files) {
    if (!files || files.length === 0) return;
    
    const MAX_IMAGES = 30;
    const fileArray = Array.from(files);
    const images = fileArray.filter(f => f.type.startsWith('image/'));
    const others = fileArray.filter(f => !f.type.startsWith('image/'));
    
    // Limit images to 30
    if (images.length > MAX_IMAGES) {
        showWarning(`يمكنك إرسال ${MAX_IMAGES} صورة كحد أقصى في المرة الواحدة. تم تحديد أول ${MAX_IMAGES} صورة.`);
        pendingMediaFiles = [...images.slice(0, MAX_IMAGES), ...others];
    } else {
        pendingMediaFiles = fileArray;
    }
    
    showMediaPreview(pendingMediaFiles);
    
    // Reset file input
    elements.fileInput.value = '';
}

function showMediaPreview(files) {
    elements.mediaPreviewContainer.innerHTML = '';
    elements.mediaCaptionInput.value = '';
    
    const images = files.filter(f => f.type.startsWith('image/'));
    const others = files.filter(f => !f.type.startsWith('image/'));
    
    // If 5+ images, show as gallery
    if (images.length >= 5) {
        const galleryDiv = document.createElement('div');
        galleryDiv.className = 'media-preview-gallery';
        
        // Show first 4 images
        images.slice(0, 4).forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const item = document.createElement('div');
                item.className = 'media-preview-gallery-item';
                
                const img = document.createElement('img');
                img.src = e.target.result;
                item.appendChild(img);
                
                // Show count on last image if more than 4
                if (index === 3 && images.length > 4) {
                    const count = document.createElement('div');
                    count.className = 'media-preview-count';
                    count.textContent = `+${images.length - 4}`;
                    item.appendChild(count);
                }
                
                galleryDiv.appendChild(item);
            };
            reader.readAsDataURL(file);
        });
        
        elements.mediaPreviewContainer.appendChild(galleryDiv);
    } else {
        // Show images individually
        images.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const item = document.createElement('div');
                item.className = 'media-preview-item';
                
                const img = document.createElement('img');
                img.src = e.target.result;
                item.appendChild(img);
                
                elements.mediaPreviewContainer.appendChild(item);
            };
            reader.readAsDataURL(file);
        });
    }
    
    // Show other media types
    others.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const item = document.createElement('div');
            item.className = 'media-preview-item';
            
            if (file.type.startsWith('video/')) {
                const video = document.createElement('video');
                video.src = e.target.result;
                video.controls = true;
                video.style.maxWidth = '100%';
                item.appendChild(video);
            } else if (file.type.startsWith('audio/')) {
                const audio = document.createElement('audio');
                audio.src = e.target.result;
                audio.controls = true;
                item.appendChild(audio);
            } else {
                const fileDiv = document.createElement('div');
                fileDiv.style.padding = '12px';
                fileDiv.style.background = 'rgba(255,255,255,0.1)';
                fileDiv.style.borderRadius = '8px';
                fileDiv.textContent = `📎 ${file.name}`;
                item.appendChild(fileDiv);
            }
            
            elements.mediaPreviewContainer.appendChild(item);
        };
        reader.readAsDataURL(file);
    });
    
    elements.mediaPreviewModal.classList.add('show');
}

function sendMediaFromPreview() {
    const caption = elements.mediaCaptionInput.value.trim();
    const images = pendingMediaFiles.filter(f => f.type.startsWith('image/'));
    const others = pendingMediaFiles.filter(f => !f.type.startsWith('image/'));
    
    // If 5+ images, send as gallery
    if (images.length >= 5) {
        const imageDataPromises = images.map(file => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve({
                    dataUrl: e.target.result,
                    name: file.name,
                    size: file.size
                });
                reader.readAsDataURL(file);
            });
        });
        
        Promise.all(imageDataPromises).then(imageData => {
            showUploadProgress(0);
            firebaseUploadGallery(imageData, caption, (p) => showUploadProgress(p))
                .then((msg) => {
                    hideUploadProgress();
                    state.messages.push(msg);
                    renderSingleMessage(msg, elements, true, startReply, startEdit);
                    updateCounters(elements);
                    scrollToBottom(elements);
                }).catch((err) => {
                    hideUploadProgress();
                    showWarning("فشل رفع الصور. تحقق من الاتصال بالإنترنت.");
                });
        });
    } else {
        // Send images individually
        images.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                sendMediaMessage('image', e.target.result, file.name, file.size, caption);
            };
            reader.readAsDataURL(file);
        });
    }
    
    // Send other media
    others.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const fileType = getFileType(file.type);
            sendMediaMessage(fileType, e.target.result, file.name, file.size, caption);
        };
        reader.readAsDataURL(file);
    });
    
    elements.mediaPreviewModal.classList.remove('show');
    pendingMediaFiles = [];
}

function getFileType(mimeType) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'file';
}

function sendMediaMessage(mediaType, dataUrl, fileName, fileSize, caption = '') {
    if (!currentSender) return;

    // Show upload progress indicator
    showUploadProgress(0);

    firebaseUploadAndSendMedia(mediaType, dataUrl, fileName, fileSize, caption, (progress) => {
        showUploadProgress(progress);
    }).then((msg) => {
        hideUploadProgress();
        state.messages.push(msg);
        renderSingleMessage(msg, elements, true, startReply, startEdit);
        updateCounters(elements);
        scrollToBottom(elements);
    }).catch((err) => {
        hideUploadProgress();
        console.error("Upload failed:", err);
        showWarning("فشل رفع الملف. تحقق من الاتصال بالإنترنت.");
    });
}

function showUploadProgress(percent) {
    let bar = document.getElementById('firebase-upload-bar');
    if (!bar) {
        bar = document.createElement('div');
        bar.id = 'firebase-upload-bar';
        bar.style.cssText = `
            position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
            background: rgba(0,0,0,0.8); color: white; padding: 10px 20px;
            border-radius: 20px; font-size: 14px; z-index: 9999;
            display: flex; align-items: center; gap: 10px; min-width: 200px;
        `;
        document.body.appendChild(bar);
    }
    bar.innerHTML = `<span>⬆️ جاري الرفع...</span><span style="font-weight:bold">${percent}%</span>`;
    bar.style.display = 'flex';
}

function hideUploadProgress() {
    const bar = document.getElementById('firebase-upload-bar');
    if (bar) bar.style.display = 'none';
}

// removed: function formatFileSize() - moved to js/rendering.js

function showWarning(message) {
    const modal = document.getElementById('warning-modal');
    const text = document.getElementById('modal-text');
    if (modal && text) {
        text.textContent = message;
        modal.classList.add('show');
    }
}