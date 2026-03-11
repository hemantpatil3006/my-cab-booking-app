import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

class SocketService {
    private static instance: Socket | null = null;
    private static currentUserId: string | null = null;
    private static currentRole: string | null = null;

    static getInstance(): Socket {
        if (!this.instance) {
            this.instance = io(SOCKET_URL, {
                withCredentials: true,
                autoConnect: false,
                transports: ['websocket'],
            });

            this.instance.on('connect', () => {
                console.log('Socket connected:', this.instance?.id);
                if (this.currentUserId) {
                    this.instance?.emit('join', this.currentUserId);
                    console.log('Re-joined room automatically:', this.currentUserId);
                }
                if (this.currentRole) {
                    this.instance?.emit('join-role', this.currentRole);
                    console.log('Re-joined role room automatically:', this.currentRole);
                }
            });

            this.instance.on('connect_error', (err) => {
                console.error('Socket connection error:', err);
            });
        }
        return this.instance;
    }

    static connect(userId: string, role?: string) {
        this.currentUserId = userId;
        if (role) {
            this.currentRole = role;
        }

        const socket = this.getInstance();
        if (!socket.connected) {
            socket.connect();
        } else {
            // If already connected but need to sync room
            socket.emit('join', userId);
            if (role) {
                socket.emit('join-role', role);
            }
        }
    }

    static disconnect() {
        if (this.instance) {
            this.instance.disconnect();
            this.instance = null;
            this.currentUserId = null;
            this.currentRole = null;
        }
    }
}

export default SocketService;
