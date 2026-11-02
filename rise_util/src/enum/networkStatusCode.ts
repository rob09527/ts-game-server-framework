/**
 * 网络层核心状态码枚举
 * 涵盖连接、传输、安全等基础网络状态
 */
export enum NetworkStatusCode {
    SUCCESS = 200,
    UNKNOWN_ERROR = 404,
    /**
     * 用户存在
     */
    USER_EXIST = 10005,
    /**
     * 用户不存在
     */
    USER_NOT_EXIST = 10006,
    /**
     * 密码错误
     */
    PASSWORD_ERROR = 10007,
    /**
     * 关闭服务器
     */
    SERVICE_CLOSE = 10008,
    /**
     * 服务器错误
     */
    SERVER_ERROR = 1010,

    /**
     * 客户端与服务器握手成功
     * 底层协议层已建立可靠通信通道
     */
    CONNECTION_ESTABLISHED = 1001,

    /**
     * 安全证书验证失败
     * 常见于HTTPS/TLS证书域名不匹配或过期场景
     */
    SSL_CERTIFICATE_INVALID = 1002,

    /**
     * 请求超时未收到响应
     * 需检查网络延迟或服务器处理能力
     */
    REQUEST_TIMEOUT = 1003,

    /**
     * 服务器返回非预期数据格式
     * 通常由协议版本不匹配或数据序列化错误导致
     */
    PROTOCOL_DESERIALIZATION_FAILED = 1004,

    /**
     * 服务器主动拒绝连接
     * 可能触发于IP黑名单或连接数超限
     */
    CONNECTION_REJECTED = 1005,

    /**
     * 网络层流量控制激活
     * 客户端需降低请求频率避免被限流
     */
    TRAFFIC_THROTTLING_ACTIVE = 1006,

    /**
     * WebSocket长连接心跳丢失
     * 建议执行重连策略恢复通信
     */
    WEBSOCKET_HEARTBEAT_LOST = 1007,

    /**
     * DNS解析失败
     * 需检查域名配置或本地DNS设置
     */
    DNS_RESOLUTION_FAILURE = 1008,

    /**
     * 客户端网络层缓冲区溢出
     * 可能因高频发送大包导致，需优化数据分片策略
     */
    NETWORK_BUFFER_OVERFLOW = 1009,

    /**
     * 移动网络环境切换（如4G/WiFi）
     * 需重建长连接保证传输稳定性
     */
    MOBILE_NETWORK_HANDOVER = 1010,

    /**
     * 服务端开启强制协议升级
     * 客户端必须升级到指定版本才能继续通信
     */
    PROTOCOL_VERSION_DEPRECATED = 1011,

    /**
     * 代理服务器认证失败
     * 需提供有效凭据或检查代理配置
     */
    PROXY_AUTHENTICATION_REQUIRED = 1012,

    /**
     * 网络层丢包率超过阈值
     * 建议切换网络环境或启用前向纠错
     */
    PACKET_LOSS_RATE_CRITICAL = 1013,

    /**
     * UDP传输校验和错误
     * 数据完整性验证失败，需触发重传
     */
    UDP_CHECKSUM_MISMATCH = 1014,

    /**
     * HTTP/2流控制窗口溢出
     * 需调整多路复用参数优化吞吐量
     */
    HTTP2_STREAM_CONTROL_ERROR = 1015,

    /**
     * WebRTC NAT穿透失败
     * 可能需启用TURN中继服务器
     */
    NAT_TRAVERSAL_FAILURE = 1016,

    /**
     * 客户端IP被列入灰名单
     * 限制性访问状态，需联系管理员解除
     */
    IP_GRAYLIST_RESTRICTION = 1017,

    /**
     * 服务端开启地理围栏限制
     * 当前区域禁止访问特定服务
     */
    GEO_FENCING_BLOCKED = 1018,

    /**
     * 网络层硬件加速异常
     * 需检查网卡驱动或回退软件处理模式
     */
    HARDWARE_OFFLOAD_FAILURE = 1019,

    /**
     * 服务端链路负载均衡重定向
     * 自动切换最优服务节点无需客户端干预
     */
    LOAD_BALANCER_REDIRECT = 1020
}