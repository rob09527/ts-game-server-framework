
import express from 'express';
import { helper } from '../util/helper';
import { expressblock } from './serviceSecurity';
import { errorHandler } from './errorExpress';
import { proxyMiddleware } from './proxyMiddleware';
import { createServer } from 'http';
import { IoServer } from './ioServer';


export class AppBootstrap {
    /**
     * express 初始化
     */
    start() {
        const app = express();
        app.use(expressblock)
        app.use(proxyMiddleware)
        app.use(errorHandler)
        const httpServer = createServer(app);
        new IoServer(httpServer)
        app.listen(helper.config.port, helper.config.host, () => {
            helper.log.info(`App listening at ${helper.config.host}:${helper.config.port}`)
        });

    }
}



