import { Redis } from "ioredis";
import { RedisOptions } from "ioredis/built/cluster/util";


export default class RedisConnection {
    public redisCline(config: RedisOptions) {
        const redis = new Redis(config)
        return redis
    }

}



