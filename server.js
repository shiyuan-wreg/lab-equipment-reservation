// server.js
const express = require('express');
const cors = require('cors');
const { pool, testConnection } = require('./db'); // 导入数据库连接池和测试函数

const app = express();
const PORT = process.env.PORT || 8080; // Railway 会注入 PORT

// --- 中间件 ---
app.use(cors());
app.use(express.json());

// --- API 路由 ---

// 1. 获取所有设备 (已完成数据库改造)
app.get('/api/equipments', async (req, res) => {
  console.log('[API] /api/equipments - 请求获取所有设备');
  try {
    const [rows] = await pool.execute('SELECT id, name, description, status FROM equipments');
    console.log(`[API] /api/equipments - 成功查询到 ${rows.length} 条记录`);
    res.json(rows);
  } catch (err) {
    console.error("[API] /api/equipments - 查询失败:", err);
    res.status(500).json({ message: '服务器内部错误，无法获取设备列表' });
  }
});

// 2. 创建预订 (已完成数据库改造，包含事务)
app.post('/api/bookings', async (req, res) => {
  console.log('[API] /api/bookings - 收到预订请求', req.body);
  const { equipment_id, user_name, booking_date } = req.body;

  if (!equipment_id || !user_name || !booking_date) {
      console.warn('[API] /api/bookings - 缺少必要参数');
      return res.status(400).json({ message: '缺少必要参数: equipment_id, user_name, booking_date' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    console.log('[API] /api/bookings - 已获取数据库连接');

    await connection.beginTransaction();
    console.log('[API] /api/bookings - 开启数据库事务');

    // a. 检查设备是否存在且状态为 available
    const [equipmentRows] = await connection.execute(
      'SELECT id FROM equipments WHERE id = ? AND status = "available"',
      [equipment_id]
    );

    if (equipmentRows.length === 0) {
      await connection.rollback();
      console.log('[API] /api/bookings - 设备不可用或不存在，事务回滚');
      return res.status(400).json({ message: '设备不可用或不存在' });
    }

    // b. 插入预订记录
    const [result] = await connection.execute(
      'INSERT INTO bookings (equipment_id, user_name, booking_date) VALUES (?, ?, ?)',
      [equipment_id, user_name, booking_date]
    );
    const bookingId = result.insertId;
    console.log(`[API] /api/bookings - 预订记录创建成功, ID: ${bookingId}`);

    // c. 更新设备状态为 booked
    await connection.execute(
      'UPDATE equipments SET status = "booked" WHERE id = ?',
      [equipment_id]
    );
    console.log(`[API] /api/bookings - 设备 ID ${equipment_id} 状态更新为 booked`);

    await connection.commit();
    console.log('[API] /api/bookings - 数据库事务提交成功');

    res.status(201).json({ message: '预订成功', bookingId: bookingId });

  } catch (err) {
    if (connection) {
      await connection.rollback();
      console.log('[API] /api/bookings - 发生错误，事务已回滚');
    }
    console.error("[API] /api/bookings - 预订失败:", err);
    res.status(500).json({ message: '服务器内部错误，预订失败' });
  } finally {
    if (connection) {
      connection.release();
      console.log('[API] /api/bookings - 数据库连接已释放');
    }
  }
});

// 3. 获取所有预订 (新增数据库支持)
app.get('/api/bookings', async (req, res) => {
  console.log('[API] /api/bookings - 请求获取所有预订');
  try {
     // 使用 JOIN 查询获取预订信息及关联的设备名称
     const query = `
      SELECT b.id, b.equipment_id, e.name as equipment_name, b.user_name, b.booking_date, b.created_at
      FROM bookings b
      JOIN equipments e ON b.equipment_id = e.id
      ORDER BY b.created_at DESC
    `;
    const [rows] = await pool.execute(query);
    console.log(`[API] /api/bookings - 成功查询到 ${rows.length} 条记录`);
    res.json(rows);
  } catch (err) {
    console.error("[API] /api/bookings - 查询失败:", err);
    res.status(500).json({ message: '服务器内部错误，无法获取预订列表' });
  }
});

// 4. 取消预订 (新增数据库支持)
app.delete('/api/bookings/:id', async (req, res) => {
  const bookingId = req.params.id;
  console.log(`[API] DELETE /api/bookings/${bookingId} - 请求取消预订`);

  if (!bookingId) {
     console.warn('[API] DELETE /api/bookings/:id - 缺少预订ID参数');
     return res.status(400).json({ message: '缺少预订ID参数' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    console.log('[API] DELETE /api/bookings/:id - 已获取数据库连接');

    await connection.beginTransaction();
    console.log('[API] DELETE /api/bookings/:id - 开启数据库事务');

    // a. 查找预订记录并获取关联的设备ID
    const [bookingRows] = await connection.execute(
      'SELECT equipment_id FROM bookings WHERE id = ?', [bookingId]
    );

    if (bookingRows.length === 0) {
      await connection.rollback();
      console.log(`[API] DELETE /api/bookings/${bookingId} - 预订记录不存在，事务回滚`);
      return res.status(404).json({ message: '预订记录不存在' });
    }

    const equipmentId = bookingRows[0].equipment_id;

    // b. 删除预订记录
    await connection.execute('DELETE FROM bookings WHERE id = ?', [bookingId]);
    console.log(`[API] DELETE /api/bookings/${bookingId} - 预订记录删除成功`);

    // c. 更新设备状态为 available
    await connection.execute('UPDATE equipments SET status = "available" WHERE id = ?', [equipmentId]);
    console.log(`[API] DELETE /api/bookings/${bookingId} - 设备 ID ${equipmentId} 状态更新为 available`);

    await connection.commit();
    console.log('[API] DELETE /api/bookings/:id - 数据库事务提交成功');

    res.status(200).json({ message: '取消预订成功' });

  } catch (err) {
     if (connection) {
      await connection.rollback();
      console.log('[API] DELETE /api/bookings/:id - 发生错误，事务已回滚');
    }
    console.error(`[API] DELETE /api/bookings/${bookingId} - 取消预订失败:`, err);
    res.status(500).json({ message: '服务器内部错误，取消预订失败' });
  } finally {
    if (connection) {
      connection.release();
      console.log('[API] DELETE /api/bookings/:id - 数据库连接已释放');
    }
  }
});

// --- 健康检查/根路径 ---
app.get('/', (req, res) => {
  res.json({ message: '欢迎使用实验室设备预订系统 API!', timestamp: new Date().toISOString() });
});

// --- 启动服务器 ---
async function startServer() {
  console.log('[服务器] 开始启动流程...');
  
  try {
    console.log('[服务器] 正在执行数据库连接健康检查...');
    const isConnected = await testConnection(); 
    
    if (isConnected) {
        console.log('[服务器] ✅ 数据库连接健康检查通过!');
        
        const server = app.listen(PORT, '0.0.0.0', () => {
          console.log(`[服务器] 🚀 后端服务已成功启动并监听端口 ${PORT}`);
          console.log(`[服务器] 🌐 本地测试地址: http://localhost:${PORT}`);
        });

        server.on('error', (err) => {
          console.error('[服务器] ❌ Express 服务器启动失败:', err);
          process.exit(1);
        });

    } else {
        console.error('[服务器] ❌ 数据库连接健康检查未通过，服务器启动终止。');
        process.exit(1);
    }

  } catch (dbErr) {
    console.error('[服务器] ❌ 数据库连接健康检查失败，服务器启动终止。', dbErr.message);
    process.exit(1);
  }
}

startServer();