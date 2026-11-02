import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { ServiceResumeEnum } from '../envelope/serviceResumeEnvelope';
import { KeyService } from '../enum/keyService';

export interface RedisServiceInfo {
    id: string;         // 唯一实例ID
    name: string;       // 服务名称
    host: string;       // 服务主机
    port: number;       // 服务端口
    userCount: number;  // 当前连接数
    version: string;    // 服务版本
    status: ServiceResumeEnum; // 服务状态
    updateTime: number; // 最后更新时间戳
    startupTime: number; // 服务启动时间
    load?: number;      // 服务负载（可选）
}

// 服务信息接口增强版


// 服务键名前缀规范
const SERVICE_KEY_PREFIX = KeyService.REDISGLOALNAME

export default class RiseRedis {
    // 默认服务过期时间（秒）
    public DEFAULT_SERVICE_TTL: number = 15;
    constructor(expire: number) {
        this.DEFAULT_SERVICE_TTL = expire ? expire : 15
    }

    /**
      * 服务注册（首次调用）
      * 初始化所有服务元数据
      */
    public async registerService(
        redis: Redis,
        keyPattern: string,
        info: Omit<RedisServiceInfo, 'id' | 'updateTime' | 'startupTime' | 'userCount'>,
        ttl: number = this.DEFAULT_SERVICE_TTL
    ): Promise<void> {
        const serviceKey = this.generateServiceKey(keyPattern, info.host, String(info.port));
        const serviceId = uuidv4();
        const now = Date.now();

        await redis
            .pipeline()
            .hset(serviceKey, {
                ...info,
                id: serviceId,
                userCount: 0, // 初始化连接数
                updateTime: now,
                startupTime: now,
                status: 'online'
            })
            .expire(serviceKey, ttl)
            .exec();
    }

    /**
   * 删除服务器记录
   */
    public async deleteServerInfo(
        redis: Redis,
        keyPattern: string,
        info: {
            host: string,
            port: number
        },
    ): Promise<number> {
        const serviceKey = this.generateServiceKey(keyPattern, info.host, String(info.port));
        return redis.del(serviceKey);
    }

    /**
     * 服务心跳更新（周期性调用）
     * 仅更新存活时间和TTL，不影响其他字段
     */
    public async updateServiceHeartbeat(
        redis: Redis,
        keyPattern: string,
        host: string,
        port: number,
        ttl: number = this.DEFAULT_SERVICE_TTL
    ): Promise<boolean> {
        const serviceKey = this.generateServiceKey(keyPattern, host, String(port));
        const now = Date.now();

        const result = await redis
            .pipeline()
            .hset(serviceKey, 'updateTime', now) // 仅更新更新时间
            .expire(serviceKey, ttl) // 续期TTL
            .exec();
        if (!result) {
            return false
        }
        return result.every(res => res[0] === null);
    }

    /**
     * 带条件更新的服务信息修改
     * 用于修改版本号、负载等非计数信息
     */
    public async safeUpdateServiceInfo(
        redis: Redis,
        keyPattern: string,
        host: string,
        port: number,
        updates: Partial<RedisServiceInfo>
    ): Promise<void> {
        const serviceKey = this.generateServiceKey(keyPattern, host, String(port));
        const allowedFields = ['version', 'load', 'status']; // 允许更新的字段白名单

        // 过滤非法字段
        const validUpdates = Object.entries(updates)
            .filter(([key]) => allowedFields.includes(key))
            .reduce((obj, [k, v]) => ({ ...obj, [k]: v }), {});

        if (Object.keys(validUpdates).length > 0) {
            await redis.hset(serviceKey, validUpdates);
        }
    }

    /**
     * 原子性修改连接数
     * @param redis Redis实例
     * @param keyPattern 服务键格式
     * @param delta 变化量（+1/-1）
     */
    public async updateConnectionCount(
        redis: Redis,
        keyPattern: string,
        host: string,
        port: number,
        delta: number
    ): Promise<void> {
        const serviceKey = this.generateServiceKey(keyPattern, host, String(port));

        await redis
            .pipeline()
            .hincrby(serviceKey, 'userCount', delta)
            .hset(serviceKey, 'updateTime', Date.now())
            .exec();
    }

    /**
     * 获取服务实例详情
     */
    public async getServiceInstance(
        redis: Redis,
        keyPattern: string,
        host: string,
        port: number
    ): Promise<RedisServiceInfo | null> {
        const serviceKey = this.generateServiceKey(keyPattern, host, String(port));
        const data = await redis.hgetall(serviceKey);
        return Object.keys(data).length ? this.parseServiceInfo(data) : null;
    }

    /**
     * 获取同类型所有服务实例
     */
    public async getAllServices(
        redis: Redis,
        serviceName: string
    ): Promise<RedisServiceInfo[]> {
        const pattern = this.generateServiceKey(`${serviceName}:*`);
        const keys = await this.scanKeys(redis, pattern);

        const pipeline = redis.pipeline();
        keys.forEach(key => pipeline.hgetall(key));
        // : Promise<[error: Error | null, result: unknown][] | null>;
        const results = await pipeline.exec();
        if (!results) {
            return []
        }
        return results.map(([err, data]) => err ? null : this.parseServiceInfo(data)).filter(Boolean) as RedisServiceInfo[];
    }

    // 私有方法：键名生成器
    public generateServiceKey(...parts: string[]): string {
        return `${SERVICE_KEY_PREFIX}:${parts.join(':')}`;
    }

    // 安全扫描键（避免使用 KEYS 命令）
    public async scanKeys(redis: Redis, pattern: string): Promise<string[]> {
        const foundKeys = [];
        let cursor = '0';

        do {
            const [nextCursor, keys] = await redis.scan(
                cursor,
                'MATCH',
                pattern,
                'COUNT',
                100
            );

            cursor = nextCursor;
            foundKeys.push(...keys);
        } while (cursor !== '0');

        return foundKeys;
    }

    // 数据转换器
    public parseServiceInfo(data: any): RedisServiceInfo {
        return {
            id: data.id,
            name: data.name,
            host: data.host,
            port: parseInt(data.port),
            userCount: parseInt(data.userCount),
            version: data.version,
            status: data.status,
            updateTime: parseInt(data.updateTime),
            startupTime: parseInt(data.startupTime),
            load: data.load ? parseFloat(data.load) : undefined
        };
    }

    // 新增：服务健康检查
    public async cleanupExpiredServices(redis: Redis): Promise<void> {
        const allServiceKeys = await this.scanKeys(redis, `${SERVICE_KEY_PREFIX}:*`);
        const now = Date.now();
        const expiredServices: string[] = [];

        const pipeline = redis.pipeline();
        allServiceKeys.forEach(key => pipeline.hget(key, 'updateTime'));

        const results = await pipeline.exec();
        if (!results) {
            return
        }
        results.forEach(([err, updateTime], index) => {
            if (!err && updateTime) {
                const lastUpdate = parseInt(updateTime as string);
                if (now - lastUpdate > this.DEFAULT_SERVICE_TTL * 1000) {
                    expiredServices.push(allServiceKeys[index]);
                }
            }
        });

        if (expiredServices.length > 0) {
            await redis.del(...expiredServices);
        }
    }

    // ... 原有代码保持不变

    /**
     * 记录用户所在服务器信息
     * @param userId 用户唯一ID
     * @param serverInfo 服务器连接信息
     * @param ttl 过期时间（秒），0表示不过期
     */
    public async writeUserServerInfo(
        redis: Redis,
        userId: string,
        serverInfo: { host: string; port: number;[key: string]: any },
        ttl: number = 60 * 60 * 24 * 3
    ): Promise<void> {
        const userServerKey = this.generateServiceKey('userServer', userId);
        const value = JSON.stringify({
            // host: serverInfo.host,
            // port: serverInfo.port,
            updateTime: Date.now(),
            ...serverInfo
        });

        if (ttl > 0) {
            await redis.setex(userServerKey, ttl, value);
        } else {
            await redis.set(userServerKey, value);
        }
    }

    /**
     * 删除用户服务器记录
     * @param userId 用户唯一ID 
     */
    public async deleteUserServerInfo(
        redis: Redis,
        userId: string
    ): Promise<number> {
        const userServerKey = this.generateServiceKey('userServer', userId);
        return redis.del(userServerKey);
    }

    /**
     * 获取用户当前所在服务器信息
     * @returns 服务器信息或null
     */
    public async getUserServerInfo(
        redis: Redis,
        userId: string
    ): Promise<{ host: string; port: number; updateTime: number } | null> {
        const userServerKey = this.generateServiceKey('userServer', userId);
        const data = await redis.get(userServerKey);

        if (!data) return null;

        try {
            const parsed = JSON.parse(data);
            return {
                host: parsed.host,
                port: parsed.port,
                updateTime: parsed.updateTime
            };
        } catch (e) {
            return null;
        }
    }
}