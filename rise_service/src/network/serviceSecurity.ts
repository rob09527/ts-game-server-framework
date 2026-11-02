import { NextFunction, Request, Response, ErrorRequestHandler } from 'express';
import { helper } from '../util/helper';
/**
 * 检查所有通过的路由
 */
export function expressblock(req: Request, res: Response, next: NextFunction) {
    helper.log.info('router:', req.url)
    next()
}


interface ErrorWithCode extends Error {
    statusCode?: number;
    code?: string;
}

export const expressError = (
    err: ErrorWithCode,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // 安全访问可能未定义的属性
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    // 记录带上下文的错误日志
    console.error(`[${new Date().toISOString()}] Error in ${req.method} ${req.path}:`, {
        error: err.stack,
        params: req.params,
        query: req.query,
        body: req.body
    });

    // 区分开发与生产环境响应
    res.status(statusCode).json({
        success: false,
        code: statusCode,
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

