import { MainServer } from "./mainServer"
class App {
    async start() {
        await new MainServer().start()
    }
}
new App().start()
process.on('uncaughtException', (err: Error) => {
    console.error('Uncaught Exception:', err.stack);
    process.exit(1);
});

// 处理未处理的 Promise 拒绝
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});