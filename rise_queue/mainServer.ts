import { MessageQueue } from './src/network/messageQueue';
import { RedisOptions } from 'ioredis/built/cluster/util';
import { AppBootstrap } from "./src/network/appBootstrap";
import dotenv from "dotenv";
import * as fs from 'fs';
import * as path from 'path';
import Log from "rise_util/lib/src/logger/logService";
import RedisConnection from "rise_util/lib/src/redis/redisConnection";
import Subscription from 'rise_util/lib/src/enum/subscription';
import ScheduleService from 'rise_util/lib/src/nodeSchedule/scheduleService';
import { helper } from './src/util/helper';
import { Registration } from './src/network/registration'
export class MainServer {
    public async start() {
        this.initLog4j()
        await this.readServiceConfig()
        this.initenum()
        this.initNodeSchedule()
        this.initMessageQueue()
        this.initRedis()
        new AppBootstrap().start()
        this.registerService()
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


    private initenum() {
        helper.subscription = new Subscription()
    }
    private registerService() {
        new Registration().register()
    }

    private initMessageQueue() {
        helper.messageQueue = new MessageQueue()
    }

    private initNodeSchedule() {
        helper.nodeSchedule = new ScheduleService()
    }

}