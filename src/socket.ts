import { Server } from 'socket.io';

let _io: Server | null = null;

export function initSocket(server: any): Server {
    _io = new Server(server, {
        cors: { origin: '*' },
        pingTimeout: 60000,      // 60s before declaring disconnect
        pingInterval: 25000,     // ping every 25s
        transports: ['polling', 'websocket'],
    });
    return _io;
}

export function emitToRoom(room: string, event: string, data: any): void {
    _io?.to(room).emit(event, data);
}
