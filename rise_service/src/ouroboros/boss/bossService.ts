import { helper } from '../../util/helper';
import { Socket } from 'socket.io';
import { MessageReg, MsgService, MsgClient } from '../messageReg';
import { NetworkStatusCode } from 'rise_util/lib/src/enum/networkStatusCode';
import { UserMongoModel } from '../../mongo/schema/user/userSchema';
import { RoomType, RoomStatus } from '../../util/roundRoomManager';
import _ from 'lodash';
import { Battle } from '../../sekiro/sekiro';



export class BoosService {
    /**
     * 选择一个boss进行攻击
     */
    public static async chooseBoos(socket: Socket, msg: MsgClient) {
        let riseconfig: any[] = helper.xlsx.rise.boss
        let careerinfo = riseconfig.find(e => e.id == msg.data.boss)
        let user = await UserMongoModel.userInfo(Number(socket.data.userid))
        if (!user) {
            return
        }
        const roomid = await helper.room.createRoom(1, 2, RoomType.boss)
        let player: Battle = {
            userid: user.userid,
            account: user.account,
            attribute: user.career
        }
        await helper.room.joinRoom(roomid, player, 1)
        let bossid = await UserMongoModel.getuserid()
        let boss: Battle = { userid: await UserMongoModel.getuserid(), account: `${bossid}:${careerinfo.bossname}`, attribute: careerinfo }
        await helper.room.joinRoom(roomid, boss, 2)
        let room = await helper.room.getRoomInfo(roomid)
        let bossinfo: MsgService = {
            path: msg.path,
            code: NetworkStatusCode.SUCCESS,
            userid: socket.data.userid,
            data: room
        }
        MessageReg.sendMsg(socket, bossinfo)
    }
    /**
     * 开启攻击模式
     * @param socket 
     * @param msg 
     */
    public static async attackBoos(socket: Socket, msg: MsgClient) {

        let room = await helper.room.getRoomInfo(msg.data.roomid)
        if (room.status != RoomStatus.waiting) {
            helper.log.error('非法状态')
            return;
        }

        if (room.players.length == 0 || room.enemySide.length == 0) {
            helper.log.error('空房间')
            return;
        }

        let result = await helper.room.updateRoomStatus(msg.data.roomid, RoomStatus.playing)
        if (!result) {
            helper.log.error('状态重置失败')
            return;
        }

        await helper.room.gameStart(msg.data.roomid)

        let bossinfo: MsgService = {
            path: msg.path,
            code: NetworkStatusCode.SUCCESS,
            userid: socket.data.userid,
            data: "游戏开始,等待消息通知"
        }
        MessageReg.sendMsg(socket, bossinfo)
    }

    /**
     * 拉去boss列表
     * @param socket 
     */
    public static async findBoos(socket: Socket, msg: MsgClient) {
        let bossinfo: MsgService = {
            path: msg.path,
            code: NetworkStatusCode.SUCCESS,
            userid: socket.data.userid,
            data: helper.xlsx.rise.boss
        }
        MessageReg.sendMsg(socket, bossinfo)
        bossinfo.userid = 21047
        MessageReg.gameMsg(bossinfo)

    }
}