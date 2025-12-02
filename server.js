// server.js
const express = require('express');
const { pool, testConnection } = require('./db'); // <--- 确保正确引入 promisePool
// ... 其他引入 ...

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

// --- 修改点：使用 promisePool 执行查询 ---
// 例如，一个 API 路由
app.get('/api/equipments', async (req, res) => {
  try {
    // 使用 promisePool.query()
    const [rows] = await pool.query('SELECT * FROM equipments');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('服务器内部错误');
  }
});
// --- 修改结束 ---

// --- 修改点：在启动服务器前测试数据库连接 ---
async function startServer() {
  try {
     await testConnection(); // <--- 调用 db.js 中的测试函数
     app.listen(PORT, '0.0.0.0', () => {
       console.log(`[服务器] 后端服务正在运行在端口 ${PORT}`);
     });
  } catch (err) {
     console.error('[服务器] 启动失败:', err);
     process.exit(1); // 如果数据库连接失败，退出进程
  }
}

startServer(); // <--- 调用封装的启动函数
// --- 修改结束 ---