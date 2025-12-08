// db.js
// 1. 导入 promise 接口
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
// 导入 Node.js 内置的 URL 模块
const { URL } = require('url');

// --- 移除 Prisma 相关代码 ---
// const { PrismaClient } = require('@prisma/client');
// const prisma = new PrismaClient();
// module.exports = prisma;
// --------------------------

dotenv.config();

let dbConfig;

// 优先使用 Railway 注入的 MYSQL_URL
const railwayDbUrl = process.env.MYSQL_URL;
console.log('--- 环境变量调试 ---');
console.log('PORT:', process.env.PORT);
console.log('MYSQL_URL 存在性:', !!process.env.MYSQL_URL);
console.log('MYSQL_URL 长度:', process.env.MYSQL_URL ? process.env.MYSQL_URL.length : 'N/A');
console.log('--------------------');

if (railwayDbUrl) {
    console.log('[数据库] 检测到平台数据库 URL，进行手动解析...');

    try {
        // 关键：手动解析 URL，防止特殊字符导致的解析错误
        const parsedUrl = new URL(railwayDbUrl);

        dbConfig = {
            host: parsedUrl.hostname,
            port: Number(parsedUrl.port) || 3306,
            user: parsedUrl.username,
            password: parsedUrl.password,
            database: parsedUrl.pathname.replace(/^\//, ''), // 移除路径开头的 /
            charset: 'utf8mb4',
            // 2. 关键：添加 SSL 配置以连接 Railway 内部网络
            ssl: {
                rejectUnauthorized: false // 允许自签名证书
            }
        };

    } catch (error) {
        console.error('[数据库] ❌ URL 解析失败！请检查 MYSQL_URL 格式。', error.message);
        process.exit(1);
    }

} else {
    console.log('[数据库] 未检测到平台数据库 URL，使用 .env 文件中的配置...');
    dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'test_db',
        charset: 'utf8mb4'
    };
}

// 打印脱敏后的配置信息
const maskedPwd = dbConfig.password ?
    `${dbConfig.password.substring(0, 2)}******` : "无密码";
console.log(`[数据库] 解析结果 -> Host: ${dbConfig.host}, User: ${dbConfig.user}, Pwd: ${maskedPwd}`);


const pool = mysql.createPool(dbConfig);

async function testConnection() {
    console.log('[诊断] 开始强制性数据库连接测试...');
    let connection;
    try {
        // 确保使用 promise 接口的 getConnection
        connection = await pool.getConnection();

        // 执行简单的查询来确认连接和认证都成功
        const [results] = await connection.execute('SELECT 1 + 1 AS solution');
        console.log('[诊断] ✅ 数据库查询成功:', results[0].solution);

        console.log('[诊断] 数据库连接测试成功!');
        connection.release();
        return true;
    } catch (err) {
        console.error('[诊断] ❌ 数据库连接测试失败!!! 错误详情:');
        console.error(err.message);
        console.error('--- 错误堆栈 ---');
        console.error(err.stack);

        // 关键：如果连接失败，释放连接
        if (connection) connection.release();

        // 返回 Promise.reject 让调用者可以处理错误
        return Promise.reject(err);
    }
}

// 导出 pool 和 testConnection
module.exports = { pool, testConnection };