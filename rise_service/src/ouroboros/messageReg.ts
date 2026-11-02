import { Socket } from 'socket.io';
import { ClientMsgMp, ServiceMsgMp } from './protocol';

import { NetworkStatusCode } from 'rise_util/lib/src/enum/networkStatusCode';
import { helper } from '../util/helper';

export interface MsgClient {
    path: string,
    data: any
}
export interface MsgService {
    path: string,
    code: Number,
    userid: number,
    msg?: string,
    data?: any
}
export class MessageReg {
    //服务器之间的通信

    public static async clientMsg(socket: Socket, msg: MsgClient) {

        if (!ClientMsgMp[msg.path]) {
            this.sendError(socket, { path: msg.path, code: NetworkStatusCode.UNKNOWN_ERROR, msg: "error protocol", userid: socket.data.userid })
            return;
        }

        ClientMsgMp[msg.path](socket, msg)
    }
    /**
     * 给本服务上面的某一个玩家发送消息
     * @param socket 
     * @param data 
     */
    public static sendMsg(socket: Socket, data: MsgService) {
        data.path = ServiceMsgMp[data.path]
        socket.emit('gameMsg', data)
    }
    public static sendError(socket: Socket, data: MsgService) {
        data.path = ServiceMsgMp[data.path]
        socket.emit('error', data)
    }
    //给全服某一个玩家发送消息
    public static async gameMsg(data: MsgService) {
        const service = await helper.riseRedis.getUserServerInfo(helper.redis, String(data.userid))
        if (service) {
            const key = `${service.host}:${service.port}`
            let serviceSocket = helper.connMg.getProxyConn(key)
            if (serviceSocket) {
                serviceSocket.emit('gameMsgGm', data)
            }
        }

    }

}