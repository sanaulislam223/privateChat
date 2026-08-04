const socket = io({ transports: ['websocket', 'polling'] });

// Document Elements
const loginBox = document.getElementById('login-box');
const chatBox = document.getElementById('chat-box');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginButton = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');
const logoutButton = document.getElementById('logout-btn');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-btn');
const chatMessages = document.getElementById('chat-messages');
const imageInput = document.getElementById('image-input');
const userDisplay = document.getElementById('user-display');
const partnerStatus = document.getElementById('partner-status');
const clearChatButton = document.getElementById('clear-chat-btn');

// Live Capture UI Elements
const liveCameraBtn = document.getElementById('live-camera-btn');
const cameraCaptureZone = document.getElementById('camera-capture-zone');
const captureWebcam = document.getElementById('capture-webcam');
const snapPhotoBtn = document.getElementById('snap-photo-btn');
const closeCaptureBtn = document.getElementById('close-capture-btn');
const captureCanvas = document.getElementById('capture-canvas');

// Overlays UI Cache Elements
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
let localStream = null;
let captureStream = null;
let peerConnection = null;
let currentCallType = null;
let callActiveSession = false;
let isMuted = false;
let isCamOff = false;

const config = { iceServers: [{ urls: 'stun:://google.com' }] };

// 🔄 1. Auto Login Persistence Session Layer
window.addEventListener('load', () => {
    const savedUser = localStorage.getItem('chat_username');
    if (savedUser) {
        startChatSession(savedUser);
    }
});

function startChatSession(user) {
    currentUsername = user;
    userDisplay.innerText = `💖 ${user === 'sanaul' ? 'Sanaul' : 'Partner'}`;
    loginBox.style.display = 'none';
    chatBox.style.display = 'flex';
    socket.emit('register-user', user);
}

// 🔒 2. Fixed Login Verification Logic
loginButton.addEventListener('click', () => {
    const user = usernameInput.value.trim().toLowerCase();
    const pass = passwordInput.value.trim();
    
    if ((user === "sanaul" && pass === "love123") || (user === "girlfriend" && pass === "love123")) {
        localStorage.setItem('chat_username', user);
        startChatSession(user);
    } else {
        loginError.style.display = 'block';
    }
});

// 🚪 3. Safe Session Clear Logout
logoutButton.addEventListener('click', () => {
    localStorage.removeItem('chat_username');
    window.location.reload();
});

// 📩 4. Chat History & Message Management
socket.on('load-history', (history) => {
    chatMessages.innerHTML = '';
    history.forEach(data => renderMessageInUI(data));
});

sendButton.addEventListener('click', () => {
    const message = messageInput.value.trim();
    if (message) {
        socket.emit('chat-message', { type: 'text', sender: currentUsername, text: message });
        messageInput.value = '';
    }
});

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendButton.click();
});

imageInput.addEventListener('change', (e) => {
    const file = e.target.files;
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            socket.emit('chat-message', { type: 'image', sender: currentUsername, imageData: event.target.result });
        };
        reader.readAsDataURL(file);
    }
    imageInput.value = '';
});

// 📸 5. Live Present Camera Capture Stream Block
liveCameraBtn.addEventListener('click', async () => {
    try {
        cameraCaptureZone.style.display = 'block';
        captureStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        captureWebcam.srcObject = captureStream;
    } catch(err) {
        alert("Camera permission block! Please allow browser camera access.");
        cameraCaptureZone.style.display = 'none';
    }
});

snapPhotoBtn.addEventListener('click', () => {
    if (captureStream) {
        const context = captureCanvas.getContext('2d');
        captureCanvas.width = captureWebcam.videoWidth || 640;
        captureCanvas.height = captureWebcam.videoHeight || 480;
        context.drawImage(captureWebcam, 0, 0, captureCanvas.width, captureCanvas.height);
        
        const dataUrl = captureCanvas.toDataURL('image/jpeg', 0.7);
        socket.emit('chat-message', { type: 'image', sender: currentUsername, imageData: dataUrl });
        
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
    if(confirm("Delete this message permanently for everyone?")) {
        socket.emit('delete-message', msgId);
    }
}

clearChatButton.addEventListener('click', () => {
    if(confirm("Are you absolutely sure you want to clear the entire chat history?")) {
        socket.emit('clear-all-chat');
    }
});

socket.on('chat-message', (data) => {
    renderMessageInUI(data);
    if (data.sender !== currentUsername) {
        notifSound.play().catch(e => {});
    }
});

socket.on('message-deleted', (msgId) => {
    const el = document.getElementById(msgId);
    if(el) el.remove();
});

socket.on('chat-cleared', () => { chatMessages.innerHTML = ''; });

socket.on('update-status', (data) => {
    let target = (currentUsername === "sanaul") ? "girlfriend" : "sanaul";
    if (data.username === target) {
        partnerStatus.className = 'status-indicator ' + (data.online ? 'online' : 'offline');
        partnerStatus.innerText = data.online ? 'online' : 'offline';
    }
});

// 💾 6. Message Bubble Rendering Layer (With Download Link)
function renderMessageInUI(data) {
    const isMe = data.sender === currentUsername;
    const wrapper = document.createElement('div');
    wrapper.id = data.id;
    wrapper.className = `message-bubble-wrapper ${isMe ? 'sent' : 'received'}`;
    
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message';
    if (data.type === 'text') {
        msgDiv.innerText = `${isMe ? 'You' : 'Partner'}: ${data.text}`;
    } else {
        msgDiv.innerHTML = `
            <strong>${isMe ? 'You' : 'Partner'}:</strong><br>
            <a href="${data.imageData}" download="shared_photo_${Date.now()}.jpg" title="Click to Download Image" style="display:block; text-decoration:none; cursor:pointer;">
                <img src="${data.imageData}" style="max-width:100%; border-radius:12px; margin-top:5px; display:block; border: 2px dashed rgba(255,75,110,0.2);">
                <span style="font-size:0.75rem; display:block; color:#ff4b6e; text-align:right; margin-top:3px; font-weight:bold;">⬇️ Tap to Save Image</span>
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

// 📞 7. WhatsApp Style Call Trigger Management Engine Flow
voiceCallBtn.addEventListener('click', () => triggerOutgoingCall('voice'));
videoCallBtn.addEventListener('click', () => triggerOutgoingCall('video'));

async function triggerOutgoingCall(type) {
    currentCallType = type;
    callOverlay.style.display = 'flex';
    fullscreenCallerTitle.innerText = "Calling Partner...";
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
        if (e.candidate) socket.emit('webrtc-signal', { sender: currentUsername, candidate: e.candidate });
    };
    peerConnection.ontrack = (e) => { remoteVideo.srcObject = e.streams; };

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('webrtc-signal', { sender: currentUsername, offer: offer, callType: type });
    ringtoneSound.play().catch(e => {});
}

async function startMediaTracks(type) {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' });
        localVideo.srcObject = localStream;
    } catch(e) {
                alert("Permissions Access Error! Please turn on browser media access settings.");
        terminateCallEngine();
    }
}

socket.on('webrtc-signal', async (data) => {
    if (data.offer) {
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
            if (e.candidate) socket.emit('webrtc-signal', { sender: currentUsername, candidate: e.candidate });
        };
        peerConnection.ontrack = (e) => { remoteVideo.srcObject = e.streams; };

        await peerConnection.setRemoteDescription(new RTCSessionDescription(window.incomingOfferDetails));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('webrtc-signal', { sender: currentUsername, answer: answer });
        callStatusLabel.innerText = "Connected";
        callActiveSession = true;
    } else {
        socket.emit('call-ended', { sender: currentUsername });
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

