
import { Redis } from 'ioredis';
import { RedisOptions } from 'ioredis/built/cluster/util';
import { Logger } from "log4js"
import ScheduleService from 'rise_util/lib/src/nodeSchedule/scheduleService';
import { connManger } from 'src/network/ConnManger';
import { MongoConfig } from 'src/mongo/mongoConnection';
import { Connection } from 'mongoose';
import RiseRedis from 'rise_util/lib/src/redis/riseRedis';
import { RoundRoomManager } from './roundRoomManager';

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
    public static subRedis: Redis
    public static room: RoundRoomManager
    public static nodeSchedule: ScheduleService
    public static connMg: connManger
    public static mongo: Connection
    public static riseRedis: RiseRedis
    public static xlsx: any
}
export const helper = Helper