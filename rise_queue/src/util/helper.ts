import { Redis } from 'ioredis';
import { RedisOptions } from 'ioredis/built/cluster/util';
import { Logger } from "log4js"
import Subscription from 'rise_util/lib/src/enum/subscription';
import ScheduleService from 'rise_util/lib/src/nodeSchedule/scheduleService';
import { MessageQueue } from 'src/network/messageQueue';

interface ConfigService {
    port: number,
    host: string,
    redis: RedisOptions
}
class Helper {
    public static log: Logger
    public static config: ConfigService
    public static redis: Redis
    public static subscription: Subscription
    public static nodeSchedule: ScheduleService
    public static messageQueue: MessageQueue

}
export const helper = Helper