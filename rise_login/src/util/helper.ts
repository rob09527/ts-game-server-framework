
import { Redis } from 'ioredis';
import { RedisOptions } from 'ioredis/built/cluster/util';
import { Logger } from "log4js"
import ScheduleService from 'rise_util/lib/src/nodeSchedule/scheduleService';
import { MongoConfig } from 'src/mongo/mongoConnection';
import { Connection } from 'mongoose';
import RiseRedis from 'rise_util/lib/src/redis/riseRedis';

interface ConfigService {
    port: number,
    host: string
    redis: RedisOptions
    mongo: MongoConfig
}
class Helper {
    public static log: Logger
    public static config: ConfigService
    public static redis: Redis
    public static nodeSchedule: ScheduleService
    public static mongo: Connection
    public static riseRedis: RiseRedis


}
export const helper = Helper