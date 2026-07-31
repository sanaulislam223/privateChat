const socket = io({
    transports: ['websocket', 'polling']
});

// Elements
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
const notifSound = document.getElementById('notif-sound');
const ringtoneSound = document.getElementById('ringtone-sound');

// Calling Elements
const callButton = document.getElementById('call-btn');
const videoContainer = document.getElementById('video-container');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const incomingCallModal = document.getElementById('incoming-call-modal');
const acceptCallBtn = document.getElementById('accept-call-btn');
const rejectCallBtn = document.getElementById('reject-call-btn');
const callerNameDisplay = document.getElementById('caller-name');

let currentUsername = "";
let localStream;
let peerConnection;
let savedOfferSignal = null;
const config = { iceServers: [{ urls: 'stun:://google.com' }] };

// 🔄 Auto Login Session
window.addEventListener('load', () => {
    const savedUser = localStorage.getItem('chat_username');
    if (savedUser) {
        startChatSession(savedUser);
    }
});

function startChatSession(user) {
    currentUsername = user;
    userDisplay.innerText = `💖 Hi ${user}`;
    loginBox.style.display = 'none';
    chatBox.style.display = 'flex';
    socket.emit('register-user', user);
}

// 🔒 Login
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

// 🚪 Logout
logoutButton.addEventListener('click', () => {
    localStorage.removeItem('chat_username');
    window.location.reload();
});

// 📩 Send text
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

// 📷 Send Image
imageInput.addEventListener('change', (e) => {
    const file = e.target.files;
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            socket.emit('chat-message', { type: 'image', sender: currentUsername, imageData: event.target.result });
        };
        reader.readAsDataURL(file);
    }
});

// Receive chat data
socket.on('chat-message', (data) => {
    const status = (data.sender === currentUsername) ? 'sent' : 'received';
    const displayName = (data.sender === currentUsername) ? 'You' : data.sender;

    if (data.type === 'text') {
        appendMessage(displayName, data.text, status);
    } else if (data.type === 'image') {
        appendImage(displayName, data.imageData, status);
    }

    if (data.sender !== currentUsername) {
        notifSound.play().catch(e => console.log("Sound block bypass."));
    }
});

function appendMessage(sender, text, status) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', status);
    msgDiv.innerText = `${sender}: ${text}`;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function appendImage(sender, src, status) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', status);
    msgDiv.innerHTML = `<strong>${sender}:</strong><br><img src="${src}" style="max-width:200px; border-radius:10px; margin-top:5px;">`;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 📞 WebRTC Video Call Core Logic
async function initWebRTC(isCaller) {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;
        videoContainer.style.display = 'grid';

        peerConnection = new RTCPeerConnection(config);
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

        peerConnection.onicecandidate = (e) => {
            if (e.candidate) socket.emit('webrtc-signal', { sender: currentUsername, candidate: e.candidate });
        };

        peerConnection.ontrack = (e) => {
            remoteVideo.srcObject = e.streams;
        };

        if (isCaller) {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            socket.emit('webrtc-signal', { sender: currentUsername, offer: offer });
        }
    } catch (err) {
        alert("Camera & Mic settings allow karna mandatory hai!");
    }
}

callButton.addEventListener('click', () => {
    initWebRTC(true);
});

// Incoming Call Signal Handling (With Custom Display Alert Modal)
socket.on('webrtc-signal', async (data) => {
    if (data.offer) {
        savedOfferSignal = data.offer;
        callerNameDisplay.innerText = `${data.sender.toUpperCase()} is video calling you...`;
        incomingCallModal.style.display = 'flex'; // Custom Pop-up display show karein
        ringtoneSound.play().catch(e => console.log("Ringtone interactive delay."));
    } else if (data.answer) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    } else if (data.candidate) {
        try {
            if (peerConnection) {
                await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
            }
        } catch (e) {
            console.error(e);
        }
    }
});

// Accept Button Click Logic
acceptCallBtn.addEventListener('click', async () => {
    incomingCallModal.style.display = 'none';
    ringtoneSound.pause();
    ringtoneSound.currentTime = 0;
    
    if (savedOfferSignal) {
        await initWebRTC(false);
        await peerConnection.setRemoteDescription(new RTCSessionDescription(savedOfferSignal));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('webrtc-signal', { sender: currentUsername, answer: answer });
    }
});

// Reject Button Click Logic
rejectCallBtn.addEventListener('click', () => {
    incomingCallModal.style.display = 'none';
    ringtoneSound.pause();
    ringtoneSound.currentTime = 0;
    savedOfferSignal = null;
    socket.emit('chat-message', { type: 'text', sender: currentUsername, text: '🚫 Call Declined/Missed' });
});
