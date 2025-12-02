// db.js
const mysql = require("mysql2/promise");
require('dotenv').config();

let poolConfig = {
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // Railway 内部连接通常需要 SSL，但我们要允许自签名证书
    ssl: {
        rejectUnauthorized: false
    }
};

try {
    if (process.env.MYSQL_URL) {
        console.log("[Database] 正在使用 Railway MYSQL_URL...");
        
        // 关键修改：手动解析 URL，防止密码中的特殊字符导致解析失败
        const dbUrl = new URL(process.env.MYSQL_URL);
        
        poolConfig.host = dbUrl.hostname;
        poolConfig.user = dbUrl.username;
        poolConfig.password = dbUrl.password;
        poolConfig.database = dbUrl.pathname.replace(/^\//, ''); // 去掉开头的 /
        poolConfig.port = Number(dbUrl.port) || 3306;

        // 安全打印调试信息 (只显示密码前2位)
        const maskedPwd = poolConfig.password ? 
            `${poolConfig.password.substring(0, 2)}******` : "无密码";
            
        console.log(`[Database] 解析结果 -> Host: ${poolConfig.host}, User: ${poolConfig.user}, Pwd: ${maskedPwd}`);
        
    } else if (process.env.DB_HOST) {
        console.log("[Database] 正在使用本地 .env 变量...");
        poolConfig.host = process.env.DB_HOST;
        poolConfig.user = process.env.DB_USER;
        poolConfig.password = process.env.DB_PASSWORD;
        poolConfig.database = process.env.DB_NAME;
        poolConfig.port = process.env.DB_PORT || 3306;
    } else {
        throw new Error("未找到任何数据库配置 (MYSQL_URL 或 DB_HOST)");
    }

    // 创建连接池
    const pool = mysql.createPool(poolConfig);
    module.exports = pool;

} catch (err) {
    console.error("❌ [Database] 配置初始化失败:", err.message);
    process.exit(1);
}