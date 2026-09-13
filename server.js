const express = require('express');
const app = express();
const http = require('http').createServer(app);

const io = require('socket.io')(http, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    maxHttpBufferSize: 50e6, // 50MB image capacity size buffer rule
    transports: ['websocket', 'polling']
});

app.use(express.static('public'));

let onlineUsers = {}; // { username: socketId }
let personalChats = {}; // { "user1-user2": [ messages ] }

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('register-user', (username) => {
        onlineUsers[username] = socket.id;
        io.emit('update-user-list', Object.keys(onlineUsers));
    });

    socket.on('get-chat-history', ({ sender, receiver }) => {
        const room = [sender, receiver].sort().join('-');
        const history = personalChats[room] || [];
        socket.emit('load-history', history);
    });

    socket.on('private-message', (data) => {
        const room = [data.sender, data.receiver].sort().join('-');
        if (!personalChats[room]) personalChats[room] = [];
        
        data.id = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
        personalChats[room].push(data);

        socket.emit('chat-message', data);
        const receiverSocketId = onlineUsers[data.receiver];
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('chat-message', data);
        }
    });

    socket.on('delete-message', ({ msgId, sender, receiver }) => {
        const room = [sender, receiver].sort().join('-');
        if (personalChats[room]) {
            personalChats[room] = personalChats[room].filter(msg => msg.id !== msgId);
        }
        socket.emit('message-deleted', msgId);
        const receiverSocketId = onlineUsers[receiver];
        if (receiverSocketId) io.to(receiverSocketId).emit('message-deleted', msgId);
    });

    socket.on('webrtc-signal', (data) => {
        const receiverSocketId = onlineUsers[data.receiver];
        if (receiverSocketId) io.to(receiverSocketId).emit('webrtc-signal', data);
    });

    socket.on('call-ended', (data) => {
        const receiverSocketId = onlineUsers[data.receiver];
        if (receiverSocketId) io.to(receiverSocketId).emit('call-ended', data);
    });

    socket.on('disconnect', () => {
        for (let username in onlineUsers) {
            if (onlineUsers[username] === socket.id) {
                delete onlineUsers[username];
                io.emit('update-user-list', Object.keys(onlineUsers));
                break;
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
