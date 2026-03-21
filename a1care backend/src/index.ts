import dotenv from 'dotenv'
import app from './app.js'
import { connectDb } from "./configs/db.js";
import { initFCM } from "./configs/fcmConfig.js";
import http from 'http';
import { Server } from 'socket.io';
import { saveChatMessage } from './modules/Chat/chat.controller.js';

dotenv.config();

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    socket.on('join_room', (roomId) => {
        socket.join(roomId);
        console.log(`[Socket] Room joined: ${roomId}`);
    });

    socket.on('send_message', async (data) => {
        // 1. Persist to DB
        await saveChatMessage(data);

        // 2. Broadcast to target room
        socket.to(data.roomId).emit('receive_message', data);
    });

    socket.on('update_location', (data) => {
        // Broadcast location to booking room so user can track live
        // data: { roomId: bookingId, latitude, longitude, heading }
        socket.to(data.roomId).emit('location_update', data);
    });

    socket.on('disconnect', () => {
        console.log(`[Socket] Disconnected: ${socket.id}`);
    });
});

const startServer = async () => {
    try {
        await connectDb();
        await initFCM();
        server.listen(process.env.PORT || 3000, () => {
            console.log(`Server (Socket enabled) running on port ${process.env.PORT || 3000}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};

startServer();