import { MainServer } from "./mainServer"
class App {
    async start() {
        await new MainServer().start()
    }
}
new App().start()