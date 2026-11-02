
import { RouterRegister } from './rootRouter';
import { Router } from "express";
import { UserService } from '../controller/user/UserService';


class UserRouter implements RouterRegister {
    public register(router: Router) {
        router.post('/register', new UserService().register);
        router.post('/login', new UserService().login);
    }
}
export default UserRouter;
