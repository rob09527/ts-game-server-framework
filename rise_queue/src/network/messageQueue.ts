import { NextFunction, Request, Response } from "express"
import { helper } from "../util/helper"
interface MessageQueueDomain {
    message: { req?: Request, res?: Response, next?: NextFunction },
    type: string
}
export class MessageQueue {
    private queue: MessageQueueDomain[] = []
    private processing = false

    public enqueue(info: { message: object, type: string }): void {
        this.queue.push(info)
        this.processQueue()
    }

    private async processQueue(): Promise<void> {
        if (this.processing || this.queue.length === 0) {
            return;
        }
        this.queue[0]
        switch (this.queue[0].type) {
            case "http": await this.messageHttp(); break;
            case "tcp": break;
            default: this.queue.shift(); helper.log.error('error message', this.queue[0]); break;
        }

        this.processing = false;
        this.processQueue()
    }
    public isEmpty(): boolean {
        return this.queue.length === 0
    }

    public size(): number {
        return this.queue.length
    }

    private async messageHttp() {
        const queueMessage = this.queue.shift();
        const myPromise = new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve("foo");
            }, 10000);
        });
        await myPromise
        if (queueMessage?.message.next) {
            queueMessage?.message.res?.setHeader('proxy_url', "http://127.0.0.1:5400")
            queueMessage.message.next()
        }
    }





}



