import { BoosService } from './boss/bossService';
import { UserService } from './user/userService';
interface IServiceMsg {
  [key: string]: (...args: any[]) => any
}

//客户端消息协议
export const ClientMsgMp: IServiceMsg = {
  /**
   * 选择boss
   */
  'RISE/BOSS/CHOOSE': BoosService.chooseBoos,
  /**
   * boss信息
   */
  'RISE/BOSS/INFO': BoosService.findBoos,
  /**
   * 对boss发起攻击
   */
  'RISE/BOSS/ATTACK': BoosService.attackBoos,

  /**
    * 选择一份职业
    */
  'RISE/USER/CHOOSEACAREER': UserService.chooseACareer
}


export const ServiceMsgMp: Record<string, string> = {
  'RISE/BOSS/CHOOSE': 'SERVICE/RISE/BOSS/CHOOSE',
  'RISE/BOSS/INFO': 'SERVICE/RISE/BOSS/INFO',
  'RISE/BOSS/ATTACK': 'SERVICE/RISE/BOSS/ATTACK',
  'RISE/USER/CHOOSEACAREER': 'SERVICE/RISE/USER/CHOOSEACAREER'
}