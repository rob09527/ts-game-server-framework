import { NetworkStatusCode } from "src/enum/networkStatusCode";


export interface ServiceResume {
    name: string,
    address: string,
    host: string,
    port: number,
    state: ServiceResumeEnum
    update: number,
    create: number,
}

export enum ServiceResumeEnum {
    /**
     * 服务器正常开启
     */
    NORMAL = 1,
    /**
     * 关闭状态
     */
    CLOSURE = 2
}

export interface ClientMessageEnvelope {
    type: 'http' | 'ws' | 'grpc';
    endpoints: string;
    msg: any,
}
export interface MessageEnvelope {
    code: NetworkStatusCode;
    msg: any,
}


export const ServiceRouter: any = {
    game: 'rise_service',
    queue: 'rise_queue',
    proxy: 'rise_proxy',
    login: 'rise_login'
}
