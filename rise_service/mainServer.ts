
import { RedisOptions } from 'ioredis/built/cluster/util';
import { helper } from "./src/util/helper";
import { AppBootstrap } from "./src/network/appBootstrap";
import dotenv from "dotenv";
import * as fs from 'fs';
import * as path from 'path';
import Log from "rise_util/lib/src/logger/logService";
import RedisConnection from "rise_util/lib/src/redis/redisConnection";
import { RegistrAction } from './src/network/registrAction';
import Subscription from 'rise_util/lib/src/enum/subscription';
import ScheduleService from 'rise_util/lib/src/nodeSchedule/scheduleService';
import { MongoConnection } from './src/mongo/mongoConnection';
import { registerSchema } from './src/mongo/registerSchema';
import { batchConvertDocuments } from './src/util/excelToJsonConverter';
import { loadJsonFiles } from './src/util/jsonToExcelMerger';
import { connManger } from './src/network/ConnManger';
import GameRedisClient from 'rise_util/lib/src/redis/riseRedis';
import { RoundRoomManager } from './src/util/roundRoomManager';
import { SubscriberAction } from './src/network/subscriberAction';
export class MainServer {
    public async start() {
        await this.xlsxtojson()
        this.initLog4j()
        this.initNodeSchedule()
        await this.readServiceConfig()
        await this.initRedis()
        new AppBootstrap().start()
        this.registerService()
        this.userConn()
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
    private userConn() {
        helper.connMg = new connManger()
    }
    private async initRedis() {
        let config: RedisOptions = helper.config.redis
        const redis = new RedisConnection().redisCline(config)
        helper.redis = redis
        this.initRoom()
        const subRedis = new RedisConnection().redisCline(config)
        helper.subRedis = subRedis
        await new SubscriberAction().setupSubscriber()
    }
    private registerService() {
        new RegistrAction().register()
    }

    private initRoom() {
        helper.room = new RoundRoomManager(helper.redis)
    }

    private async initNodeSchedule() {
        helper.nodeSchedule = new ScheduleService()
    }

    private initRiseRedis() {
        helper.riseRedis = new GameRedisClient(15)
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


    private async xlsxtojson() {
        // 启动时自动转换
        batchConvertDocuments();
        let result = await loadJsonFiles()
        helper.xlsx = result

    }
}
