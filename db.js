// my-equipment-booking-backend/db.js
const mysql = require('mysql2/promise');

// --- 使用 Railway 注入的正确环境变量名 ---
const railwayDbConfig = {
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root', // Railway 默认用户是 root
    password: process.env.MYSQL_PASSWORD || 'your_password',
    database: process.env.MYSQL_DATABASE || 'railway', // 关键：使用 MYSQL_DATABASE，它是 railway
    port: process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT, 10) : 3306,
};

const dbConfig = railwayDbConfig;

console.log('[数据库] 尝试连接到:', dbConfig.host, ':', dbConfig.port, ' 数据库:', dbConfig.database);

const pool = mysql.createPool(dbConfig);

module.exports = pool;