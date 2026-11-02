import { ServiceRecord } from './src/network/serviceRecord';
import { RedisOptions } from 'ioredis/built/cluster/util';
import { helper } from "./src/util/helper";
import { AppBootstrap } from './src/network/AppBootstrap';
import dotenv from "dotenv";
import * as fs from 'fs';
import * as path from 'path';
import Log from "rise_util/lib/src/logger/logService";
import RedisConnection from "rise_util/lib/src/redis/redisConnection";
import { RegistrAction } from './src/network/registrAction';
import { ProxyServer } from './src/network/proxyServer';
import GameRedisClient from 'rise_util/lib/src/redis/riseRedis';
import ScheduleService from 'rise_util/lib/src/nodeSchedule/scheduleService';
export class MainServer {
    public async start() {
        this.initLog4j()
        this.initNodeSchedule()
        this.initProxyService()
        await this.readServiceConfig()
        this.initRedis()
        new AppBootstrap().start()
        this.addServiceRecord()
        this.subscribe()
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

    private initProxyService() {
        helper.proxyServer = new ProxyServer()
    }
    private initRiseRedis() {
        helper.riseRedis = new GameRedisClient(15)
    }


    private initRedis() {
        let config: RedisOptions = helper.config.redis
        const subRedis = new RedisConnection().redisCline(config)
        helper.subRedis = subRedis as any

        const redis = new RedisConnection().redisCline(config)
        helper.redis = redis as any

    }

    private async subscribe() {
        const registration = new RegistrAction()
        registration.subscribe()
        registration.register()
    }

    private async addServiceRecord() {
        helper.serviceRecord = new ServiceRecord()
    }
    private async initNodeSchedule() {
        helper.nodeSchedule = new ScheduleService()
    }
}