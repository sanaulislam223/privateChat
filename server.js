const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    maxHttpBufferSize: 50e6,
    transports: ['websocket', 'polling']
});

app.use(express.static('public'));

let onlineUsers = {};
let chatHistory = []; // Server layer data persistence memory pool

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Connection banne par saved history fetch karna
    socket.emit('load-history', chatHistory);

    socket.on('register-user', (username) => {
        onlineUsers[username] = socket.id;
        io.emit('update-status', { username, online: true });
    });

    socket.on('chat-message', (data) => {
        // Unique random identification index tag data block
        data.id = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
        chatHistory.push(data);
        io.emit('chat-message', data);
    });

    socket.on('delete-message', (msgId) => {
        chatHistory = chatHistory.filter(msg => msg.id !== msgId);
        io.emit('message-deleted', msgId);
    });

    socket.on('clear-all-chat', () => {
        chatHistory = [];
        io.emit('chat-cleared');
    });

    socket.on('webrtc-signal', (data) => {
        let targetUser = (data.sender === "sanaul") ? "girlfriend" : "sanaul";
        let targetSocketId = onlineUsers[targetUser];
        if (targetSocketId) {
            io.to(targetSocketId).emit('webrtc-signal', data);
        } else {
            socket.broadcast.emit('webrtc-signal', data);
        }
    });

    socket.on('call-ended', (data) => {
        let targetUser = (data.sender === "sanaul") ? "girlfriend" : "sanaul";
        let targetSocketId = onlineUsers[targetUser];
        if (targetSocketId) {
            io.to(targetSocketId).emit('call-ended', data);
        } else {
            socket.broadcast.emit('call-ended', data);
        }
    });

    socket.on('disconnect', () => {
        for (let username in onlineUsers) {
            if (onlineUsers[username] === socket.id) {
                io.emit('update-status', { username, online: false });
                delete onlineUsers[username];
                break;
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    maxHttpBufferSize: 50e6,
    transports: ['websocket', 'polling']
});

app.use(express.static('public'));

let onlineUsers = {};
let chatHistory = []; // Server layer data persistence memory pool

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Connection banne par saved history fetch karna
    socket.emit('load-history', chatHistory);

    socket.on('register-user', (username) => {
        onlineUsers[username] = socket.id;
        io.emit('update-status', { username, online: true });
    });

    socket.on('chat-message', (data) => {
        // Unique random identification index tag data block
        data.id = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
        chatHistory.push(data);
        io.emit('chat-message', data);
    });

    socket.on('delete-message', (msgId) => {
        chatHistory = chatHistory.filter(msg => msg.id !== msgId);
        io.emit('message-deleted', msgId);
    });

    socket.on('clear-all-chat', () => {
        chatHistory = [];
        io.emit('chat-cleared');
    });

    socket.on('webrtc-signal', (data) => {
        let targetUser = (data.sender === "sanaul") ? "girlfriend" : "sanaul";
        let targetSocketId = onlineUsers[targetUser];
        if (targetSocketId) {
            io.to(targetSocketId).emit('webrtc-signal', data);
        } else {
            socket.broadcast.emit('webrtc-signal', data);
        }
    });

    socket.on('call-ended', (data) => {
        let targetUser = (data.sender === "sanaul") ? "girlfriend" : "sanaul";
        let targetSocketId = onlineUsers[targetUser];
        if (targetSocketId) {
            io.to(targetSocketId).emit('call-ended', data);
        } else {
            socket.broadcast.emit('call-ended', data);
        }
    });

    socket.on('disconnect', () => {
        for (let username in onlineUsers) {
            if (onlineUsers[username] === socket.id) {
                io.emit('update-status', { username, online: false });
                delete onlineUsers[username];
                break;
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
