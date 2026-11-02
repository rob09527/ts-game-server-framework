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
interface userDomain {
    userid: number,
    pwd: string,
    exp: number,
    level: number
    account: String,
    career: Career
}
const useridRedisKey = 'rise:userid-unique-1000'
export class UserMongoModel {
    public static schemaName = 'user'
    public static gameSchema = new Schema({
        userid: { type: Number, required: true, unique: true },
        pwd: { type: String, required: true },
        exp: { type: Number, required: true },
        account: { type: String, required: true, unique: true },
        level: { type: Number, required: true, },
        career: { type: Object, },
    });
    public static async getuserid(): Promise<Number> {
        let randcount = _.random(1, 10)
        return await helper.redis.incrby(useridRedisKey, randcount)
    }


    public static async createUser(account: string, pwd: string) {
        let user = {
            userid: await this.getuserid(),
            account: account,
            exp: 0,
            level: 1,
            pwd: pwd
        }
        let result = await helper.mongo.model(UserMongoModel.schemaName).create(user)
        return result

    }

    public static async userExist(userid: number) {
        let isExist = await helper.mongo.model(UserMongoModel.schemaName).exists({ userid })
        return isExist
    }

    public static async userInfo(userid: number) {
        let user = await helper.mongo.model(UserMongoModel.schemaName).findOne({ userid })
        return user
    }

    public static async userInfoByAccount(account: number) {
        let user = await helper.mongo.model(UserMongoModel.schemaName).findOne({ account })
        return user
    }
}



