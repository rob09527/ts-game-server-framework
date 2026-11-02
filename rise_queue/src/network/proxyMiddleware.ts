
import { Request, NextFunction, Response } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

// 代理中间件工厂函数
function createProxyMiddlewareBasedOnUrl(url: string) {
    if (!url) {
        throw new Error('Missing URL in the request body');
    }
    // 根据提供的 URL 创建代理配置
    const proxyConfig = {
        target: url,
        changeOrigin: true, // 如果需要跨域，则启用此选项
        pathRewrite: {
            // 如果需要，可以重写请求路径
            // '^/old-path': '/new-path',
        },
        // 其他代理配置...
    };
    return createProxyMiddleware(proxyConfig);
}

export async function proxyMiddleware(req: Request, res: Response, next: NextFunction) {
    const proxys = createProxyMiddlewareBasedOnUrl(res.getHeader('proxy_url') as string)
    await proxys(req, res, next)
    return
}