
import { Server, Socket } from 'socket.io';
import { helper } from '../util/helper';

export class IoServer {
    private httpServer: any
    private io: Server
    constructor(httpServer: any) {
        this.httpServer = httpServer
        this.start()
    }
    private start() {
        helper.log.info('io queue listening')
        this.io = new Server(this.httpServer, {
            cors: {
                origin: '*',
            },
        });
        this.io.on('connection', (socket: Socket) => {
            console.log('客户端已连接:', socket.id);
            // 监听客户端发送的消息（类型安全）
            socket.on('chatMessage', (msg) => {
                console.log('收到消息queue:', msg);
                // 广播消息给所有客户端（自动推断事件类型）
                this.io.emit('newMessage-queue:', msg);
            });

            // 断开连接处理
            socket.on('disconnect', () => {
                console.log('客户端断开:', socket.id);
            });
        });
    }

}