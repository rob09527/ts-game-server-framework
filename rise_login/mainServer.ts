
import { RedisOptions } from 'ioredis/built/cluster/util';
import { helper } from "./src/util/helper";
import { AppBootstrap } from "./src/network/appBootstrap";
import dotenv from "dotenv";
import * as fs from 'fs';
import * as path from 'path';
import RedisConnection from "rise_util/lib/src/redis/redisConnection";
import { RegistrAction } from './src/network/registrAction';
import Subscription from 'rise_util/lib/src/enum/subscription';
import ScheduleService from 'rise_util/lib/src/nodeSchedule/scheduleService';
import { MongoConnection } from './src/mongo/mongoConnection';
import { registerSchema } from './src/mongo/registerSchema';
import Log from 'rise_util/lib/src/logger/logService';
import RiseRedis from 'rise_util/lib/src/redis/riseRedis';
export class MainServer {
    public async start() {
        this.initLog4j()
        this.initNodeSchedule()
        await this.readServiceConfig()
        this.initRedis()
        new AppBootstrap().start()
        this.registerService()
        await this.initMongo()
        this.initRiseRedis()
    }
    /**
     * 读取服务json配置文件
     */
    private async readServiceConfig() {
        try {
            const env: any = dotenv.config().parsed
            const filePath = path.join(__dirname, `config/config.${env.rise}.json`)
            let file = await fs.readFileSync(filePath, 'utf-8');
            let config = JSON.parse(file)
            helper.config = config
        } catch (error) {
            helper.log.error(error)
        }
    }

    private initLog4j() {

        helper.log = new Log().getlogger('info')
    }

    private initRedis() {
        let config: RedisOptions = helper.config.redis
        const redis = new RedisConnection().redisCline(config)
        helper.redis = redis
    }
    private registerService() {
        const registration = new RegistrAction()
        registration.register()
    }

    private async initNodeSchedule() {
        helper.nodeSchedule = new ScheduleService()
    }


    private async initMongo() {
        const db = MongoConnection.getInstance(helper.config.mongo);
        helper.mongo = await db.connect();
        process.on('SIGINT', async () => {
            await db.disconnect();
            process.exit(0);
        });
        registerSchema()
    }

    private initRiseRedis() {
        helper.riseRedis = new RiseRedis(15)
    }

}
