import { Router } from 'express';
import HelloRouter from './helloRouter';
export interface RouterRegister {
    register(router: Router): any
}
/**
 * 注册路由
 */
export class RootRouter {
    router: Router
    constructor(router: Router) {
        this.router = router
    }
    init(): Router {
        new HelloRouter().register(this.router)
        return this.router
    }
}







