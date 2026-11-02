
import { ServiceResume, ServiceRouter } from 'rise_util/lib/src/envelope/serviceResumeEnvelope';
import { helper } from '../util/helper';
import { RedisServiceInfo } from 'rise_util/lib/src/redis/riseRedis';


export class ServiceRecord {
    constructor() {
        this.resume = new Map()
    }
    private resume: Map<string, ServiceResume>

    /**
     * 服务注册 
     */
    public register(register: ServiceResume) {
        this.resume.set(register.address, register)
        this.registerRedis(register)

    }
    public async registerRedis(register: ServiceResume) {
        let redis = helper.redis
        let result = await helper.riseRedis.getServiceInstance(redis, register.name, register.host, register.port)
        if (!result || !result.host) {
            let info: RedisServiceInfo = {
                id: "",
                updateTime: 1,
                startupTime: 1,
                name: register.name,
                host: register.host,
                port: register.port,
                userCount: 0,
                version: '1.0.0',
                status: register.state
            }
            await helper.riseRedis.registerService(redis, register.name, info, 30)
            if (register.name == ServiceRouter['game']) {
                helper.proxyServer.conn([register], {
                    userid: -9998,
                    token: 'sysconn',
                    host: helper.config.host,
                    port: helper.config.port,
                    sysname: ServiceRouter['proxy'],
                })
                helper.log.info(register.name, "注册")
            }

        } else {
            await helper.riseRedis.updateServiceHeartbeat(redis, register.name, register.host, register.port, 30)
        }

    }
    /**
     * 索引可用游戏服务器
     */
    public getGameService(): Array<ServiceResume> {
        const normalServices = Array.from(this.resume.values()).filter(service => {
            const isNormal = service.name === ServiceRouter["game"];
            if (isNormal) {
                helper.log.info('发现服务', service.address)
                return service;
            }
            return null
        });
        console.log(`共有 ${normalServices.length} 个正常服务`);
        if (!normalServices[0]) {
            return [];
        }
        return normalServices
    }

}