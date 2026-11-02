import { Request, Response } from "express";
import { UserMongoModel } from '../../mongo/schema/user/userSchema';
import _ from "lodash";
import { NetworkStatusCode } from 'rise_util/lib/src/enum/networkStatusCode';
import CryptoService from "rise_util/lib/src/service/cryptoService";
import jwt from 'jsonwebtoken'
import dotenv from "dotenv";

import { ServiceRouter } from "rise_util/lib/src/envelope/serviceResumeEnvelope";
import { helper } from '../../util/helper';
const env: any = dotenv.config().parsed
const JWT_SECRET = env.JWT_SECRET || 'YOUR_JWT_SECRET';
const TOKEN_EXPIRES = "24h"
export class UserService {
    /**
     * 用户注册
     * md5加密
     * 使用jwtoken
     * 
     * @param req 
     * @param res 
     */
    public async register(req: Request, res: Response) {
        const { account, pwd } = req.body
        let user = await UserMongoModel.userInfoByAccount(account)
        if (user) {
            res.send({ code: NetworkStatusCode.USER_EXIST, msg: "USER_EXIST" })
            return;
        } else {
            //写入
            let user = await UserMongoModel.createUser(account, CryptoService.md5(pwd))
            res.send({ code: NetworkStatusCode.SUCCESS, msg: user._doc })
            return;
        }
    }


    /**
       * 用户登陆
       * md5加密
       * @param req 
       * @param res 
       */
    public async login(req: Request, res: Response) {
        console.log(JWT_SECRET)
        const { pwd, account } = req.body;
        try {
            // 1. 验证账号存在性
            const user = await UserMongoModel.userInfoByAccount(account);
            if (!user) {
                return res.send({
                    code: NetworkStatusCode.USER_NOT_EXIST,
                    msg: "USER_NOT_EXIST"
                });
            }
            // 2. 验证密码（使用相同的加密方式）
            const encryptedPwd = CryptoService.md5(pwd);
            if (user.pwd !== encryptedPwd) {
                return res.send({
                    code: NetworkStatusCode.PASSWORD_ERROR,
                    msg: "PASSWORD_ERROR"
                });
            }
            let result = await helper.riseRedis.getAllServices(helper.redis, ServiceRouter['proxy'])
            let service = _.sample(result)
            if (!service) {
                return res.send({
                    code: NetworkStatusCode.SERVICE_CLOSE,
                    msg: "SERVICE_CLOSE"
                });

            }
            // 3. 生成JWT令牌
            const token = jwt.sign(
                {
                    userid: user.userid,
                    account: user.account,

                },
                JWT_SECRET,
                { expiresIn: TOKEN_EXPIRES }
            );

            // 4. 返回登录成功信息（隐藏敏感字段）
            const userData = _.omit(user.toObject(), ['pwd', '__v', '_id']);

            res.send({
                code: NetworkStatusCode.SUCCESS,
                msg: "登录成功",
                data: {
                    user: userData,
                    token: token,
                    service
                }
            });
            return

        } catch (error) {
            console.error('login error:', error);
            res.status(500).send({
                code: NetworkStatusCode.SERVER_ERROR,
                msg: "SERVER_ERROR"
            });
            return
        }

    }

}
