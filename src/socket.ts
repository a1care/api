import { Server } from 'socket.io';

let _io: Server | null = null;

// Track which booking rooms each socket is actively streaming location to.
// Used to emit provider_disconnected when a partner's socket drops.
const socketTrackingRooms = new Map<string, Set<string>>();

export function initSocket(server: any): Server {
    _io = new Server(server, {
        cors: { origin: '*' },
        pingTimeout: 60000,      // 60s before declaring disconnect
        pingInterval: 25000,     // ping every 25s
        transports: ['polling', 'websocket'],
    });

    _io.on('connection', (socket) => {
        console.log(`[Socket] Client connected: ${socket.id}`);

        // Join personal user room and/or booking chat room
        socket.on('join_room', (roomId: string) => {
            if (roomId) {
                socket.join(roomId);
                console.log(`[Socket] ${socket.id} joined room: ${roomId}`);
            }
        });

        // Leave room
        socket.on('leave_room', (roomId: string) => {
            if (roomId) {
                socket.leave(roomId);
                console.log(`[Socket] ${socket.id} left room: ${roomId}`);
            }
        });

        // Relay live tracking location from partner to customer
        socket.on('update_location', (data: any) => {
            const { roomId, latitude, longitude, heading, speed } = data;
            if (roomId) {
                socket.to(roomId).emit('location_update', { latitude, longitude, heading, speed });
                // Record that this socket is streaming location to this room
                if (!socketTrackingRooms.has(socket.id)) {
                    socketTrackingRooms.set(socket.id, new Set());
                }
                socketTrackingRooms.get(socket.id)!.add(roomId);
            }
        });

        socket.on('disconnect', (reason) => {
            console.log(`[Socket] Client disconnected: ${socket.id} - ${reason}`);
            // Notify any booking rooms this partner was streaming to
            const rooms = socketTrackingRooms.get(socket.id);
            if (rooms && _io) {
                for (const roomId of rooms) {
                    _io.to(roomId).emit('provider_disconnected', { roomId });
                }
            }
            socketTrackingRooms.delete(socket.id);
        });
    });

    return _io;
}

export function emitToRoom(room: string, event: string, data: any): void {
    _io?.to(room).emit(event, data);
}
