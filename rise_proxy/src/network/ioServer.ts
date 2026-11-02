import { Server, Socket } from 'socket.io';
import { Socket as ClientSocket } from "socket.io-client"
import { TokenManger } from '../util/tokenManger';
import { helper } from '../util/helper';


export class IoServer {
    private httpServer: any
    private io: Server
    constructor(httpServer: any) {
        this.httpServer = httpServer
        this.start()
    }
    private start() {
        helper.log.info('io proxy listening')
        this.io = new Server(this.httpServer, {
            cors: {
                origin: '*',

            },
        });
        this.io.use((socket, next) => {
            const token = socket.handshake.headers['x-auth-token'];
            if (token) {
                socket.handshake.auth = {
                    token,
                }
            }
            return next();

        });
        this.io.on('connection', (socket: Socket) => {
            let userid = TokenManger.check(socket.handshake.auth)
            if (!userid) {
                socket.disconnect()
                return;
            }
            socket.handshake.auth.userid = userid
            this.connGame(socket.handshake.auth)
            helper.proxyServer.proxyScoket.set(userid, socket)
            socket.data.userid = userid
            helper.riseRedis.writeUserServerInfo(helper.redis, userid, { host: helper.config.host, port: helper.config.port })
            socket.on('chatMessage', (msg) => {
                helper.log.info('proxy:', msg.path, new Date());
                if (!helper.proxyServer.userScoket.get(socket.data.userid)) {
                    socket.emit('newMessage', "服务器繁忙");
                    this.connGame(socket.handshake.auth)
                    return
                }
                helper.proxyServer.userScoket.get(socket.data.userid)?.emit("chatMessage", msg)
                // 广播消息给所有客户端（自动推断事件类型）
                // this.io.emit('newMessage', msg);
            });

            // 修改后的 disconnect 处理
            socket.on('disconnect', (reason: string) => {
                helper.log.info(`客户端断开 (ID:${socket.id}), 原因: ${reason}`);
                // 强制关闭客户端连接
                if (socket.connected) {
                    socket.disconnect(true); // true 表示关闭底层连接
                }
                // 清理游戏服务器连接
                if (socket.data?.userid) {
                    helper.riseRedis.deleteUserServerInfo(helper.redis, socket.data?.userid)
                    const gameSocket: ClientSocket | undefined = helper.proxyServer.userScoket.get(socket.data?.userid);
                    if (!gameSocket) {
                        return
                    }
                    // 先移除所有事件监听器防止内存泄漏
                    gameSocket.removeAllListeners();
                    // 关闭游戏服务器连接
                    if (gameSocket.connected) {
                        gameSocket.offAny();
                        gameSocket.close(); // 比 disconnect() 更彻底
                    }
                    // 释放引用
                    delete socket.data.gameSocket;
                }
            });
        });
    }

    /**
     * 尝试连接游戏服务器
     * @returns 
     */
    private connGame(auth: any) {
        try {
            let servicelist = helper.serviceRecord.getGameService()
            helper.proxyServer.conn(servicelist, auth)
        } catch (error) {
            helper.log.error(error)
            return undefined
        }
    }


}