// my-equipment-booking-backend/db.js
const mysql = require('mysql2/promise');

// --- Railway 兼容配置 ---
// Railway 提供的 MySQL 环境变量 (注意变量名)
const railwayDbConfig = {
    host: process.env.MYSQLHOST,           // 注意是 MYSQLHOST
    user: process.env.MYSQLUSER,           // 注意是 MYSQLUSER
    password: process.env.MYSQLPASSWORD,   // 注意是 MYSQLPASSWORD
    database: process.env.MYSQLDATABASE,   // 注意是 MYSQLDATABASE
    port: process.env.MYSQLPORT ? parseInt(process.env.MYSQLPORT, 10) : 3306, // 注意是 MYSQLPORT
};

// 本地开发环境变量 (如果 Railway 变量不存在则使用这些)
const localDbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'your_app_user', // 你本地的用户名
    password: process.env.DB_PASSWORD || 'your_password', // 你本地的密码
    database: process.env.DB_NAME || 'equipment_booking_db',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
};

// 选择配置：优先使用 Railway 的变量，否则使用本地的
// 关键在于判断 railwayDbConfig.host 是否存在且非空
const dbConfig = (railwayDbConfig.host && railwayDbConfig.host !== '') ? railwayDbConfig : localDbConfig;

console.log('[数据库] 尝试连接到:', dbConfig.host, dbConfig.database); // 日志确认使用了哪个配置

// 创建连接池
const pool = mysql.createPool(dbConfig);

module.exports = pool;