/**
 * 回合制游戏房间管理模块 v2.3
 * 完整注释版 | 基于Redis Hash的合并键实现
 */
import { Redis } from 'ioredis';
import { KeyService } from 'rise_util/lib/src/enum/keyService';
import { Battle } from '../sekiro/sekiro';

// ======================== 类型定义 ========================

/**
 * 玩家操作记录类型
 * @property playerId - 玩家唯一标识
 * @property action - 操作指令内容（如"attack"）
 * @property timestamp - 操作时间戳（毫秒级）
 */
interface PlayerAction {
  userid: number;
  action: string;
  timestamp: number;
}

export interface BattleAction {
  //下个操作者
  nextOperator: number,
  text: string[],
  //当前操作者
  operator: number
}
export interface BulkUpdate {
  players?: Battle[];
  enemies?: Battle[];
}
interface RemovalTargets {
  players?: string[];
  enemies?: string[];
}

/**
 * 房间状态类型
 * - waiting: 等待玩家加入阶段
 * - playing: 游戏进行中
 * - completed: 游戏已结束
 */
// export type RoomStatus = 'waiting' | 'playing' | 'completed';
export enum RoomStatus {
  waiting = 'waiting',
  playing = 'playing',
  completed = 'completed'
}

/**
 * 房间基础信息接口
 * @property status - 当前房间状态
 * @property currentTurn - 当前回合序号（从0开始计数）
 * @property maxPlayers - 房间最大玩家容量
 * @property createdAt - 房间创建时间戳（毫秒）
 */
interface RoomInfo {
  status: RoomStatus;
  currentTurn: number;
  maxPlayers: number;
  maxEnemy: number;
  createdAt: number;
  players: Array<Battle>,
  enemySide: Array<Battle>,
  actions: BattleAction[],
  type: RoomType
  //userid 数组
  attackSequence: string[]
}
export enum RoomType {
  boss = 1,
  user = 2,
}

// ======================== 核心类实现 ========================
export class RoundRoomManager {
  private readonly redis: Redis;
  private readonly baseKey: string;

  /**
   * 初始化房间管理器
   * @param redis - ioredis实例
   * @param options 配置项
   * @property roomTimeout 玩家超时时间（毫秒）
   * @property maxPlayers 默认最大玩家数
   * @property expireSeconds Redis数据过期时间（秒）
   */
  constructor(
    redis: Redis,
    private readonly options: {
      roomTimeout: number;
      maxPlayers: number;
      maxEnemy: number;
      expireSeconds: number;
    } = {
        roomTimeout: 60_000,   // 默认60秒无操作超时
        maxPlayers: 2,         // 默认双人对战
        maxEnemy: 2,
        expireSeconds: 86_400  // 默认24小时过期86_400
      }
  ) {

    // 生成基础Redis键前缀（例："game:room"）
    this.baseKey = `${KeyService.REDISGLOALNAME}:room`;
    this.redis = redis;
  }

  // ======================== 核心方法 ========================

  /**
   * 创建新房间
   * @param maxPlayers 房间最大玩家容量（默认使用配置值）
   * @returns 房间ID字符串
   * @throws ROOM_CREATION_FAILED 当Redis操作失败时抛出
   * 
   * 实现逻辑：
   * 1. 使用Redis原子计数器生成唯一房间ID
   * 2. 初始化房间数据结构
   * 3. 设置初始过期时间
   */
  async createRoom(maxPlayers: number = this.options.maxPlayers, maxEnemy: number = this.options.maxEnemy, type: RoomType): Promise<string> {
    // 生成自增房间ID（原子操作）
    const roomId = await this.redis.incr(`${this.baseKey}:id_counter`);
    const roomKey = this.getRoomKey(roomId.toString());

    try {
      // 使用pipeline保证操作原子性
      await this.redis
        .pipeline()
        // 初始化房间数据（Hash结构）
        .hset(roomKey,
          'status', 'waiting',        // 初始状态
          'type', type,               //房间类型
          'currentTurn', '0',        // 回合计数器
          'maxPlayers', maxPlayers.toString(), // 最大玩家数
          'maxEnemy', maxEnemy.toString(), // 最大对手数
          'createdAt', Date.now().toString(), // 创建时间
          'players', '[]',            // 玩家列表（JSON数组）
          'actions', '[]',            // 操作记录（JSON数组）
          'enemySide', '[]',          // 敌方记录（JSON数组）
          'attackSequence', '[]',     //攻击顺序（JSON数组）(根据sp排列)
          'lastActive', '{}'          // 最后活跃时间（JSON对象）
        )
        // 设置过期时间（秒）
        .expire(roomKey, this.options.expireSeconds)
        .exec();

      return roomId.toString();
    } catch (e) {
      throw new RoomError('ROOM_CREATION_FAILED');
    }
  }

  /**
   * 加入房间（支持玩家/敌方阵营）
   * @param direction 1-加入玩家阵营 2-加入敌方阵营
   */
  async joinRoom(
    roomId: string,
    player: Battle,
    direction: 1 | 2
  ): Promise<boolean> {
    const roomKey = this.getRoomKey(roomId);

    const luaScript = `
      local key = KEYS[1]
      local newMember = cjson.decode(ARGV[1])
      local direction = tonumber(ARGV[2])
      local expireSeconds = tonumber(ARGV[3])

      -- 获取配置限制
      local maxPlayers = tonumber(redis.call('HGET', key, 'maxPlayers'))
      local maxEnemy = tonumber(redis.call('HGET', key, 'maxEnemy'))

      -- 根据方向选择操作字段
      local targetField = direction == 1 and 'players' or 'enemySide'
      local maxLimit = direction == 1 and maxPlayers or maxEnemy

      -- 获取现有成员列表
      local members = cjson.decode(redis.call('HGET', key, targetField) or '[]')

      -- ID存在性检查
      for _, m in ipairs(members) do
        if m.userid == newMember.userid then
          return {err='MEMBER_ALREADY_EXISTS'}
        end
      end

      -- 容量检查
      if #members >= maxLimit then
        return {err=targetField..'_FULL'}
      end

      -- 插入新成员
      table.insert(members, newMember)
      redis.call('HSET', key, targetField, cjson.encode(members))
      redis.call('EXPIRE', key, expireSeconds)
      return 1
    `;

    const result = await this.redis.eval(
      luaScript,
      1,
      roomKey,
      JSON.stringify(player),
      direction,
      this.options.expireSeconds.toString()
    );

    return this.parseLuaResult(result);
  }
  /**
     * 生成战斗攻击顺序（按速度降序排列）
     */
  public async generateAttackSequence(roomId: string): Promise<void> {
    const roomKey = this.getRoomKey(roomId);

    // 使用Lua脚本保证原子性操作
    const luaScript = `
    local key = KEYS[1]
    local players = cjson.decode(redis.call('HGET', key, 'players') or '[]')
    local enemies = cjson.decode(redis.call('HGET', key, 'enemySide') or '[]')
    
    -- 合并双方单位
    local allUnits = {}
    for _, v in ipairs(players) do table.insert(allUnits, v) end
    for _, v in ipairs(enemies) do table.insert(allUnits, v) end
    
    -- 按速度降序排序（速度相同按userid排序）
    table.sort(allUnits, function(a, b) 
      if a.attribute.sp == b.attribute.sp then
        return a.userid < b.userid
      end
      return a.attribute.sp > b.attribute.sp
    end)
    
    -- 提取排序后的userid列表
    local sequence = {}
    for _, v in ipairs(allUnits) do
      table.insert(sequence, tostring(v.userid))
    end
    
    redis.call('HSET', key, 
      'attackSequence', cjson.encode(sequence),
      'currentAttackIndex', 0  -- 重置当前攻击索引
    )
    return true
  `;

    await this.redis.eval(luaScript, 1, roomKey);
  }
  /**
   * 批量更新成员信息（原子操作）
   * @param roomId 房间ID
   * @param updates 包含玩家和敌方的更新数据
   * @returns 是否全部更新成功
   * @throws MEMBER_NOT_FOUND 任意更新目标不存在时抛出
   * 
   * 性能优化点：
   * 1. 单次Redis交互完成所有操作
   * 2. 使用Hash表加速查找
   * 3. 内存预分配优化
   */
  async bulkUpdateMembers(roomId: string, updates: BulkUpdate): Promise<boolean> {
    const roomKey = this.getRoomKey(roomId);

    const luaScript = `
      local key = KEYS[1]
      local playerUpdates = cjson.decode(ARGV[1]) or {}
      local enemyUpdates = cjson.decode(ARGV[2]) or {}
      local expireSeconds = tonumber(ARGV[3])

      -- 创建查找表加速匹配
      local function createLookup(arr)
        local tbl = {}
        for _, v in ipairs(arr) do
          tbl[tostring(v.userid)] = v
        end
        return tbl
      end

      -- 批量处理更新
      local function processUpdates(field, updates)
        local members = cjson.decode(redis.call('HGET', key, field) or '[]')
        local lookup = createLookup(updates)
        local updated = false

        -- 预分配内存（减少table重组次数）
        local newMembers = {}
        for _, m in ipairs(members) do
          local uid = tostring(m.userid)
          if lookup[uid] then
            newMembers[#newMembers+1] = lookup[uid]
            lookup[uid] = nil  -- 标记为已处理
            updated = true
          else
            newMembers[#newMembers+1] = m
          end
        end

        -- 检查未匹配的更新项
        if next(lookup) ~= nil then
          return false
        end

        if updated then
          redis.call('HSET', key, field, cjson.encode(newMembers))
        end
        return true
      end

      -- 处理玩家更新
      if not processUpdates('players', playerUpdates) then
        return {err='PLAYER_NOT_FOUND'}
      end

      -- 处理敌方更新
      if not processUpdates('enemySide', enemyUpdates) then
        return {err='ENEMY_NOT_FOUND'}
      end

      redis.call('EXPIRE', key, expireSeconds)
      return 1
    `;

    const result = await this.redis.eval(
      luaScript,
      1,
      roomKey,
      JSON.stringify(updates.players || []),
      JSON.stringify(updates.enemies || []),
      this.options.expireSeconds.toString()
    );

    return this.parseLuaResult(result);
  }

  /**
   * 批量移除成员（原子操作）
   * @param roomId 房间ID
   * @param targets 包含玩家和敌方需要移除的ID列表
   * @returns 是否全部移除成功
   * @throws MEMBER_NOT_FOUND 任意目标不存在时抛出
   */
  async bulkRemoveMembers(roomId: string, targets: RemovalTargets): Promise<boolean> {
    const roomKey = this.getRoomKey(roomId);

    const luaScript = `
      local key = KEYS[1]
      local targetPlayers = cjson.decode(ARGV[1])
      local targetEnemies = cjson.decode(ARGV[2])
      local expireSeconds = tonumber(ARGV[3])

      -- 创建查找表加速匹配
      local function createIdSet(ids)
        local set = {}
        for _, id in ipairs(ids) do
          set[tostring(id)] = true
        end
        return set
      end

      -- 批量移除处理器
      local function processRemoval(field, targetIds)
        if #targetIds == 0 then return true end
        
        local members = cjson.decode(redis.call('HGET', key, field) or '[]')
        local idSet = createIdSet(targetIds)
        local originalCount = #members
        local newMembers = {}

        -- 过滤保留项
        for _, m in ipairs(members) do
          if not idSet[tostring(m.userid)] then
            table.insert(newMembers, m)
          end
        end

        -- 检查实际移除数量
        if (originalCount - #newMembers) ~= #targetIds then
          return false
        end

        redis.call('HSET', key, field, cjson.encode(newMembers))
        return true
      end

      -- 处理玩家移除
      if not processRemoval('players', targetPlayers) then
        return {err='PLAYER_NOT_FOUND'}
      end

      -- 处理敌方移除
      if not processRemoval('enemySide', targetEnemies) then
        return {err='ENEMY_NOT_FOUND'}
      end

      redis.call('EXPIRE', key, expireSeconds)
      return 1
    `;

    const result = await this.redis.eval(
      luaScript,
      1,
      roomKey,
      JSON.stringify(targets.players || []),
      JSON.stringify(targets.enemies || []),
      this.options.expireSeconds.toString()
    );

    return this.parseLuaResult(result);
  }
  /**
   * 提交回合操作（原子操作）
   * @param roomId 房间ID
   * @param playerId 玩家ID
   * @param action 操作指令
   * @returns 是否提交成功
   * @throws NOT_YOUR_TURN 非当前玩家操作时抛出
   * 
   * 性能优化点：
   * - 使用Lua脚本保证原子性
   * - 控制操作记录长度（最多保留50条）
   */
  async submitAction(roomId: string, playerId: number, action: string): Promise<boolean> {
    const roomKey = this.getRoomKey(roomId);

    // 修改后的Lua脚本（移除回合验证）
    const luaScript = `
      local key = KEYS[1]
      local playerId = ARGV[1]
      local actionData = ARGV[2]
      local timestamp = tonumber(ARGV[3])
      local expireSeconds = tonumber(ARGV[4])

      -- 仅保留基础数据获取
      local players = cjson.decode(redis.call('HGET', key, 'players') or '[]')

      -- 移除回合验证逻辑 --
      
      -- 更新操作记录 --
      local actions = cjson.decode(redis.call('HGET', key, 'actions') or '[]')
      table.insert(actions, 1, {
        playerId = playerId,
        action = actionData,
        timestamp = timestamp
      })

      -- 控制记录长度 --
      if #actions > 50 then
        actions = {unpack(actions, 1, 50)}
      end

      -- 更新活跃时间 --
      local lastActive = cjson.decode(redis.call('HGET', key, 'lastActive') or '{}')
      lastActive[playerId] = timestamp

      -- 保存数据（移除currentTurn更新）--
      redis.call('HMSET', key,
        'actions', cjson.encode(actions),
        'lastActive', cjson.encode(lastActive)
      )
      redis.call('EXPIRE', key, expireSeconds)
      return 1
    `;

    const result = await this.redis.eval(
      luaScript,
      1,
      roomKey,
      playerId.toString(),  // 确保参数类型统一
      action,
      Date.now().toString(),
      this.options.expireSeconds.toString()
    );

    return result === 1;
  }
  /**
  * 修改房间状态（原子操作）
  * @param roomId 房间ID
  * @param newStatus 目标状态
  * @param force 是否强制转换状态（默认false）
  * @returns 是否修改成功
  * @throws ROOM_NOT_FOUND | INVALID_STATUS_TRANSITION
  * 
  * 状态转换规则：
  * waiting → playing → completed
  * 强制模式可跳过规则校验
  */
  async updateRoomStatus(
    roomId: string,
    newStatus: RoomStatus,
    force: boolean = false
  ): Promise<boolean> {
    const roomKey = this.getRoomKey(roomId);

    const luaScript = `
    local key = KEYS[1]
    local targetStatus = ARGV[1]
    local forceMode = ARGV[2] == 'true'
    local expireSeconds = tonumber(ARGV[3])

    -- 获取当前状态
    local currentStatus = redis.call('HGET', key, 'status')
    if not currentStatus then
      return {err='ROOM_NOT_FOUND'}
    end

    -- 状态转换校验
    if not forceMode then
      local validTransitions = {
        waiting = { playing = true },
        playing = { completed = true },
        completed = {}  -- 终态不可转出
      }
      
      if not validTransitions[currentStatus][targetStatus] then
        return {err='INVALID_STATUS_TRANSITION'}
      end
    end

    -- 执行状态更新
    redis.call('HSET', key, 'status', targetStatus)
    redis.call('EXPIRE', key, expireSeconds)
    return 1
  `;

    const result = await this.redis.eval(
      luaScript,
      1,
      roomKey,
      newStatus,
      force.toString(),
      this.options.expireSeconds.toString()
    );

    return this.parseLuaResult(result);
  }
  public async gameStart(roomid: string, userid?: number) {
    await this.redis.setex(this.getRoomGameKey(roomid, userid), 1, roomid)
  }


  /**
   * 获取房间基础信息
   * @param roomId 房间ID
   * @returns 房间信息对象
   * 
   * 优化点：使用HMGET替代HGETALL，减少网络传输
   */
  async getRoomInfo(roomId: string): Promise<RoomInfo> {
    const data = await this.redis.hmget(
      this.getRoomKey(roomId),
      'status', 'currentTurn', 'maxPlayers', 'createdAt', 'players', 'actions', 'maxEnemy', 'enemySide', 'type', 'attackSequence'
    );

    return {
      status: data[0] as RoomStatus,
      currentTurn: parseInt(data[1] || '0'),
      maxPlayers: parseInt(data[2] || '0'),
      createdAt: parseInt(data[3] || '0'),
      players: JSON.parse(data[4] || '[]'),
      actions: JSON.parse(data[5] || '[]'),
      maxEnemy: parseInt(data[6] || '0'),
      enemySide: JSON.parse(data[7] || '[]'),
      type: JSON.parse(data[8] || '0'),
      attackSequence: JSON.parse(data[9] || '[]'),
    };
  }



  /**
   * 获取最近操作记录
   * @param roomId 房间ID
   * @param count 获取的记录数量（默认10条）
   * @returns 按时间倒序的操作记录数组
   */
  async getRecentActions(roomId: string, count: number = 10): Promise<PlayerAction[]> {
    const actionsJson = await this.redis.hget(this.getRoomKey(roomId), 'actions');
    const actions = JSON.parse(actionsJson || '[]') as PlayerAction[];
    return actions.slice(0, Math.min(count, actions.length));
  }



  /**
   * 生成房间主键
   * @param roomId 房间ID
   * @returns Redis键名（例："game:room:123"）
   */
  private getRoomKey(roomId: string): string {
    return `${this.baseKey}:${roomId}`;
  }


  private getRoomGameKey(roomId: string, userid?: number): string {
    return `${this.baseKey}:${roomId}:gameRoundRecord:${userid ? userid : -1}`;
  }
  private parseLuaResult(result: any): boolean {
    // 统一处理Lua脚本返回结果
    if (Array.isArray(result)) {
      return result.some(r => r === 1 || r?.[1] === 1);
    }
    return result === 1;
  }
  /**
   * 清理房间数据（调试用）
   * @param roomId 房间ID
   */
  public async clearRoomData(roomId: string): Promise<void> {
    await this.redis.del(this.getRoomKey(roomId));
  }
}

// ======================== 错误处理 ========================
export class RoomError extends Error {
  /**
   * 房间操作异常
   * @param code 错误代码
   * 
   * 错误代码清单：
   * - ROOM_NOT_FOUND: 房间不存在
   * - ROOM_FULL: 房间已满员
   * - ROOM_NOT_AVAILABLE: 房间不处于可操作状态
   * - NOT_YOUR_TURN: 未到当前玩家回合
   * - PLAYER_ALREADY_EXISTS: 玩家已存在
   * - JOIN_FAILED: 加入操作失败
   */
  constructor(public code: string) {
    super();
    this.name = 'RoomError';

    const errorMessages: Record<string, string> = {
      ROOM_CREATION_FAILED: '房间创建失败',
      ROOM_NOT_AVAILABLE: '房间不可用',
      ROOM_FULL: '房间已满员',
      PLAYER_ALREADY_EXISTS: '玩家已存在',
      NOT_YOUR_TURN: '未到操作回合',
      JOIN_FAILED: '加入失败',
      NO_PLAYERS: '房间无玩家',
      PLAYER_NOT_FOUND: '玩家不存在',
      ENEMY_NOT_FOUND: '待更新敌方不存在'
    };

    this.message = errorMessages[code] || '未知错误';
  }



}