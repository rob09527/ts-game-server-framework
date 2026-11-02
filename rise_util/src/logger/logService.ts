import { getLogger, Logger } from "log4js"

export default class Log {
    public getlogger(level: string): Logger {
        var logger = getLogger()
        logger.level = level
        return logger
    }

}


