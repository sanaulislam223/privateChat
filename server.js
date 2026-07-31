const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: { origin: "*" }
});

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('Ek user connect hua:', socket.id);

    // Jab koi message bheje, toh server use SABHI ko deliver karega
    socket.on('chat-message', (data) => {
        io.emit('chat-message', data); 
    });

    socket.on('webrtc-signal', (data) => {
        socket.broadcast.emit('webrtc-signal', data);
    });

    socket.on('disconnect', () => {
        console.log('User disconnect hua:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
