import dotenv from 'dotenv'
dotenv.config();

import app from './app.js'
import { connectDb } from "./configs/db.js";
import { initFCM } from "./configs/fcmConfig.js";
import http from 'http';
import jwt from 'jsonwebtoken';
import { initSocket } from './socket.js';
import { saveChatMessage } from './modules/Chat/chat.controller.js';
import { runSubscriptionCleanup } from './jobs/subscriptionCleaner.js';

const server = http.createServer(app);
const io = initSocket(server);

// Authenticate every socket connection with the same JWT used for HTTP.
io.use((socket, next) => {
    const token = (socket.handshake.auth?.token || socket.handshake.query?.token) as string | undefined;
    if (!token) return next(new Error("Unauthorized"));
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
        (socket as any).userId = decoded.userId ?? decoded.staffId;
        (socket as any).userRole = decoded.userId ? 'Patient' : 'Staff';
        if (!(socket as any).userId) return next(new Error("Unauthorized"));
        next();
    } catch {
        next(new Error("Unauthorized"));
    }
});

io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    socket.on('join_room', (roomId) => {
        socket.join(roomId);
        console.log(`[Socket] Room joined: ${roomId}`);
    });

    socket.on('send_message', async (data) => {
        // Identity comes from the verified socket, never from the client payload —
        // and senderType must match the ChatMessage enum ["Patient","Partner"].
        const verified = {
            ...data,
            senderId: (socket as any).userId,
            senderType: (socket as any).userRole === 'Patient' ? 'Patient' : 'Partner',
        };
        await saveChatMessage(verified);
        socket.to(data.roomId).emit('receive_message', verified);
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
        
        // Background Jobs
        await runSubscriptionCleanup();
        setInterval(runSubscriptionCleanup, 3600 * 1000); // Every Hour

        server.listen(Number(process.env.PORT) || 3000, '0.0.0.0', () => {
            console.log(`Server (Socket enabled) running on 0.0.0.0:${process.env.PORT || 3000}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};

startServer();