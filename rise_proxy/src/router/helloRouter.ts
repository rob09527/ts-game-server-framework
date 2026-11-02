import HelloService from '../controller/test/hello';
import { Router } from "express";
import { RouterRegister } from './rootRouter';


class HelloRouter implements RouterRegister {
    public register(router: Router) {
        router.get('/hello', new HelloService().test)
    }
}
export default HelloRouter