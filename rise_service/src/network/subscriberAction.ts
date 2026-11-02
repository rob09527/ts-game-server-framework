
import { helper } from '../util/helper';
import { combatFlow } from '../sekiro/combatFlow';
export class SubscriberAction {
    private readonly REQUIRED_CONFIG = "Ex"

    public async setupSubscriber() {
        try {
            await helper.redis.config('SET', 'notify-keyspace-events', this.REQUIRED_CONFIG)
            // 确认连接已建立
            if (helper.subRedis.status !== 'ready') {
                await new Promise(resolve => helper.subRedis.once('connect', resolve));
            }
            await helper.room.gameStart("1")
            // 使用更通用的模式匹配
            await helper.subRedis.psubscribe('__keyevent@*__:expired');
            // 增强版事件监听
            helper.subRedis.on('pmessage', (channel, expiredKey, key) => {
                if (key.includes('RiseService:room') && key.includes('gameRoundRecord')) {
                    let debris = key.split(":")
                    let roomid = debris[2]
                    let userid = debris.length == 5 ? debris[debris.length - 1] : undefined
                    if (userid == "-1") {
                        userid = "0"
                    }
                    combatFlow.start(roomid, Number(userid))
                }
            });
        } catch (err) {
            console.error('[Monitor] 订阅失败:', err);
            // 添加重试逻辑
            setTimeout(() => this.setupSubscriber(), 5000);
        }
    }






}