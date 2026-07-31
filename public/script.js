// Isse browser automatic usi domain aur protocol (HTTPS) ko target karega jahan website live hai
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

const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-btn');
const chatMessages = document.getElementById('chat-messages');
const imageInput = document.getElementById('image-input');
const userDisplay = document.getElementById('user-display');

let currentUsername = "";

// 🔒 LOGIN VALIDATION (Yahan aap apna Password change kar sakte hain)
loginButton.addEventListener('click', () => {
    const user = usernameInput.value.trim();
    const pass = passwordInput.value.trim();

    // Aap dono ke fixed username/password (Aap ise badal sakte hain)
    if ((user === "sanaul" && pass === "love123") || (user === "girlfriend" && pass === "love123")) {
        currentUsername = user;
        userDisplay.innerText = `💖 Hi ${user}`;
        loginBox.style.display = 'none';
        chatBox.style.display = 'flex'; // Chat screen khul jayegi
    } else {
        loginError.style.display = 'block';
    }
});

// 📩 MESSAGE DELIVERY
sendButton.addEventListener('click', () => {
    const message = messageInput.value.trim();
    if (message) {
        // Server ko sender ke naam ke sath message bhejna
        socket.emit('chat-message', { type: 'text', sender: currentUsername, text: message });
        messageInput.value = '';
    }
});

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendButton.click();
});

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

// Server se aane wale messages ko sahi side fit karna
socket.on('chat-message', (data) => {
    const status = (data.sender === currentUsername) ? 'sent' : 'received';
    const displayName = (data.sender === currentUsername) ? 'You' : data.sender;

    if (data.type === 'text') {
        appendMessage(displayName, data.text, status);
    } else if (data.type === 'image') {
        appendImage(displayName, data.imageData, status);
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
