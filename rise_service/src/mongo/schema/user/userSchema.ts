// src/models/user.model.ts

import { Schema } from 'mongoose';
import { helper } from '../../../util/helper';
import _ from 'lodash';
interface Career {
    skill: [],
    careerid: number,
    career: number,//职业
    hp: number,//生命
    sp: number,//速度
    attack: number,//攻击
    defense: number,//防御
    critRate: number,//暴击
    dodge: number,//闪避
    combo: number,//连击
    counter: number,//反击
    stunRate: number,//机晕
    lifesteal: number,//吸血
    critDmg: number,//暴击伤害
    critDmgResist: number,//爆伤减免
    dmgBonus: number,//增伤
    dmgReduce: number,//减伤
    healBoost: number,//强疗
    healReduce: number,//弱疗
}
// 步骤1: 定义Schema
export interface userDomain {
    userid: number,
    pwd: string,
    exp: number,
    level: number
    account: string,
    career: Career
}
const useridRedisKey = 'rise:userid-unique-1000'
export class UserMongoModel {
    public static schemaName = 'user'
    public static gameSchema = new Schema({
        userid: { type: Number, required: true, unique: true },
        pwd: { type: String, required: true },
        exp: { type: Number, required: true, unique: true },
        account: { type: String, required: true, unique: true },
        level: { type: Number, required: true, },
        career: { type: Object, required: true },
    });
    public static async getuserid(): Promise<number> {
        let randcount = _.random(1, 10)
        return await helper.redis.incrby(useridRedisKey, randcount)
    }
    public static async createCareer(userid: number, career: number) {
        let riseconfig: any[] = helper.xlsx.rise.career
        let careerinfo = riseconfig.find(e => e.id == career)

        let result = await helper.mongo.model(UserMongoModel.schemaName).updateOne({ userid }, { $set: { career: careerinfo } })
        return result
    }

    public static async userExist(userid: number) {
        let isExist = await helper.mongo.model(UserMongoModel.schemaName).exists({ userid })
        return isExist
    }

    public static async userInfo(userid: number): Promise<userDomain | null> {
        let user = await helper.mongo.model(UserMongoModel.schemaName).findOne({ userid })
        if (!user) {
            return null
        }
        user = _.omit(user.toObject(), ['pwd', '__v', '_id']);
        return user
    }
}



