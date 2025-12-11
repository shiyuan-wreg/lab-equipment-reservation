// server.js
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');

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


//管理员创建新设备
app.post('/api/equipments', async (req, res) => {
  console.log('[API] POST /api/equipments - 收到创建设备请求');
  const { name, description } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ message: '设备名称不能为空' });
  }

  try {
    const [result] = await pool.execute(
      'INSERT INTO equipments (name, description, status) VALUES (?, ?, ?)',
      [name.trim(), description || '', 'available']
    );
    
    const newEquipment = {
      id: result.insertId,
      name: name.trim(),
      description: description || '',
      status: 'available'
    };
    
    console.log(`[API] 设备创建成功:`, newEquipment);
    res.status(201).json(newEquipment);
  } catch (err) {
    console.error('[API] 创建设备失败:', err);
    res.status(500).json({ message: '服务器内部错误，无法创建设备' });
  }
});

// 3. 更新设备信息
app.put('/api/equipments/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, status } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ message: '设备名称不能为空' });
  }

  // 验证 status 是否合法
  const validStatuses = ['available', 'booked', 'maintenance'];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ message: '设备状态无效' });
  }

  try {
    const [result] = await pool.execute(
      'UPDATE equipments SET name = ?, description = ?, status = ? WHERE id = ?',
      [name.trim(), description || '', status || 'available', id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: '设备未找到' });
    }

    console.log(`[API] 设备 ID ${id} 更新成功`);
    res.json({ message: '设备更新成功' });
  } catch (err) {
    console.error(`[API] 更新设备 ID ${id} 失败:`, err);
    res.status(500).json({ message: '服务器内部错误，无法更新设备' });
  }
});

// 4. 删除设备
app.delete('/api/equipments/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // 检查 bookings 表中是否存在该 equipment_id 的任何记录
    const [bookingRows] = await pool.execute(
      'SELECT id FROM bookings WHERE equipment_id = ?',
      [id]
    );

    if (bookingRows.length > 0) {
      return res.status(400).json({ 
        message: '该设备存在预订记录，无法删除。如需删除，请先清除相关预订。' 
      });
    }

    const [result] = await pool.execute('DELETE FROM equipments WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: '设备未找到' });
    }

    res.json({ message: '设备删除成功' });
  } catch (err) {
    console.error(`[API] DELETE /api/equipments/${id} - 删除失败:`, err);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

// 2. 创建预订 (已完成数据库改造，包含事务)
// --- 创建预订（适配现有表结构）---
app.post('/api/bookings', async (req, res) => {
  console.log('[API] /api/bookings - 收到请求:', req.body);
  const { equipment_id, user_id, booking_date } = req.body;

  // 验证参数
  if (!equipment_id || !user_id || !booking_date) {
    return res.status(400).json({ 
      message: '缺少必要参数: equipment_id, user_id, booking_date' 
    });
  }

  // 验证日期格式（简单校验 YYYY-MM-DD）
  if (!/^\d{4}-\d{2}-\d{2}$/.test(booking_date)) {
    return res.status(400).json({ message: '日期格式无效，应为 YYYY-MM-DD' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // a. 检查设备是否存在且状态为 available
    const [equipments] = await connection.execute(
      'SELECT id FROM equipments WHERE id = ? AND status = "available"',
      [equipment_id]
    );
    if (equipments.length === 0) {
      await connection.rollback();
      return res.status(400).json({ message: '设备不可用或不存在' });
    }

    // b. 检查该设备在选定日期是否已被预订
    const [existingBookings] = await connection.execute(
      'SELECT id FROM bookings WHERE equipment_id = ? AND booking_date = ?',
      [equipment_id, booking_date]
    );
    if (existingBookings.length > 0) {
      await connection.rollback();
      return res.status(400).json({ message: '该设备在选定日期已被预约' });
    }

    // c. 插入新预订（user_id 是整数，booking_date 是 DATE）
    const [result] = await connection.execute(
      'INSERT INTO bookings (equipment_id, user_id, booking_date) VALUES (?, ?, ?)',
      [equipment_id, user_id, booking_date]
    );

    // d. 更新设备状态为 booked（注意：只要有一天被订，设备就变成 booked？）
    //    这可能不合理！但按当前逻辑先这样处理。
    await connection.execute(
      'UPDATE equipments SET status = "booked" WHERE id = ?',
      [equipment_id]
    );

    await connection.commit();
    res.status(201).json({ message: '预约成功', bookingId: result.insertId });

  } catch (err) {
    if (connection) await connection.rollback();
    console.error('[API] /api/bookings - 失败:', err);
    res.status(500).json({ message: '服务器内部错误' });
  } finally {
    if (connection) connection.release();
  }
});

// --- 获取预订列表（支持按 user_id 过滤，并关联设备名）---
app.get('/api/bookings', async (req, res) => {
  console.log('[API] GET /api/bookings - 查询参数:', req.query);
  
  try {
    let query = '';
    let params = [];

    if (req.query.user_id) {
      const userId = parseInt(req.query.user_id, 10);
      if (isNaN(userId)) {
        return res.status(400).json({ message: '无效的用户ID' });
      }
      // 只查询当前用户的预订，并关联设备名称
      query = `
        SELECT 
          b.id,
          b.equipment_id,
          b.booking_date,
          b.created_at,
          e.name AS equipment_name
        FROM bookings b
        JOIN equipments e ON b.equipment_id = e.id
        WHERE b.user_id = ?
        ORDER BY b.booking_date DESC, b.created_at DESC
      `;
      params = [userId];
    } else {
      // 无 user_id 参数时，返回所有（供管理员用，未来可加权限）
      query = `
        SELECT 
          b.id,
          b.equipment_id,
          b.booking_date,
          b.created_at,
          e.name AS equipment_name,
          u.username AS user_name
        FROM bookings b
        JOIN equipments e ON b.equipment_id = e.id
        JOIN users u ON b.user_id = u.id
        ORDER BY b.booking_date DESC
      `;
    }

    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (err) {
    console.error('[API] /api/bookings GET 失败:', err);
    res.status(500).json({ message: '服务器内部错误' });
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

// --- 新增：用户登录接口 ---
app.post('/api/auth/login', async (req, res) => {
  console.log('[API] POST /api/auth/login - 收到登录请求');
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: '用户名和密码不能为空' });
  }

  try {
    // 查询 users 表（假设存在）
    const [rows] = await pool.execute(
      'SELECT id, username, password_hash, role FROM users WHERE username = ?',
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    const user = rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    // 登录成功：返回用户信息（不含密码）
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });

  } catch (err) {
    console.error('[API] /api/auth/login - 内部错误:', err);
    res.status(500).json({ message: '服务器内部错误' });
  }
});
// --- 登录接口结束 ---


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