import { NextFunction, Request, Response } from 'express';
import { helper } from '../util/helper';
/**
 * 检查所有通过的路由
 */
export function expressblock(req: Request, res: Response, next: NextFunction) {
    helper.log.info('router:', req.url)
    next()
}