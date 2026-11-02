import jwt from 'jsonwebtoken'
import dotenv from "dotenv";
import { helper } from './helper';
const env: any = dotenv.config().parsed
const JWT_SECRET = env.JWT_SECRET || 'YOUR_JWT_SECRET';

export class TokenManger {

    static check(auth: any) {
        try {
            let result: any = jwt.verify(auth.token, JWT_SECRET)
            if (!result) {
                return false
            }
            helper.log.info('jwttokencheck:', result)
            let userid = result.userid
            return userid

        } catch (error) {
            helper.log.error('jwttokencheck:', error)
            return false
        }

    }

}