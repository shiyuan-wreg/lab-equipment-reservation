// db.js
const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

let dbConfig;

// --- 关键修改点 ---
// 1. 直接使用 process.env.MYSQL_URL，它是 Railway 注入的完整 URL
// 2. 不要再尝试去解析它的 host, user, password 等部分，因为 mysql2 可以直接处理 URL
if (process.env.MYSQL_URL) {
    console.log('[数据库] 检测到 MYSQL_URL 环境变量，使用它进行连接...');
    // mysql2 支持直接传入 URL 字符串
    dbConfig = {
        uri: process.env.MYSQL_URL,
        charset: 'utf8mb4'
    };
} else {
    console.log('[数据库] 未检测到 MYSQL_URL，使用 .env 文件中的配置进行连接...');
    dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'test_db',
        charset: 'utf8mb4'
    };
}
// --- 修改结束 ---

console.log('[数据库] 解析结果 ->', dbConfig.uri ? `URL: ${dbConfig.uri.substring(0, 30)}...` : `Host: ${dbConfig.host}, User: ${dbConfig.user}, Pwd: ${'*'.repeat(dbConfig.password?.length || 0)}`);

// 创建数据库连接池
const pool = mysql.createPool(dbConfig);

// 获取连接池的 Promise 包装
const promisePool = pool.promise();

// 测试数据库连接
async function testConnection() {
    console.log('[诊断] 开始强制性数据库连接测试...');
    try {
        const connection = await promisePool.getConnection();
        console.log('[诊断] 数据库连接测试成功!');
        await connection.ping();
        console.log('[诊断] 数据库连接活跃性检查通过!');
        connection.release();
    } catch (err) {
        console.error('[诊断] ❌ 数据库连接测试失败!!! 错误详情:');
        console.error(err);
        console.error('--- 错误对象 ---');
        console.error(JSON.stringify(err, Object.getOwnPropertyNames(err)));
        console.error('--- 错误信息 ---');
        console.error(err.message);
        console.error('--- 错误堆栈 ---');
        console.error(err.stack);
        process.exit(1); 
    }
}

module.exports = { pool: promisePool, testConnection };