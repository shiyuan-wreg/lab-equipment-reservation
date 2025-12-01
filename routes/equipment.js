// my-equipment-booking-backend/routes/equipment.js
const express = require('express');
const db = require('../db'); // 引入 MySQL 连接池

const router = express.Router();

// GET /api/equipments - 获取所有可用设备列表
router.get('/', async (req, res) => {
  let connection;
  try {
    connection = await db.getConnection();
    
    // 查询所有状态为 'available' 的设备
    // 你可以根据需要修改查询条件，比如显示所有设备（包括维护中的）
    const [rows] = await connection.execute(`
      SELECT id, name, description, status, created_at 
      FROM equipments 
      WHERE status = 'available' 
      ORDER BY name ASC
    `);

    res.json({
      message: '设备列表获取成功',
      data: rows
    });

  } catch (err) {
    console.error('[EQUIPMENT] 获取设备列表时出错:', err.message);
    res.status(500).json({ message: '服务器内部错误' });
  } finally {
    if (connection) connection.release();
  }
});

// --- 未来可以在这里添加更多设备相关的 API ---
// 例如：
// router.get('/:id', ...)     // 获取单个设备详情
// router.post('/', ...)       // 添加新设备 (需要管理员权限)
// router.put('/:id', ...)     // 更新设备信息 (需要管理员权限)
// router.delete('/:id', ...)  // 删除设备 (需要管理员权限)

module.exports = router;