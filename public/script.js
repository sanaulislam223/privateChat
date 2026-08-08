const socket = io({ transports: ['websocket', 'polling'] });

// UI Panels
const loginBox = document.getElementById('login-box');
const dashboardBox = document.getElementById('dashboard-box');
const chatBox = document.getElementById('chat-box');
const userListContainer = document.getElementById('user-list-container');

// Auth inputs
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginButton = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');
const logoutButton = document.getElementById('dash-logout-btn');
const backToDashBtn = document.getElementById('back-to-dash-btn');

// Chat row elements
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-btn');
const chatMessages = document.getElementById('chat-messages');
const imageInput = document.getElementById('image-input');
const userDisplay = document.getElementById('user-display');

// Camera & Calls UI Cache Elements
const liveCameraBtn = document.getElementById('live-camera-btn');
const cameraCaptureZone = document.getElementById('camera-capture-zone');
const captureWebcam = document.getElementById('capture-webcam');
const snapPhotoBtn = document.getElementById('snap-photo-btn');
const closeCaptureBtn = document.getElementById('close-capture-btn');
const captureCanvas = document.getElementById('capture-canvas');

const callOverlay = document.getElementById('call-overlay');
const fullscreenCallerTitle = document.getElementById('fullscreen-caller-title');
const callStatusLabel = document.getElementById('call-status-label');
const fullscreenVideoGrid = document.getElementById('fullscreen-video-grid');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const toggleMicBtn = document.getElementById('toggle-mic-btn');
const toggleCamBtn = document.getElementById('toggle-cam-btn');
const endCallBtn = document.getElementById('end-call-btn');
const voiceCallBtn = document.getElementById('voice-call-btn');
const videoCallBtn = document.getElementById('video-call-btn');
const notifSound = document.getElementById('notif-sound');
const ringtoneSound = document.getElementById('ringtone-sound');

let currentUsername = "";
let activeReceiver = ""; // Kisse chat chal rahi h
let localStream = null;
let captureStream = null;
let peerConnection = null;
let currentCallType = null;
let callActiveSession = false;
let isMuted = false;
let isCamOff = false;

const config = { iceServers: [{ urls: 'stun:://google.com' }] };

window.addEventListener('load', () => {
    const savedUser = localStorage.getItem('chat_username');
    if (savedUser) startDashboardSession(savedUser);
});

function startDashboardSession(user) {
    currentUsername = user;
    loginBox.style.display = 'none';
    chatBox.style.display = 'none';
    dashboardBox.style.display = 'flex';
    socket.emit('register-user', user);
}

loginButton.addEventListener('click', () => {
    const user = usernameInput.value.trim().toLowerCase();
    const pass = passwordInput.value.trim();
    if (user && pass === "love123") { // Sabhi ke liye common setup pass
        localStorage.setItem('chat_username', user);
        startDashboardSession(user);
    } else {
        loginError.style.display = 'block';
    }
});

logoutButton.addEventListener('click', () => {
    localStorage.removeItem('chat_username');
    window.location.reload();
});

backToDashBtn.addEventListener('click', () => {
    activeReceiver = "";
    chatBox.style.display = 'none';
    dashboardBox.style.display = 'flex';
});

// Dynamic Active Contact List Update System 🔄
socket.on('update-user-list', (users) => {
    userListContainer.innerHTML = '';
    users.forEach(user => {
        if(user !== currentUsername) {
            const row = document.createElement('div');
            row.style.background = '#fff';
            row.style.padding = '15px';
            row.style.marginBottom = '10px';
            row.style.borderRadius = '12px';
            row.style.cursor = 'pointer';
            row.style.fontWeight = 'bold';
            row.style.boxShadow = '0 2px 5px rgba(0,0,0,0.05)';
            row.innerText = `💬 Chat with: ${user.toUpperCase()}`;
            
            row.onclick = () => {
                activeReceiver = user;
                dashboardBox.style.display = 'none';
                chatBox.style.display = 'flex';
                userDisplay.innerText = `💖 ${user.toUpperCase()}`;
                socket.emit('get-chat-history', { sender: currentUsername, receiver: activeReceiver });
            };
            userListContainer.appendChild(row);
        }
    });
});

socket.on('load-history', (history) => {
    chatMessages.innerHTML = '';
    history.forEach(data => renderMessageInUI(data));
});

sendButton.addEventListener('click', () => {
    const message = messageInput.value.trim();
    if (message && activeReceiver) {
        socket.emit('private-message', { type: 'text', sender: currentUsername, receiver: activeReceiver, text: message });
        messageInput.value = '';
    }
});

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendButton.click();
});

imageInput.addEventListener('change', (e) => {
    const file = e.target.files;
    if (file && activeReceiver) {
        const reader = new FileReader();
        reader.onload = function(event) {
            socket.emit('private-message', { type: 'image', sender: currentUsername, receiver: activeReceiver, imageData: event.target.result });
        };
        reader.readAsDataURL(file);
    }
    imageInput.value = '';
});

liveCameraBtn.addEventListener('click', async () => {
    try {
        cameraCaptureZone.style.display = 'block';
        captureStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        captureWebcam.srcObject = captureStream;
    } catch(err) {
        alert("Camera permission block!");
        cameraCaptureZone.style.display = 'none';
    }
});

snapPhotoBtn.addEventListener('click', () => {
    if (captureStream && activeReceiver) {
        const context = captureCanvas.getContext('2d');
        captureCanvas.width = captureWebcam.videoWidth || 640;
        captureCanvas.height = captureWebcam.videoHeight || 480;
        context.drawImage(captureWebcam, 0, 0, captureCanvas.width, captureCanvas.height);
        const dataUrl = captureCanvas.toDataURL('image/jpeg', 0.7);
        socket.emit('private-message', { type: 'image', sender: currentUsername, receiver: activeReceiver, imageData: dataUrl });
        stopCaptureEngine();
    }
});

closeCaptureBtn.addEventListener('click', () => { stopCaptureEngine(); });

function stopCaptureEngine() {
    if(captureStream) {
        captureStream.getTracks().forEach(track => track.stop());
        captureStream = null;
    }
    cameraCaptureZone.style.display = 'none';
}

function deleteMsg(msgId) {
    if(confirm("Delete message for everyone permanently?")) {
        socket.emit('delete-message', { msgId, sender: currentUsername, receiver: activeReceiver });
    }
}

socket.on('chat-message', (data) => {
    if((data.sender === currentUsername && data.receiver === activeReceiver) || (data.sender === activeReceiver && data.receiver === currentUsername)) {
        renderMessageInUI(data);
    }
    if (data.sender !== currentUsername) notifSound.play().catch(e => {});
});

socket.on('message-deleted', (msgId) => {
    const el = document.getElementById(msgId);
    if(el) el.remove();
});

function renderMessageInUI(data) {
    const isMe = data.sender === currentUsername;
    const wrapper = document.createElement('div');
    wrapper.id = data.id;
    wrapper.className = `message-bubble-wrapper ${isMe ? 'sent' : 'received'}`;
    
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message';
    if (data.type === 'text') {
        msgDiv.innerText = `${isMe ? 'You' : data.sender.toUpperCase()}: ${data.text}`;
    } else {
        msgDiv.innerHTML = `
            <strong>${isMe ? 'You' : data.sender.toUpperCase()}:</strong><br>
            <a href="${data.imageData}" download="shared_photo_${Date.now()}.jpg" style="display:block; text-decoration:none;">
                <img src="${data.imageData}" style="max-width:100%; border-radius:12px; margin-top:5px; display:block;">
                <span style="font-size:0.72rem; display:block; color:#ff4b6e; text-align:right; margin-top:3px; font-weight:bold;">⬇️ Tap to Save Image</span>
            </a>
        `;
    }
    wrapper.appendChild(msgDiv);
    
    const delBtn = document.createElement('button');
    delBtn.className = 'delete-msg-btn';
    delBtn.innerText = 'Delete 🗑️';
    delBtn.onclick = () => deleteMsg(data.id);
    wrapper.appendChild(delBtn);

    chatMessages.appendChild(wrapper);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 📞 WhatsApp One-to-One Dynamic Voice & Video Calling Engine Block
voiceCallBtn.addEventListener('click', () => triggerOutgoingCall('voice'));
videoCallBtn.addEventListener('click', () => triggerOutgoingCall('video'));

async function triggerOutgoingCall(type) {
    if(!activeReceiver) return;
    currentCallType = type;
    callOverlay.style.display = 'flex';
    fullscreenCallerTitle.innerText = `Calling ${activeReceiver.toUpperCase()}...`;
    callStatusLabel.innerText = `Outgoing ${type} call...`;
    
    if(type === 'video') {
        fullscreenVideoGrid.style.display = 'block';
        toggleCamBtn.style.display = 'flex';
    } else {
        fullscreenVideoGrid.style.display = 'none';
        toggleCamBtn.style.display = 'none';
    }
    endCallBtn.className = "control-circle reject-red-btn";

    await startMediaTracks(type);
    peerConnection = new RTCPeerConnection(config);
            localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

        peerConnection.onicecandidate = (e) => {
            if (e.candidate) socket.emit('webrtc-signal', { sender: currentUsername, receiver: activeReceiver, candidate: e.candidate });
        };
        peerConnection.ontrack = (e) => { remoteVideo.srcObject = e.streams; };

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('webrtc-signal', { sender: currentUsername, receiver: activeReceiver, offer: offer, callType: type });
        ringtoneSound.play().catch(e => {});
    }
}

async function startMediaTracks(type) {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' });
        localVideo.srcObject = localStream;
    } catch(e) {
        alert("Permissions access error!");
        terminateCallEngine();
    }
}

socket.on('webrtc-signal', async (data) => {
    if (data.offer) {
        activeReceiver = data.sender; 
        currentCallType = data.callType;
        callOverlay.style.display = 'flex';
        fullscreenCallerTitle.innerText = data.sender.toUpperCase();
        callStatusLabel.innerText = `Incoming ${data.callType} call...`;
        endCallBtn.className = "control-circle active-green";
        ringtoneSound.play().catch(e => {});
        window.incomingOfferDetails = data.offer;
    } else if (data.answer) {
        ringtoneSound.pause(); ringtoneSound.currentTime = 0;
        callStatusLabel.innerText = "Connected";
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
        callActiveSession = true;
    } else if (data.candidate) {
        try { if(peerConnection) await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate)); } catch(e){}
    }
});

endCallBtn.addEventListener('click', async () => {
    if (!callActiveSession && endCallBtn.classList.contains('active-green')) {
        endCallBtn.className = "control-circle reject-red-btn";
        ringtoneSound.pause(); ringtoneSound.currentTime = 0;
        callStatusLabel.innerText = "Connecting...";

        if(currentCallType === 'video') {
            fullscreenVideoGrid.style.display = 'block';
            toggleCamBtn.style.display = 'flex';
        }
        await startMediaTracks(currentCallType);
        peerConnection = new RTCPeerConnection(config);
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

        peerConnection.onicecandidate = (e) => {
            if (e.candidate) socket.emit('webrtc-signal', { sender: currentUsername, receiver: activeReceiver, candidate: e.candidate });
        };
        peerConnection.ontrack = (e) => { remoteVideo.srcObject = e.streams; };

        await peerConnection.setRemoteDescription(new RTCSessionDescription(window.incomingOfferDetails));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('webrtc-signal', { sender: currentUsername, receiver: activeReceiver, answer: answer });
        callStatusLabel.innerText = "Connected";
        callActiveSession = true;
    } else {
        socket.emit('call-ended', { sender: currentUsername, receiver: activeReceiver });
        terminateCallEngine();
    }
});

socket.on('call-ended', () => { terminateCallEngine(); });

function terminateCallEngine() {
    ringtoneSound.pause(); ringtoneSound.currentTime = 0;
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    if (peerConnection) { peerConnection.close(); peerConnection = null; }
    callActiveSession = false;
    callOverlay.style.display = 'none';
}

toggleMicBtn.addEventListener('click', () => {
    if(localStream) {
        isMuted = !isMuted; localStream.getAudioTracks().enabled = !isMuted;
        toggleMicBtn.className = `control-circle ${isMuted ? 'muted-state' : ''}`;
    }
});
toggleCamBtn.addEventListener('click', () => {
    if(localStream && currentCallType === 'video') {
        isCamOff = !isCamOff; localStream.getVideoTracks().enabled = !isCamOff;
        toggleCamBtn.className = `control-circle ${isCamOff ? 'muted-state' : ''}`;
    }
});

