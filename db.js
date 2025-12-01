const mysql = require("mysql2/promise");

// Railway 新界面：数据库连接字符串
const url = process.env.MYSQL_URL || process.env.MYSQLURL || process.env.DATABASE_URL;

if (!url) {
    console.error("❌ 没有找到 Railway 的数据库 URL，请检查服务 Variables");
    process.exit(1);
}

console.log("正在连接数据库:", url);

const pool = mysql.createPool(url);

module.exports = pool;
