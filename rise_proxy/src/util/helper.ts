import { Redis } from 'ioredis';
import { RedisOptions } from 'ioredis/built/cluster/util';
import { Logger } from "log4js"
import ScheduleService from 'rise_util/lib/src/nodeSchedule/scheduleService';
import RiseRedis from 'rise_util/lib/src/redis/riseRedis';
import { ProxyServer } from 'src/network/proxyServer';
import { ServiceRecord } from 'src/network/serviceRecord';
interface ConfigService {
    port: number,
    host: string,
    redis: RedisOptions
}
class Helper {
    public static log: Logger
    public static config: ConfigService
    public static subRedis: Redis
    public static redis: Redis

    public static nodeSchedule: ScheduleService
    public static serviceRecord: ServiceRecord
    public static proxyServer: ProxyServer
    public static riseRedis: RiseRedis

}
export const helper = Helper