import _ from "lodash";

import { Sekiro } from "./sekiro";
import { BattleAction, BulkUpdate } from '../util/roundRoomManager';
import { helper } from '../util/helper';

/**
 * 战斗流程处理起
 */
export class combatFlow {
    public static async start(roomid: string, userid?: number, attackered?: number,) {
        let room = await helper.room.getRoomInfo(roomid)
        if (room.actions.length == 0 && !userid) {
            await helper.room.generateAttackSequence(roomid)
            room = await helper.room.getRoomInfo(roomid)
            let nextuserid = room.attackSequence[0]
            this.senduser(nextuserid, {})
            await helper.room.gameStart(roomid, Number(nextuserid))
            return;
        }

        let attacker = room.players.find(e => e.userid == userid)
        //正方向的选手
        let justice = attacker ? true : false
        if (!justice) {
            attacker = room.enemySide.find(e => e.userid == userid)
        }

        if (!attacker) {
            await helper.room.clearRoomData(roomid)
            helper.log.error('error room attacker', room)
            return;
        }

        let attackeredGameinfo
        //正方攻击
        if (justice) {
            if (!attackered) {
                attackeredGameinfo = _.sample(room.enemySide)

            } else {
                attackeredGameinfo = room.enemySide.find(e => e.userid == attackered)
            }

        } else {
            //反方攻击
            if (!attackered) {
                attackeredGameinfo = _.sample(room.players)
            } else {
                attackeredGameinfo = room.players.find(e => e.userid == attackered)
            }
        }

        if (!attackeredGameinfo || (attackered && attackeredGameinfo.attribute.hp <= 0)) {
            await helper.room.clearRoomData(roomid)
            helper.log.error('error room attackeredGameinfo', room)
            return;
        }



        let result = await Sekiro.attackTarget(attacker, attackeredGameinfo)

        //写入操作日志
        let action: BattleAction = {
            nextOperator: attacker.userid,
            text: result[0],
            //当前操作者
            operator: attacker.userid,
        }
        await helper.room.submitAction(roomid, attacker.userid, JSON.stringify(action))


        let updateplayer: BulkUpdate = {
            players: [attacker],
            enemies: [attackeredGameinfo]
        }
        await helper.room.bulkUpdateMembers(roomid, updateplayer)
        helper.room.gameStart(roomid, Number(attacker.userid))



    }

    //通知玩家应该出手了。通知玩家数据更新啦。我来处理。ai不用实现这部分的工作
    static senduser(userid: string, data: any) {

    }

}