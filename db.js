// db.js
const mysql = require("mysql2/promise");

// 更改为使用内部连接 URL (MYSQL_URL)
// 内部连接安全且稳定，是应用服务连接数据库的首选
const url = process.env.MYSQL_URL; // <--- 关键修改!

if (!url) {
    // 检查 MYSQL_URL 而不是 MYSQL_PUBLIC_URL
    console.error("❌ MYSQL_URL 未找到，请检查 Railway Variables");
    process.exit(1);
}

console.log("正在连接数据库:", url);

const pool = mysql.createPool(url);

module.exports = pool;