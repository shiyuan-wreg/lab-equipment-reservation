// server.js
const express = require('express');
const cors = require('cors');
const { pool, testConnection } = require('./db'); // 导入 db.js 中的 pool 和 testConnection

const app = express();
const PORT = process.env.PORT || 8080; // Railway 会注入 PORT

// --- 中间件 ---
app.use(cors());
app.use(express.json());

// --- API 路由 ---
// 示例：获取所有设备
app.get('/api/equipments', async (req, res) => {
  try {
    // 使用从 db.js 导入的 pool
    const [rows] = await pool.execute('SELECT * FROM equipments');
    res.json(rows);
  } catch (err) {
    console.error("获取设备列表失败:", err);
    res.status(500).json({ message: '服务器内部错误' }); // 返回 JSON 错误
  }
});

// 示例：预订设备
app.post('/api/bookings', async (req, res) => {
  const { equipment_id, user_name, booking_date } = req.body;
  if (!equipment_id || !user_name || !booking_date) {
      return res.status(400).json({ message: '缺少必要参数' });
  }
  try {
    // 检查设备是否存在且未被预订
    const [equipmentRows] = await pool.execute(
      'SELECT * FROM equipments WHERE id = ? AND status = "available"',
      [equipment_id]
    );
    if (equipmentRows.length === 0) {
      return res.status(400).json({ message: '设备不可用或不存在' });
    }

    // 插入预订记录
    const [result] = await pool.execute(
      'INSERT INTO bookings (equipment_id, user_name, booking_date) VALUES (?, ?, ?)',
      [equipment_id, user_name, booking_date]
    );

    // 更新设备状态为 "booked"
    await pool.execute(
      'UPDATE equipments SET status = "booked" WHERE id = ?',
      [equipment_id]
    );

    res.status(201).json({ message: '预订成功', bookingId: result.insertId });
  } catch (err) {
    console.error("预订设备失败:", err);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

// --- 健康检查/根路径 ---
// 添加一个简单的根路径响应，避免 "Cannot GET /"
app.get('/', (req, res) => {
  res.json({ message: '欢迎使用实验室设备预订系统 API!', timestamp: new Date().toISOString() });
});

// --- 启动服务器 ---
async function startServer() {
  console.log('[服务器] 开始启动流程...');
  
  try {
    // 1. 强制进行数据库连接测试
    console.log('[服务器] 正在执行数据库连接健康检查...');
    const isConnected = await testConnection(); // 调用 db.js 的测试函数
    
    if (isConnected) {
        console.log('[服务器] ✅ 数据库连接健康检查通过!');
        
        // 2. 如果数据库连接成功，则启动 Express 服务器
        const server = app.listen(PORT, '0.0.0.0', () => { // 绑定到 0.0.0.0 以接受外部连接
          console.log(`[服务器] 🚀 后端服务已成功启动并监听端口 ${PORT}`);
          console.log(`[服务器] 🌐 本地测试地址: http://localhost:${PORT}`);
          // 注意：实际公网访问地址由 Railway 提供 (e.g., https://your-app.up.railway.app)
        });

        // 3. 可选：添加服务器错误处理
        server.on('error', (err) => {
          console.error('[服务器] ❌ Express 服务器启动失败:', err);
          process.exit(1);
        });

    } else {
        // 如果 testConnection 返回 false 或 resolve 了但不符合预期
        console.error('[服务器] ❌ 数据库连接健康检查未通过，服务器启动终止。');
        process.exit(1);
    }

  } catch (dbErr) {
    // 如果 testConnection 抛出异常或 reject
    console.error('[服务器] ❌ 数据库连接健康检查失败，服务器启动终止。', dbErr.message);
    // 你可以选择在这里不退出，而是让服务器带着数据库错误启动，
    // 但这通常不推荐，因为应用很可能无法正常工作。
    // process.exit(1); 
    // 或者，如果你想让服务器跑起来但标记为不健康，可以省略 exit(1)
    // 但更好的做法是在健康检查端点反映这个状态。
    process.exit(1); // 推荐：数据库失败则应用不应启动
  }
}

// --- 触发启动 ---
startServer();