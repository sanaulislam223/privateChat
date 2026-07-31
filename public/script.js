const socket = io();

// HTML Elements ko connect karna
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-btn');
const chatMessages = document.getElementById('chat-messages');
const imageInput = document.getElementById('image-input');
const callButton = document.getElementById('call-btn');
const videoContainer = document.getElementById('video-container');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

let localStream;
let peerConnection;
const config = { iceServers: [{ urls: 'stun:://google.com' }] };

// 1. Text Message Bhejna
sendButton.addEventListener('click', () => {
    const message = messageInput.value.trim();
    if (message) {
        socket.emit('chat-message', { type: 'text', text: message });
        appendMessage('You', message, 'sent');
        messageInput.value = '';
    }
});

// Enter key se bhi message send ho jaye
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendButton.click();
});

// 2. Image Bhejna
imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            socket.emit('chat-message', { type: 'image', imageData: event.target.result });
            appendImage('You', event.target.result, 'sent');
        };
        reader.readAsDataURL(file);
    }
});

// Server se aane wale messages/images ko receive karna
socket.on('chat-message', (data) => {
    if (data.type === 'text') {
        appendMessage('Partner', data.text, 'received');
    } else if (data.type === 'image') {
        appendImage('Partner', data.imageData, 'received');
    }
});

// Screen par Text message jodne ka function
function appendMessage(sender, text, status) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', status);
    msgDiv.innerText = `${sender}: ${text}`;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Screen par Image jodne ka function
function appendImage(sender, src, status) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', status);
    msgDiv.innerHTML = `<strong>${sender}:</strong><br><img src="${src}" style="max-width:200px; border-radius:10px; margin-top:5px;">`;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 3. WebRTC Video Calling Logic
callButton.addEventListener('click', async () => {
    videoContainer.style.display = 'grid';
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;

    peerConnection = new RTCPeerConnection(config);
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    peerConnection.onicecandidate = (e) => {
        if (e.candidate) socket.emit('webrtc-signal', { candidate: e.candidate });
    };

    peerConnection.ontrack = (e) => {
        remoteVideo.srcObject = e.streams[0];
    };

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('webrtc-signal', { offer: offer });
});

socket.on('webrtc-signal', async (data) => {
    if (data.offer) {
        videoContainer.style.display = 'grid';
        if (!localStream) {
            localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localVideo.srcObject = localStream;
        }
        peerConnection = new RTCPeerConnection(config);
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

        peerConnection.onicecandidate = (e) => {
            if (e.candidate) socket.emit('webrtc-signal', { candidate: e.candidate });
        };

        peerConnection.ontrack = (e) => {
            remoteVideo.srcObject = e.streams[0];
        };

        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('webrtc-signal', { answer: answer });
    } else if (data.answer) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    } else if (data.candidate) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
});
