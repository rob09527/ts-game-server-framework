import express from 'express';
import { helper } from '../util/helper';
import { createServer } from 'http';
import { expressblock } from './serviceSecurity';
import { RootRouter } from '../router/rootRouter';

export class AppBootstrap {
    start() {
        const app = express();
        // 新增：请求体解析中间件（必须放在路由之前）
        app.use(express.json()); // 解析JSON格式请求体
        app.use(express.urlencoded({ extended: true })); // 解析表单格式请求体
        // 安全中间件
        app.use(expressblock);

        // 路由配置
        let router = express.Router()
        const routerServer = new RootRouter(router)
        const httpServer = createServer(app);
        // 确保路由挂载
        app.use('/rise/v1/auth', routerServer.init())

        httpServer.listen(helper.config.port, helper.config.host, () => {
            helper.log.info(`App listening at ${helper.config.host}:${helper.config.port}`)
        });
    }
}