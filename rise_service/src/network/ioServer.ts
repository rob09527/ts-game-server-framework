
import { Server, Socket } from 'socket.io';
import { helper } from '../util/helper';
import { MessageReg } from '../ouroboros/messageReg';
import { UserMongoModel } from '../mongo/schema/user/userSchema';
import { TokenManger } from '../util/tokenManger';


export class IoServer {
    private httpServer: any
    private io: Server
    constructor(httpServer: any) {
        this.httpServer = httpServer
        this.start()
    }
    private start() {
        helper.log.info('io game listening')
        this.io = new Server(this.httpServer, {
            cors: {
                origin: "*",  // 精确匹配客户端地址
            }
        });
        // 服务端代码
        this.io.use((socket, next) => {
            const token = socket.handshake.headers['x-auth-token'];
            if (token) {
                socket.handshake.auth = {
                    token,
                }
            }
            return next();

        });
        this.io.on('connection', async (socket: Socket) => {
            // 获取默认命名空间的总连接数
            const totalConnections = this.io.of("/").sockets.size;
            // 包含所有命名空间的全局统计
            let globalCount = 0;
            this.io._nsps.forEach(nsp => {
                globalCount += nsp.sockets.size;
            });
            if (socket.handshake.auth.sysname) {
                helper.connMg.serviceReg(socket, socket.handshake.auth)

            } else {
                let userid = TokenManger.check(socket.handshake.auth)
                if (userid) {
                    let cache = helper.connMg.get(userid)
                    if (cache) {
                        helper.connMg.close(cache)
                    }
                    socket.data.userid = userid
                    let user = await UserMongoModel.userInfo(userid)
                    socket.emit('login', { userid: userid, success: true, user: user })
                    helper.connMg.set(userid, socket)
                    helper.log.info("全局连接数:", globalCount, socket.id, socket.handshake.auth.userid);
                } else if (!userid) {
                    // socket.emit('login', { userid: socket.handshake.auth.userid, success: false, })
                    socket.disconnect()
                }
            }


            // 监听客户端发送的消息（类型安全）
            socket.on('chatMessage', async (msg) => {
                helper.log.info('game chatMessage:', msg, new Date());
                MessageReg.clientMsg(socket, msg)
            });

            // 断开连接处理
            socket.on('disconnect', () => {
                helper.connMg.serviceDel(socket)
                helper.log.info('客户端断开:', socket.id);
            });
            socket.on('error', (error) => {
                helper.log.error('客户端异常:', error);
            });
        });
        this.io.engine.on("connection_error", (err) => {
            helper.log.error(`Engine.IO错误: ${err.message}`);
            helper.log.error(`错误上下文: ${err.context}`);
        });
    }





}