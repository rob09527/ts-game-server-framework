import { ServiceResume, ServiceRouter } from 'rise_util/lib/src/envelope/serviceResumeEnvelope';
import { helper } from '../util/helper';
import _ from 'lodash';
import { io as clientIO, Socket as ClientSocket } from "socket.io-client"
import { Socket } from 'socket.io';
export class ProxyServer {
    //proxy 和游戏服务器之间的连接
    public userScoket: Map<number, ClientSocket> = new Map()
    //服务器之间的连接
    public serviceScoket: Map<string, ClientSocket> = new Map()
    //代理和玩家之间的连接
    public proxyScoket: Map<number, Socket> = new Map()

    public conn(serviceList: Array<ServiceResume>, auth: { userid: number, token: string, [key: string]: any; }) {
        let service: ServiceResume | undefined = _.sample(serviceList)
        if (_.isNil(service)) {
            return undefined
        }

        let gameServerSocket: ClientSocket & { userid?: number, serviceKey?: string } = clientIO(`ws://${service.host}:${service.port}`, {
            reconnection: true,
            transports: ["websocket"],
            auth
        });
        gameServerSocket.userid = auth.userid
        gameServerSocket.on("game_push", (msg: { userId: string; content: string }) => {
            helper.log.info(msg)
        });

        gameServerSocket.on("game_broadcast", (msg: { content: string }) => {
            helper.log.info(msg)
        });
        gameServerSocket.on("login", (msg: { userid: number, success: boolean }) => {
            if (msg.success) {
                this.userScoket.set(msg.userid, gameServerSocket)
                this.proxyScoket.get(msg.userid)?.emit('login', msg);
                helper.log.info(msg.userid, '登陆验证建立成功')
            } else {
                this.proxyScoket.get(msg.userid)?.emit('login', "登陆失败");
                this.proxyScoket.get(msg.userid)?.disconnect(true)
                helper.log.info(msg.userid, '登陆验证建立失败')
            }

        });

        gameServerSocket.on("sysReg", (msg: { host: string, port: number }) => {
            //系统注册
            const key = `${msg.host}:${msg.port}`
            gameServerSocket.serviceKey = key
            this.serviceScoket.set(key, gameServerSocket)
        });


        gameServerSocket.on("game_broadcast", (msg: { content: string }) => {
            helper.log.info(msg)
        });

        gameServerSocket.on('connect_error', (err) => {
            helper.log.error(err)
        });

        gameServerSocket.on('connect', () => {
            helper.log.info("连接成功")

        });
        gameServerSocket.on('error', (error) => {
            helper.log.error(error)
            if (gameServerSocket.userid) {
                this.proxyScoket.get(gameServerSocket.userid)?.emit("error", error);
            }
        });
        // 监听断开事件
        gameServerSocket.on('disconnect', async (reason) => {
            if (gameServerSocket.userid) {
                this.userScoket.delete(gameServerSocket.userid)
            }
            if (gameServerSocket.serviceKey) {
                this.serviceScoket.delete(gameServerSocket.serviceKey)
                let list = gameServerSocket.serviceKey.split(':')
                helper.riseRedis.deleteServerInfo(helper.redis, ServiceRouter['game'], { host: list[0], port: Number(list[1]) })
            }
            helper.log.info("断开链接")
        });

        // 监听自定义消息事件
        gameServerSocket.on('gameMsg', (msg) => {
            console.log(gameServerSocket.auth)
            if (gameServerSocket.userid) {
                this.proxyScoket.get(gameServerSocket.userid)?.emit(msg.path, msg);
            }
        });

        /**
         * 系统通道
         */
        gameServerSocket.on('gameMsgGm', (msg) => {
            if (msg.userid) {
                this.proxyScoket.get(msg.userid)?.emit(msg.path, msg);
            }
        });
        // 初始化时配置断开策略

    }

}