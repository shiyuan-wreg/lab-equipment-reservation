// my-equipment-booking-backend/db.js
const mysql = require("mysql2/promise");

// --- 读取 Railway 提供的环境变量 ---
const railwayHost = process.env.MYSQL_HOST;
const railwayUser = process.env.MYSQL_USER;
const railwayPassword = process.env.MYSQL_PASSWORD;
const railwayDatabase = process.env.MYSQL_DATABASE;
const railwayPort = process.env.MYSQL_PORT;

// 如果 Railway 提供了 MYSQL_PUBLIC_URL（最稳定的连接方式）
const publicUrl = process.env.MYSQL_PUBLIC_URL;

let pool;

if (publicUrl) {
    console.log("[数据库] 检测到 Railway MYSQL_PUBLIC_URL，使用 URL 方式连接...");
    pool = mysql.createPool(publicUrl);
} else if (railwayHost && railwayUser && railwayPassword && railwayDatabase) {
    console.log("[数据库] 检测到 Railway 环境变量，使用 Railway 内部数据库配置...");
    pool = mysql.createPool({
        host: railwayHost,
        user: railwayUser,
        password: railwayPassword,
        database: railwayDatabase,
        port: railwayPort ? parseInt(railwayPort, 10) : 3306,
    });
} else {
    console.log("[数据库] 未检测到 Railway 环境变量，使用本地开发数据库配置...");
    pool = mysql.createPool({
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER || "your_local_user",
        password: process.env.DB_PASSWORD || "your_local_password",
        database: process.env.DB_NAME || "equipment_booking_db",
        port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
    });
}

// 测试数据库连接
(async () => {
    try {
        console.log("[诊断] 正在测试数据库连接...");
        const conn = await pool.getConnection();
        console.log("[诊断] ✅ 数据库连接成功！");
        conn.release();
    } catch (err) {
        console.error("[诊断] ❌ 数据库连接失败:", err);
    }
})();

module.exports = pool;
