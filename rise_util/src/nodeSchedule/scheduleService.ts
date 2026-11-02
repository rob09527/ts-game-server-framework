import schedule from 'node-schedule';

// *    *    *    *    *    *
// ┬    ┬    ┬    ┬    ┬    ┬
// │    │    │    │    │    │
// │    │    │    │    │    └ day of week (0 - 7) (0 or 7 is Sun)
// │    │    │    │    └───── month (1 - 12)
// │    │    │    └────────── day of month (1 - 31)
// │    │    └─────────────── hour (0 - 23)
// │    └──────────────────── minute (0 - 59)
// └───────────────────────── second (0 - 59, OPTIONAL)
export default class ScheduleService {
    constructor() {
        this.scheduleManager = new Map()
        this.scheduleName = {}

    }
    //存在的定时器
    public scheduleManager: Map<string, schedule.Job>
    //已经注册定时器名字  name=>1
    public scheduleName: Record<string, boolean>
    /**
     * 启动一个定时任务
     * @param spec 
     * @param name 
     * @param fun 
     */
    public addJob(spec: schedule.Spec, name: string, fun: schedule.JobCallback) {
        if (this.scheduleManager.get(name)) {
            throw ('job exist')
        }
        const job = schedule.scheduleJob(spec, fun);
        this.scheduleManager.set(name, job)
        this.scheduleName[name] = true
    }

    /**
     * 取消定时任务
     * @param name 
     * @returns 
     */
    public cancelJob(name: string): boolean {
        if (this.scheduleManager.get(name)) {
            let cancelResult = this.scheduleManager.get(name)?.cancel()
            this.scheduleManager.delete(name)
            delete this.scheduleName[name]
            return cancelResult == undefined ? false : cancelResult
        }
        return false
    }
}

