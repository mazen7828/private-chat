// ============================================================
// Media Handling Module - Supabase Storage Edition
// ============================================================

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
        if (recordingInterval) {
            clearInterval(recordingInterval);
            recordingInterval = null;
        }

        elements.voiceBtn.classList.remove('recording');
        elements.voiceModal.classList.remove('show');

        if (send) {
            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });

                // Show uploading indicator
                showWarning('⏳ جاري رفع الرسالة الصوتية...');

                // Upload to Supabase Storage
                const fileName = `voice_${Date.now()}.webm`;
                const publicUrl = await uploadBlobToStorage(audioBlob, fileName);

                // Close the warning
                elements.warningModal.classList.remove('show');

                if (publicUrl) {
                    await sendMediaMessage('voice', publicUrl, 'Voice Message.webm', audioBlob.size);
                } else {
                    showWarning('فشل رفع الرسالة الصوتية، حاول مرة أخرى');
                }
            };
        }

        mediaRecorder.stop();
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

    if (images.length > MAX_IMAGES) {
        showWarning(`يمكنك إرسال ${MAX_IMAGES} صورة كحد أقصى في المرة الواحدة. تم تحديد أول ${MAX_IMAGES} صورة.`);
        pendingMediaFiles = [...images.slice(0, MAX_IMAGES), ...others];
    } else {
        pendingMediaFiles = fileArray;
    }

    showMediaPreview(pendingMediaFiles);
    elements.fileInput.value = '';
}

function showMediaPreview(files) {
    elements.mediaPreviewContainer.innerHTML = '';
    elements.mediaCaptionInput.value = '';

    const images = files.filter(f => f.type.startsWith('image/'));
    const others = files.filter(f => !f.type.startsWith('image/'));

    if (images.length >= 5) {
        const galleryDiv = document.createElement('div');
        galleryDiv.className = 'media-preview-gallery';

        images.slice(0, 4).forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const item = document.createElement('div');
                item.className = 'media-preview-gallery-item';

                const img = document.createElement('img');
                img.src = e.target.result;
                item.appendChild(img);

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

async function sendMediaFromPreview() {
    const caption = elements.mediaCaptionInput.value.trim();
    const images = pendingMediaFiles.filter(f => f.type.startsWith('image/'));
    const others = pendingMediaFiles.filter(f => !f.type.startsWith('image/'));

    elements.mediaPreviewModal.classList.remove('show');

    // Show uploading
    showWarning('⏳ جاري رفع الملفات...');

    try {
        if (images.length >= 5) {
            // Upload all images to Supabase
            const uploadedUrls = [];
            for (const file of images) {
                const url = await uploadMediaToStorage(file, 'image');
                if (url) uploadedUrls.push({ dataUrl: url, name: file.name, size: file.size });
            }
            elements.warningModal.classList.remove('show');
            if (uploadedUrls.length > 0) {
                await sendMediaMessage('gallery', uploadedUrls, `${uploadedUrls.length} صور`, 0, caption);
            }
        } else {
            for (const file of images) {
                const url = await uploadMediaToStorage(file, 'image');
                if (url) await sendMediaMessage('image', url, file.name, file.size, caption);
            }
        }

        for (const file of others) {
            const url = await uploadMediaToStorage(file, getFileType(file.type));
            if (url) {
                const fileType = getFileType(file.type);
                await sendMediaMessage(fileType, url, file.name, file.size, caption);
            }
        }

        elements.warningModal.classList.remove('show');

    } catch (err) {
        console.error('Upload error:', err);
        elements.warningModal.classList.remove('show');
        showWarning('حدث خطأ أثناء الرفع، حاول مرة أخرى');
    }

    pendingMediaFiles = [];
}

function getFileType(mimeType) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'file';
}

async function sendMediaMessage(mediaType, dataUrl, fileName, fileSize, caption = '') {
    if (!currentSender) return;

    const msgId = String(Date.now() + Math.random());
    const msg = {
        id: msgId,
        sender: currentSender,
        text: caption,
        timestamp: Date.now(),
        type: 'media',
        mediaType: mediaType,
        mediaUrl: dataUrl,
        fileName: fileName,
        fileSize: fileSize,
        replyTo: null,
        edited: false,
        readBy: {
            MAZEN: currentSender === 'MAZEN',
            ASMAA: currentSender === 'ASMAA'
        }
    };

    state.messages.push(msg);

    renderSingleMessage(msg, elements, true, startReply, startEdit);
    updateCounters(elements);
    scrollToBottom(elements);

    // Save to Supabase (triggers realtime for other user)
    await saveMessage(msg);
}

function showWarning(message) {
    const modal = document.getElementById('warning-modal');
    const text = document.getElementById('modal-text');
    if (modal && text) {
        text.textContent = message;
        modal.classList.add('show');
    }
}
