import express from 'express';
import { helper } from '../util/helper';
import { createServer } from 'http';
import { expressblock, expressError } from './serviceSecurity';
import { IoServer } from './ioServer';
import { RootRouter } from '../router/rootRouter';

export class AppBootstrap {
    start() {
        const app = express();
        app.use(expressblock)
        let router = express.Router()
        const routerServer = new RootRouter(router)
        app.use(routerServer.init())
        const httpServer = createServer(app);
        new IoServer(httpServer)
        app.use('/', router)
        app.use(expressError)
        httpServer.listen(helper.config.port, helper.config.host, () => {
            helper.log.info(`App listening at ${helper.config.host}:${helper.config.port}`)
        });

    }

}

