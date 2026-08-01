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

// Fullscreen Overlays UI Elements
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
let peerConnection = null;
let currentCallType = null;
let callActiveSession = false;
let isMuted = false;
let isCamOff = false;

const config = { iceServers: [{ urls: 'stun:://google.com' }] };

window.addEventListener('load', () => {
    const savedUser = localStorage.getItem('chat_username');
    if (savedUser) startChatSession(savedUser);
});

function startChatSession(user) {
    currentUsername = user;
    userDisplay.innerText = `💖 ${user === 'sanaul' ? 'Sanaul' : 'Partner'}`;
    loginBox.style.display = 'none';
    chatBox.style.display = 'flex';
    socket.emit('register-user', user);
}

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

logoutButton.addEventListener('click', () => {
    localStorage.removeItem('chat_username');
    window.location.reload();
});

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

function renderMessageInUI(data) {
    const isMe = data.sender === currentUsername;
    const wrapper = document.createElement('div');
    wrapper.id = data.id;
    wrapper.className = `message-bubble-wrapper ${isMe ? 'sent' : 'received'}`;
    
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message';
    if (data.type === 'text') {
        msgDiv.innerText = `${isMe ? 'You' : data.sender}: ${data.text}`;
    } else {
        msgDiv.innerHTML = `<strong>${isMe ? 'You' : data.sender}:</strong><br><img src="${data.imageData}" style="max-width:100%; border-radius:12px; margin-top:5px; display:block;">`;
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

// 📞 Voice & Video Call Trigger Management
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
        alert("Permissions access error! Please check browser media access permissions.");
        terminateCallEngine();
    }
}

socket.on('webrtc-signal', async (data) => {
    if (data.offer) {
        currentCallType = data.callType;
        callOverlay.style.display = 'flex';
        fullscreenCallerTitle.innerText = data.sender.toUpperCase();
        callStatusLabel.innerText = `Incoming ${data.callType} call...`;
        endCallBtn.className = "control-circle active-green"; // Receive karne ke liye green button
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

// FIX: Call Cut karne aur receive karne ka solid fix
endCallBtn.addEventListener('click', async () => {
    if (!callActiveSession && endCallBtn.classList.contains('active-green')) {
        // Agar call aa rahi hai aur green dabaya toh connect karein
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
