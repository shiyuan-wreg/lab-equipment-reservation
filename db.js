// my-equipment-booking-backend/db.js
const mysql = require('mysql2/promise');

// --- Railway 兼容配置 ---
// 从 Railway 环境变量获取配置
const railwayDbConfig = {
    host: process.env.MYSQLHOST || 'localhost',           // 如果 MYSQLHOST 不存在，才用 localhost
    user: process.env.MYSQLUSER || 'your_app_user',       // 如果 MYSQLUSER 不存在，才用 your_app_user
    password: process.env.MYSQLPASSWORD || 'your_password', // 如果 MYSQLPASSWORD 不存在，才用 your_password
    database: process.env.MYSQLDATABASE || 'equipment_booking_db', // 如果 MYSQLDATABASE 不存在，才用 equipment_booking_db
    port: process.env.MYSQLPORT ? parseInt(process.env.MYSQLPORT, 10) : 3306, // 如果 MYSQLPORT 不存在，才用 3306
};

// --- 本地开发配置 ---
// 这个配置只在我们明确知道是在本地，并且需要覆盖 Railway 配置时使用
// 通常情况下，我们不需要这个，除非我们想强制本地测试
const localDbConfig = {
    host: 'localhost',
    user: 'your_local_user', // 你的本地用户名
    password: 'your_local_password', // 你的本地密码
    database: 'equipment_booking_db',
    port: 3306,
};

// --- 关键：选择配置 ---
// 我们不再判断 railwayDbConfig.host 是否存在，而是直接使用 railwayDbConfig
// 因为即使 MYSQLHOST 不存在，它也会 fallback 到 'localhost'，这正是我们想要的。
// 如果你真的只想在特定环境下使用 localDbConfig，可以添加一个环境变量来控制，比如 NODE_ENV=local
// const dbConfig = process.env.NODE_ENV === 'local' ? localDbConfig : railwayDbConfig;

// **核心修改：直接使用 railwayDbConfig，因为它已经包含了 fallback**
const dbConfig = railwayDbConfig;

console.log('[数据库] 尝试连接到:', dbConfig.host, ':', dbConfig.port, ' 数据库:', dbConfig.database);

// 创建连接池
const pool = mysql.createPool(dbConfig);

module.exports = pool;