import { Socket } from 'socket.io';
import { UserMongoModel } from '../../mongo/schema/user/userSchema';
import { MsgClient, MessageReg } from '../messageReg';
import { NetworkStatusCode } from 'rise_util/lib/src/enum/networkStatusCode';
export class UserService {
    /**
     * 选择一份职业
     */
    public static async chooseACareer(socket: Socket, msg: MsgClient) {
        let user = await UserMongoModel.userInfo(Number(socket.data.userid))
        if (!user) {
            return;
        }
        if (!user.career) {
            await UserMongoModel.createCareer(socket.data.userid, msg.data.career)
            user = await UserMongoModel.userInfo(Number(socket.data.userid))
        }
        MessageReg.sendMsg(socket, { path: msg.path, code: NetworkStatusCode.SUCCESS, data: user, userid: socket.data.userid })
    }


}