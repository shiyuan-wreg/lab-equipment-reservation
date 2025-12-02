// db.js
const mysql = require("mysql2/promise");
require('dotenv').config(); // 确保加载本地 .env

let pool;

// 优先检查是否有完整的连接字符串 (Railway 模式)
if (process.env.MYSQL_URL) {
    console.log("[Database] 检测到 MYSQL_URL，使用连接字符串模式...");
    pool = mysql.createPool({
        uri: process.env.MYSQL_URL,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        ssl: { rejectUnauthorized: false } // 解决 Railway 内部连接可能的 SSL 问题
    });
} 
// 如果没有 URL，则检查分散的变量 (本地开发模式)
else if (process.env.DB_HOST) {
    console.log("[Database] 未检测到 MYSQL_URL，使用本地独立变量模式...");
    pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });
} else {
    console.error("❌ [Database] 致命错误: 未找到任何数据库配置变量！");
    process.exit(1);
}

module.exports = pool;