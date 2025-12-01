// my-equipment-booking-backend/db.js
const mysql = require('mysql2/promise');

// --- 从 Railway 注入的正确环境变量名 ---
// 注意：Railway 使用的是大写，带下划线的命名法
const railwayDbConfig = {
    host: process.env.MYSQL_HOST || 'localhost',           // 使用 MYSQL_HOST
    user: process.env.MYSQL_USER || 'your_app_user',       // 使用 MYSQL_USER
    password: process.env.MYSQL_PASSWORD || 'your_password', // 使用 MYSQL_PASSWORD
    database: process.env.MYSQL_DATABASE || 'equipment_booking_db', // 使用 MYSQL_DATABASE
    port: process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT, 10) : 3306, // 使用 MYSQL_PORT
};

// --- 移除本地开发配置和复杂的判断逻辑 ---
// 直接使用 railwayDbConfig
const dbConfig = railwayDbConfig;

console.log('[数据库] 尝试连接到:', dbConfig.host, ':', dbConfig.port, ' 数据库:', dbConfig.database);

// 创建连接池
const pool = mysql.createPool(dbConfig);

module.exports = pool;