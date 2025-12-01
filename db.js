// my-equipment-booking-backend/db.js
const mysql = require('mysql2/promise');

// --- 优先使用 Railway 提供的环境变量 (通常是大写且带下划线) ---
// 如果这些变量在 Railway 上存在，它们会覆盖 .env 中的 DB_* 变量
const railwayHost = process.env.MYSQL_HOST; // Railway 注入的标准变量名
const railwayUser = process.env.MYSQL_USER;
const railwayPassword = process.env.MYSQL_PASSWORD;
const railwayDatabase = process.env.MYSQL_DATABASE;
const railwayPort = process.env.MYSQL_PORT;

let dbConfig;

if (railwayHost && railwayUser && railwayPassword && railwayDatabase) {
    // 如果 Railway 环境变量存在，则使用它们
    console.log('[数据库] 检测到 Railway 环境变量，使用 Railway 数据库配置...');
    dbConfig = {
        host: railwayHost,
        user: railwayUser,
        password: railwayPassword,
        database: railwayDatabase,
        port: railwayPort ? parseInt(railwayPort, 10) : 3306,
    };
} else {
    // 否则，回退到 .env 文件或默认的本地配置
    console.log('[数据库] 未检测到 Railway 环境变量，使用 .env 或默认本地配置...');
    dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'your_local_user',
        password: process.env.DB_PASSWORD || 'your_local_password',
        database: process.env.DB_NAME || 'equipment_booking_db',
        port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
    };
}

console.log('[数据库] 尝试连接到:', dbConfig.host, ':', dbConfig.port, ' 数据库:', dbConfig.database);

const pool = mysql.createPool(dbConfig);

module.exports = pool;