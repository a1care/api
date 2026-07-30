import { Server } from 'socket.io';

let _io: Server | null = null;

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

        socket.on('disconnect', (reason) => {
            console.log(`[Socket] Client disconnected: ${socket.id} - ${reason}`);
        });
    });

    return _io;
}

export function emitToRoom(room: string, event: string, data: any): void {
    _io?.to(room).emit(event, data);
}
