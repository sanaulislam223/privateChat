const socket = io({
    transports: ['websocket', 'polling']
});

// UI Elements
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

let currentUsername = "";
let localStream;
let peerConnection;
const config = { iceServers: [{ urls: 'stun:://google.com' }] };

// 🔄 REFRESH FIXED (Baar-baar login nahi mangega jab tak khud logout na karein)
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
}

// 🔒 LOGIN
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

// 🚪 LOGOUT (Sirf aapke click karne par hi logout hoga)
logoutButton.addEventListener('click', () => {
    localStorage.removeItem('chat_username');
    window.location.reload();
});

// 📩 SEND MESSAGE
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

// 📷 SEND IMAGE
imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            socket.emit('chat-message', { type: 'image', sender: currentUsername, imageData: event.target.result });
        };
        reader.readAsDataURL(file);
    }
});

// 📥 RECEIVE DATA AND SOUND ALERT
socket.on('chat-message', (data) => {
    const status = (data.sender === currentUsername) ? 'sent' : 'received';
    const displayName = (data.sender === currentUsername) ? 'You' : data.sender;

    if (data.type === 'text') {
        appendMessage(displayName, data.text, status);
    } else if (data.type === 'image') {
        appendImage(displayName, data.imageData, status);
    }

    // Alert Sound Alert for incoming messages
    if (data.sender !== currentUsername) {
        notifSound.play().catch(e => console.log("Sound play interaction rule block."));
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

// 📞 WEBRTC VIDEO CALLING INTEGRATION
const callButton = document.getElementById('call-btn');
const videoContainer = document.getElementById('video-container');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

async function initWebRTC(isCaller) {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;
        videoContainer.style.display = 'grid';

        peerConnection = new RTCPeerConnection(config);
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

        peerConnection.onicecandidate = (e) => {
            if (e.candidate) socket.emit('webrtc-signal', { candidate: e.candidate });
        };

        peerConnection.ontrack = (e) => {
            remoteVideo.srcObject = e.streams[0];
        };

        if (isCaller) {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            socket.emit('webrtc-signal', { offer: offer });
        }
    } catch (err) {
        alert("Video Calling ke liye Camera aur Microphone Permission 'Allow' karna compulsory hai!");
    }
}

callButton.addEventListener('click', () => {
    initWebRTC(true);
});

socket.on('webrtc-signal', async (data) => {
    if (data.offer) {
        const acceptCall = confirm("Partner is video calling you. Do you want to answer?");
        if (acceptCall) {
            await initWebRTC(false);
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            socket.emit('webrtc-signal', { answer: answer });
        }
    } else if (data.answer) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    } else if (data.candidate) {
        try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
            console.error(e);
        }
    }
});
