
import { helper } from '../util/helper';
import { ServiceResume, ServiceResumeEnum } from 'rise_util/lib/src/envelope/serviceResumeEnvelope';
const name: string = 'rise_queue'
export class Registration {

    public async register() {
        helper.nodeSchedule.addJob({ rule: '*/5 * * * * *' }, name, this.releasePipeline)
    }

    private async releasePipeline() {
        // helper.log.info('releasePipeline', new Date())
        let messageObject: ServiceResume = {
            name: name,
            address: `${helper.config.host}:${helper.config.port}`,
            host: helper.config.host,
            port: 1,
            state: ServiceResumeEnum.CLOSURE,
            update: Date.now(),
            create: Date.now(),
        }
        let message = JSON.stringify(messageObject)
        await helper.redis.publish(helper.subscription.SERVICE, message);
    }



}