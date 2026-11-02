import HelloService from '../controller/test/hello';
import { RouterRegister } from './rootRouter';
import { Router } from "express";


class HelloRouter implements RouterRegister {
    public register(router: Router) {
        router.get('/hello', new HelloService().test);
    }

}
export default HelloRouter;
