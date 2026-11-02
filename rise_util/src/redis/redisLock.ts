import { Redis } from "ioredis";
import { KeyService } from "src/enum/keyService";
import { v4 as uuidv4 } from "uuid";

interface LockOptions {
    timeout?: number;    // 阻塞模式超时时间（ms）
    retries?: number;    // 最大重试次数（阻塞模式）
    expire?: number;     // 锁过期时间（ms）
}
export enum ReleaseStatus {
    SUCCESS = 'SUCCESS',
    NOT_OWNER = 'NOT_OWNER',
    ALREADY_RELEASED = 'ALREADY_RELEASED',
    ERROR = 'ERROR'
}
export default class RedisLock {
    private redis: Redis;
    private lockKey: string;
    private identifier: string;
    private renewalTimer?: NodeJS.Timeout;

    constructor(redis: Redis) {
        this.redis = redis;
        this.lockKey = `${KeyService.REDISGLOALNAME}:lock`;
        this.identifier = uuidv4();
    }


    /**
     * 阻塞模式获取锁
     * @param options 
     * @returns 
     */
    async acquireBlocking(options: LockOptions = {}): Promise<boolean> {
        let { timeout = 600, retries = 10, expire = 5000 } = options;
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
            if (await this.tryAcquire(expire)) return true;
            if (--retries <= 0) break;
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        return false;
    }

    /**
     * 非阻塞模式获取锁
     * @param expire 
     * @returns 
     */
    async tryAcquire(expire: number = 5000): Promise<boolean> {
        const result = await this.redis.set(
            this.lockKey,
            this.identifier,
            "PX",
            expire,
            "NX"
        );

        if (result === "OK") {
            this.startRenewal(expire);
            return true;
        }
        return false;
    }

    // 自动续期（类似Redisson的Watch Dog）
    private startRenewal(expire: number) {
        this.renewalTimer = setInterval(async () => {
            const script = `
                if redis.call("GET", KEYS[1]) == ARGV[1] then
                    return redis.call("PEXPIRE", KEYS[1], ARGV[2])
                else
                    return 0
                end
            `;
            await this.redis.eval(script, 1, this.lockKey, this.identifier, expire);
        }, expire * 0.3); // 在70%过期时间时续期
    }



    /**
     * 非阻塞式释放锁（新增方法）
     * @returns 立即返回释放状态
     */
    async tryRelease(): Promise<ReleaseStatus> {
        try {
            if (this.renewalTimer) {
                clearInterval(this.renewalTimer);
                this.renewalTimer = undefined;
            }

            const script = `
            local val = redis.call("GET", KEYS[1])
            if val == false then
                return 2 -- 锁不存在
            elseif val ~= ARGV[1] then
                return 0 -- 非持有者
            else
                redis.call("DEL", KEYS[1])
                return 1 -- 释放成功
            end
        `;

            const result = await this.redis.eval(
                script,
                1,
                this.lockKey,
                this.identifier
            );

            switch (result) {
                case 1: return ReleaseStatus.SUCCESS;
                case 2: return ReleaseStatus.ALREADY_RELEASED;
                default: return ReleaseStatus.NOT_OWNER;
            }
        } catch (err) {
            console.error('释放锁异常:', err);
            return ReleaseStatus.ERROR;
        }
    }

    /**
     * 释放阻塞锁
     * @param retries 失败重试次数（默认不重试）
     */
    async release(retries: number = 0): Promise<ReleaseStatus> {
        let attempt = 0;
        while (attempt <= retries) {
            const result = await this.tryRelease();
            if (result === ReleaseStatus.SUCCESS ||
                result === ReleaseStatus.ALREADY_RELEASED) {
                return result;
            }
            await new Promise(resolve => setTimeout(resolve, 50));
            attempt++;
        }
        return ReleaseStatus.NOT_OWNER;
    }

    // 新增异步队列释放（后台静默重试）
    private async backgroundRelease() {
        const MAX_ATTEMPTS = 3;
        for (let i = 0; i < MAX_ATTEMPTS; i++) {
            const result = await this.tryRelease();
            if (result === ReleaseStatus.SUCCESS) break;
            await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)));
        }
    }

    /**
     * 非阻塞异步释放（新增方法）
     */
    async releaseNonBlocking() {
        setImmediate(() => this.backgroundRelease());
        return true; // 立即返回不等待结果
    }

}