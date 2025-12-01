// server.js

const express = require('express');
const cors = require('cors');
require('dotenv').config(); // 确保加载 .env 文件

const authRoutes = require('./routes/auth');
const equipmentRoutes = require('./routes/equipment');
// const bookingRoutes = require('./routes/booking'); // 稍后启用

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// --- 挂载路由 ---
app.use('/api/auth', authRoutes);
app.use('/api/equipments', equipmentRoutes);
// app.use('/api/bookings', bookingRoutes); // 稍后启用

// --- 强制性数据库连接测试 ---
const pool = require('./db'); // 引入数据库连接池

const testDatabaseConnection = async () => {
  console.log("[诊断] 开始强制性数据库连接测试...");
  try {
    // --- 关键测试 1: 获取连接 ---
    const connection = await pool.getConnection();
    console.log("[诊断] ✅ 成功从连接池获取数据库连接!");

    // --- 关键测试 2: 执行简单查询 ---
    const [results] = await connection.execute('SELECT 1 + 1 AS solution');
    console.log('[诊断] ✅ 数据库查询成功:', results[0].solution); // 应该输出 2

    // --- 关键测试 3: 查询实际表 (可选但强烈建议) ---
    try {
         const [equipRows] = await connection.execute('SELECT COUNT(*) AS count FROM equipments');
         console.log(`[诊断] ✅ 成功查询 equipments 表，共有 ${equipRows[0].count} 条记录.`);
    } catch (tableErr) {
         console.warn(`[诊断] ⚠️  查询 equipments 表时出错 (可能是表不存在?):`, tableErr.message);
         // 不中断，继续启动服务
    }


    // --- 释放连接 ---
    connection.release();
    console.log("[诊断] ✅ 数据库连接测试完成，连接已释放.");
  } catch (err) {
    console.error('[诊断] ❌ 数据库连接测试失败!!! 错误详情:');
    console.error('--- 错误对象 ---');
    console.error(err);
    console.error('--- 错误信息 ---');
    console.error(err.message);
    console.error('--- 错误堆栈 ---');
    console.error(err.stack);
    // 注意：这里可以选择让应用退出 process.exit(1);
    // 但在 Railway 上，让它 crash 并显示错误日志可能更好
  }
};

// --- 在启动 HTTP 服务器前执行测试 ---
testDatabaseConnection().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[服务器] 后端服务正在运行在端口 ${PORT}`);
  });
}).catch((err) => {
  console.error('[服务器] 启动前测试失败，拒绝启动服务。', err);
  // process.exit(1); // 可选：如果测试失败则退出
});