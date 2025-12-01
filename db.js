// my-equipment-booking-backend/db.js
const mysql = require('mysql2/promise'); // 使用 promise 版本
const dotenv = require('dotenv');

dotenv.config(); // 加载 .env 文件

// 1. 创建数据库连接池 (推荐做法，比单个连接更高效)
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

// 2. 测试数据库连接
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('[DB] 已连接到 MySQL 数据库:', process.env.DB_NAME);
    connection.release(); // 释放连接回池中
  } catch (err) {
    console.error('[DB] 连接 MySQL 数据库失败:', err.message);
    process.exit(1); // 如果数据库连接失败，退出程序
  }
})();

// 3. 初始化数据库表
const initializeDatabase = async () => {
  let connection;
  try {
    connection = await pool.getConnection();

    // 创建用户表
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('admin', 'user') DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    await connection.execute(createUsersTable);
    console.log('[DB] Users 表已创建或已存在。');

    // （可选）插入默认管理员用户
    // 注意：密码 'admin123' 需要被加密后存储。这里只是一个占位符，实际应在注册时加密。
    // 我们将在后端注册逻辑中处理加密。
    const checkAdminQuery = `SELECT id FROM users WHERE username = 'admin'`;
    const [rows] = await connection.execute(checkAdminQuery);
    
    if (rows.length === 0) {
      // 注意：这里不应该直接插入明文密码，这只是为了演示表结构。
      // 正确的做法是在应用中提供注册功能，或使用脚本安全地插入加密后的密码。
      // 为了让你能快速测试，我们先插入一个占位符，后续你会在注册时用正确的密码。
      const insertAdminQuery = `
        INSERT INTO users (username, password_hash, role) 
        VALUES ('admin', 'placeholder_for_hashed_admin_password', 'admin')
      `;
      await connection.execute(insertAdminQuery);
      console.log('[DB] 默认管理员用户 "admin" 已创建 (密码需后续设置)。');
    } else {
       console.log('[DB] 默认管理员用户 "admin" 已存在。');
    }


    // --- 你可以在这里继续创建其他表，如设备表、预约表 ---
    // 创建设备表
    const createEquipmentsTable = `
      CREATE TABLE IF NOT EXISTS equipments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        status ENUM('available', 'maintenance') DEFAULT 'available',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    await connection.execute(createEquipmentsTable);
    console.log('[DB] Equipments 表已创建或已存在。');

    // 创建预约表
    const createBookingsTable = `
      CREATE TABLE IF NOT EXISTS bookings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        equipment_id INT NOT NULL,
        date DATE NOT NULL,
        time_slot VARCHAR(50) NOT NULL,
        status ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (equipment_id) REFERENCES equipments(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_equipment_id (equipment_id),
        INDEX idx_date (date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    await connection.execute(createBookingsTable);
    console.log('[DB] Bookings 表已创建或已存在。');


  } catch (err) {
    console.error('[DB] 初始化数据库表时出错:', err.message);
    if (connection) connection.release();
    process.exit(1);
  } finally {
    if (connection) connection.release();
  }
};

// 在服务器启动时调用初始化函数
initializeDatabase();

// 4. 导出连接池，供其他模块使用
module.exports = pool;