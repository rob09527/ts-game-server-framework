
import Log from "./src/logger/logService";
import RedisConnection from "./src/redis/redisConnection";
import ScheduleService from './src/nodeSchedule/scheduleService';
import CryptoService from './src/service/cryptoService';
import RiseRedis from "./src/redis/redisLock";
export default { RedisConnection, Log, ScheduleService, CryptoService, RiseRedis }

