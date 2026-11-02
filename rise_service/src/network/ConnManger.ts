import { Socket } from 'socket.io';
import { helper } from '../util/helper';

export class connManger {
    private userScoket: Map<number, Socket> = new Map()
    private serviceScoket: Map<string, Socket> = new Map()
    public close(gameSocket: Socket) {
        gameSocket.removeAllListeners();
        // 关闭游戏服务器连接
        if (gameSocket.connected) {
            gameSocket.offAny();
            gameSocket.disconnect();
        }
    }
    public get(userid: number): Socket | undefined {
        return this.userScoket.get(userid)
    }
    public set(userid: number, gameSocket: Socket) {
        this.userScoket.set(userid, gameSocket)
    }
    public serviceReg(socket: Socket, auth: any) {
        const key = `${auth.host}:${auth.port}`
        socket.data.sysKey = key
        socket.emit('sysReg', { host: helper.config.host, port: helper.config.port })
        this.serviceScoket.set(key, socket)
    }
    public serviceDel(socket: Socket) {
        socket.data.sysKey ?? this.serviceScoket.delete(socket.data.sysKey)
    }
    /**
     * 获取proxy连接
     * @param key 
     * @returns 
     */
    public getProxyConn(key: string) {
        return this.serviceScoket.get(key)

    }
}
