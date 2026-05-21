import { Server } from 'socket.io';

let _io: Server | null = null;

export function initSocket(server: any): Server {
    _io = new Server(server, { cors: { origin: '*' } });
    return _io;
}

export function emitToRoom(room: string, event: string, data: any): void {
    _io?.to(room).emit(event, data);
}
