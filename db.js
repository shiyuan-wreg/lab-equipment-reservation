// db.js
const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config(); // 加载 .env 文件 (本地开发时有用)

let dbConfig;

// --- 关键修改：优先使用 Railway 提供的 MYSQL_URL ---
if (process.env.MYSQL_URL || process.env.DATABASE_URL) {
    console.log('[数据库] 检测到 MYSQL_URL 或 DATABASE_URL 环境变量，使用它进行连接...');
    // mysql2 可以直接接受 URL 形式的连接字符串
    dbConfig = {
        uri: process.env.MYSQL_URL || process.env.DATABASE_URL,
        charset: 'utf8mb4'
    };
} else {
    // 如果没有 MYSQL_URL，则回退到 .env 文件中的配置 (主要用于本地开发)
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
        await connection.ping(); // 发送 ping 命令确认连接活跃
        console.log('[诊断] 数据库连接活跃性检查通过!');
        connection.release(); // 将连接释放回池中
    } catch (err) {
        console.error('[诊断] ❌ 数据库连接测试失败!!! 错误详情:');
        console.error(err);
        console.error('--- 错误对象 ---');
        console.error(JSON.stringify(err, Object.getOwnPropertyNames(err))); // 更详细地打印错误对象
        console.error('--- 错误信息 ---');
        console.error(err.message);
        console.error('--- 错误堆栈 ---');
        console.error(err.stack);
        // 重要：如果数据库连接失败，应用不应该继续启动
        process.exit(1); 
    }
}

module.exports = { pool: promisePool, testConnection };