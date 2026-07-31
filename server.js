const express = require('express');
const app = express();
const http = require('http').createServer(app);

// CORS Policy ko poori tarah open karne ke liye yeh configuration zaroori hai
const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling']
});

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('chat-message', (data) => {
        io.emit('chat-message', data); 
    });

    socket.on('webrtc-signal', (data) => {
        socket.broadcast.emit('webrtc-signal', data);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
