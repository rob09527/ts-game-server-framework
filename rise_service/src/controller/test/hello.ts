import { Request, Response } from "express";

class HelloService {
    public async test(req: Request, res: Response) {
        res.send('hi')
    }

}
export default HelloService