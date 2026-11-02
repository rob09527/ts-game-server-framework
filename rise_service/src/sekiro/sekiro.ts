export interface Battle {
    userid: number;
    /** 战斗单位名称（用于战报输出） */
    account: string;
    /** 完整战斗属性集合 */
    attribute: Attribute;
}

interface Attribute {
    /** 生命值（整数）归零即死亡 */
    hp: number;
    /** 速度值决定先手 */
    sp: number;
    /** 基础攻击力（整数） */
    attack: number;
    /** 防御力（整数）直接抵消伤害 */
    defense: number;
    /** 暴击概率 [0-1] */
    critRate: number;
    /** 闪避概率 [0-1] */
    dodge: number;
    /** 固定连击概率 [0-1] */
    combo: number;
    /** 固定反击概率 [0-1] */
    counter: number;
    /** 击晕概率 [0-1] */
    stunRate: number;
    /** 吸血比例 [0-1] */
    lifesteal: number;
    /** 暴击伤害倍数（例:2.0=200%） */
    critDmg: number;
    /** 暴伤减免比例 [0-1] */
    critDmgResist: number;
    /** 全局增伤 [0-1] */
    dmgBonus: number;
    /** 全局减伤 [0-1] */
    dmgReduce: number;
    /** 治疗增强 [0-1] */
    healBoost: number;
    /** 治疗削弱 [0-1] */
    healReduce: number;
}
/**
 * 忍者战斗模拟器（v4.7 Final）
 * 核心改进：
 * 1. 固定概率系统（连击/反击不衰减）
 * 2. 纯尾部击晕检测
 * 3. 严格整数伤害计算
 * 算法流程图：
 * [攻速判定] → [连击阶段] → [反击检测] → [尾部击晕检测]
 */
export class Sekiro {
    // 配置参数
    public static config = {
        maxCombo: 3 // 最大连击次数限制
    };

    /**
     * 执行战斗流程
     * @returns [战斗日志, 是否触发击晕] 
     */
    public static attackTarget(attacker: Battle, target: Battle): [string[], boolean] {
        const combatLog: string[] = [];
        let currentAttacker = attacker;
        let currentTarget = target;
        let comboCount = 0;

        // 阶段1：先手判定
        combatLog.push(this.generateSpeedLog(attacker, target));

        // 阶段2：连击主循环
        do {
            const { logs, isCounter } = this.executeAttack(
                currentAttacker,
                currentTarget,
                comboCount
            );

            combatLog.push(...logs);

            // 阶段3：固定概率反击检测
            if (isCounter) {
                [currentAttacker, currentTarget] = [currentTarget, currentAttacker];
                combatLog.push(`🔄 ${currentAttacker.account} 发起反击`);
                comboCount = 0; // 重置连击计数器
            }
        } while (comboCount > 0);

        // 阶段4：尾部击晕检测（不影响本次战斗流程）
        const isStunned = Math.random() < attacker.attribute.stunRate;
        combatLog.push(
            isStunned ?
                `💫 ${target.account} 被击晕标记` :
                `⏳ 未触发击晕（概率 ${(attacker.attribute.stunRate * 100).toFixed(1)}%）`
        );

        return [combatLog, isStunned];
    }

    /**
     * 执行单次攻击（含连击）
     * @param comboCount 当前连击次数
     */
    private static executeAttack(
        attacker: Battle,
        target: Battle,
        comboCount: number
    ) {
        const att = attacker.attribute;
        const def = target.attribute;
        const logs: string[] = [];
        let hitCount = 0;

        // 连击循环（固定概率检测）
        while (hitCount < this.config.maxCombo) {
            // 步骤1：闪避检测
            if (Math.random() < def.dodge) {
                logs.push(`❌ ${target.account} 闪避（概率 ${(def.dodge * 100).toFixed(1)}%）`);
                break;
            }

            // 步骤2：整数伤害计算
            let damage = Math.floor(att.attack * (1 + att.dmgBonus - def.dmgReduce));

            // 步骤3：暴击计算
            if (Math.random() < att.critRate) {
                damage = Math.floor(damage * att.critDmg * (1 - def.critDmgResist));
                logs.push(`💥 暴击伤害：${damage}`);
            }

            // 步骤4：防御抵消
            damage = Math.max(damage - def.defense, 0);
            def.hp -= damage;
            logs.push(
                `⚔️ 第${hitCount + 1}击伤害：${damage}`,
                `🩸 ${target.account} 剩余HP：${def.hp}`
            );

            // 步骤5：吸血计算（向下取整）
            if (damage > 0) {
                const heal = Math.floor(
                    damage * att.lifesteal * (1 + att.healBoost - def.healReduce)
                );
                att.hp += heal;
                logs.push(`❤️‍🩹 ${attacker.account} 吸血+${heal}`);
            }

            // 步骤6：连击检测（固定概率）
            if (Math.random() < att.combo) {
                hitCount++;
                logs.push(`🌀 连击继续（${hitCount}/${this.config.maxCombo}）`);
            } else {
                break;
            }
        }

        // 步骤7：固定反击概率检测
        const isCounter = Math.random() < def.counter && def.hp > 0;

        return {
            logs,
            isCounter,
            hitCount: hitCount < this.config.maxCombo ? 0 : hitCount
        };
    }

    /** 生成速度日志 */
    private static generateSpeedLog(a: Battle, b: Battle): string {
        return a.attribute.sp > b.attribute.sp ?
            `⚡ ${a.account} 先攻（速度 ${a.attribute.sp}）` :
            `🛡️ ${b.account} 先攻（速度 ${b.attribute.sp}）`;
    }
}