
import { helper } from '../util/helper';
import { ServiceResume, ServiceResumeEnum, ServiceRouter } from 'rise_util/lib/src/envelope/serviceResumeEnvelope';
import { Protocol } from 'rise_util/lib/src/enum/subscription';

export class RegistrAction {

    public async register() {
        helper.nodeSchedule.addJob({ rule: '*/5 * * * * *' }, ServiceRouter['game'], this.releasePipeline)
    }

    private async releasePipeline() {
        // helper.log.info('releasePipeline', new Date())
        let messageObject: ServiceResume = {
            name: ServiceRouter['game'],
            address: `${helper.config.host}:${helper.config.port}`,
            host: helper.config.host,
            port: helper.config.port,
            state: ServiceResumeEnum.CLOSURE,
            update: Date.now(),
            create: Date.now(),
        }
        let message = JSON.stringify(messageObject)
        await helper.redis.publish(Protocol.SERVICE, message);
    }



}