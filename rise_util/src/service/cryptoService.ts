import crypto from "crypto"; // Node.js 内置模块

export default class CryptoService {
    /**
     * 基础MD5加密
     * @param content 需要加密的字符串
     * @returns 32位十六进制哈希值
     */
    public static md5(content: string): string {
        if (typeof content !== "string") {
            throw new Error("MD5 input must be a string");
        }
        return crypto
            .createHash("md5")
            .update(content, "utf8")
            .digest("hex");
    }

    /**
     * 带盐值的增强加密（推荐）
     * @param content 原始内容
     * @param salt 加密盐值
     * @returns 加盐后的MD5哈希
     */
    public static md5WithSalt(content: string, salt: string): string {
        return this.md5(content + salt);
    }

    /**
     * 生成随机盐值（安全增强）
     * @param byteSize 盐值字节长度（默认16字节）
     */
    public static generateSalt(byteSize = 16): string {
        return crypto.randomBytes(byteSize).toString("hex");
    }
}

