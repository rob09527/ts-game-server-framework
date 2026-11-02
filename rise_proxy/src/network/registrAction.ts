import { ServiceResume, ServiceResumeEnum, ServiceRouter } from 'rise_util/lib/src/envelope/serviceResumeEnvelope';
import { helper } from '../util/helper';
import { RedisServiceInfo } from 'rise_util/lib/src/redis/riseRedis';
import { Protocol } from 'rise_util//lib/src/enum/subscription';



export class RegistrAction {
    public async subscribe() {
        // 订阅频道
        await helper.subRedis.subscribe(Protocol.SERVICE);
        helper.subRedis.on('message', (channel: string, message: string) => {
            if (channel == Protocol.SERVICE) {
                let register: ServiceResume = JSON.parse(message)
                register.update = Date.now()
                helper.serviceRecord.register(register)

                // helper.log.info(`Received from ${channel}`, register.name);
            }
        });

        // // 监听 'error' 事件，当发生错误时触发
        helper.subRedis.on('error', (err: any) => {
            console.error('Redis subscription error:', err);
        });

    }
    /**
     * 把proxy注册到redis里面
     */
    public register() {
        helper.nodeSchedule.addJob({ rule: '*/10 * * * * *' }, "", this.releasePipeline)
    }

    private async releasePipeline() {
        const name = ServiceRouter['proxy']
        const redis = helper.redis
        let result = await helper.riseRedis.getServiceInstance(redis, name, helper.config.host, helper.config.port)
        if (!result) {
            let info: RedisServiceInfo = {
                id: "",
                updateTime: 1,
                startupTime: 1,
                name: name,
                host: helper.config.host,
                port: helper.config.port,
                userCount: 0,
                version: '1.0.0',
                status: ServiceResumeEnum.NORMAL
            }
            await helper.riseRedis.registerService(redis, name, info, 30)
        } else {
            await helper.riseRedis.updateServiceHeartbeat(redis, name, helper.config.host, helper.config.port, 30)
        }
    }


}