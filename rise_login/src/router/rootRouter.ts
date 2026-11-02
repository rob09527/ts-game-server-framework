import { Router } from 'express';
import UserRouter from './userRouter';
export interface RouterRegister {
    register(router: Router): any
}

export class RootRouter {
    router: Router
    constructor(router: Router) {
        this.router = router
    }
    init(): Router {
        new UserRouter().register(this.router)

        return this.router
    }
}







