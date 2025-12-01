const mysql = require("mysql2/promise");

// 必须使用 PUBLIC URL，否则 root 权限不允许内部连接
const url = process.env.MYSQL_PUBLIC_URL;

if (!url) {
    console.error("❌ MYSQL_PUBLIC_URL 未找到，请检查 Railway Variables");
    process.exit(1);
}

console.log("正在连接数据库:", url);

const pool = mysql.createPool(url);

module.exports = pool;
