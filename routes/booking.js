// my-equipment-booking-backend/routes/booking.js
const express = require('express');
const router = express.Router();
const pool = require('../db'); // 引入数据库连接池

// --- 路由：创建预约 ---
// 前端将发送 POST 请求到 /api/bookings
router.post('/', async (req, res) => {
  const { user_id, equipment_id, start_time, end_time, purpose } = req.body;

  // 1. 基本验证 (你可以使用 Joi 或 express-validator 进行更复杂的验证)
  if (!user_id || !equipment_id || !start_time || !end_time || !purpose) {
    console.log('[API] 预约请求缺少必要参数:', req.body);
    return res.status(400).json({ error: '用户ID、设备ID、开始时间、结束时间和用途是必需的' });
  }

  try {
    console.log(`[API] 接收到创建预约请求: User ${user_id}, Equipment ${equipment_id}`);

    // 2. (可选) 检查设备是否存在
    const [equipmentExists] = await pool.execute('SELECT id FROM equipments WHERE id = ?', [equipment_id]);
    if (equipmentExists.length === 0) {
       console.log(`[API] 预约失败: 设备 ${equipment_id} 不存在`);
       return res.status(404).json({ error: '指定的设备不存在' });
    }

    // 3. (可选) 检查用户是否存在 (如果 users 表存在)
    // const [userExists] = await pool.execute('SELECT id FROM users WHERE id = ?', [user_id]);
    // if (userExists.length === 0) {
    //    console.log(`[API] 预约失败: 用户 ${user_id} 不存在`);
    //    return res.status(404).json({ error: '指定的用户不存在' });
    // }

    // 4. (可选) 检查时间冲突等业务逻辑...

    // 5. 插入预约记录到数据库
    // 假设你的 bookings 表有字段: user_id, equipment_id, start_time, end_time, purpose, status (默认 'pending')
    const [result] = await pool.execute(
      'INSERT INTO bookings (user_id, equipment_id, start_time, end_time, purpose, status) VALUES (?, ?, ?, ?, ?, ?)',
      [user_id, equipment_id, start_time, end_time, purpose, 'pending']
    );
    console.log(`[API] 预约创建成功，ID: ${result.insertId}`);

    // 6. 返回成功响应
    res.status(201).json({ message: '预约申请已提交', bookingId: result.insertId });

  } catch (err) {
    console.error('[API] 创建预约失败:', err);
    // 根据错误类型返回更具体的错误信息（例如，违反唯一约束等）
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;