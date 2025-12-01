// my-equipment-booking-backend/routes/equipment.js
const express = require('express');
const router = express.Router();
const pool = require('../db'); // 引入数据库连接池

// --- 路由：获取所有设备 ---
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM equipments');
    res.json(rows); // 返回设备列表
  } catch (err) {
    console.error('[API] 获取设备列表失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// --- 路由：根据 ID 获取单个设备详情 ---
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.execute('SELECT * FROM equipments WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: '设备未找到' });
    }
    res.json(rows[0]); // 返回单个设备对象
  } catch (err) {
    console.error('[API] 获取设备详情失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// --- 路由：添加新设备 ---
router.post('/', async (req, res) => {
  const { name, description, quantity } = req.body;

  // 基本验证
  if (!name || !description || !quantity) {
    return res.status(400).json({ error: '名称、描述和数量是必需的' });
  }

  try {
    const [result] = await pool.execute(
      'INSERT INTO equipments (name, description, quantity) VALUES (?, ?, ?)',
      [name, description, parseInt(quantity, 10)]
    );
    res.status(201).json({ message: '设备添加成功', equipmentId: result.insertId });
  } catch (err) {
    console.error('[API] 添加设备失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// --- 路由：编辑设备 ---
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, quantity } = req.body;

  // 基本验证
  if (!name || !description || !quantity) {
    return res.status(400).json({ error: '名称、描述和数量是必需的' });
  }

  try {
    const [result] = await pool.execute(
      'UPDATE equipments SET name = ?, description = ?, quantity = ? WHERE id = ?',
      [name, description, parseInt(quantity, 10), id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '设备未找到' });
    }

    res.json({ message: '设备更新成功' });
  } catch (err) {
    console.error('[API] 更新设备失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// --- 路由：删除设备 ---
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.execute('DELETE FROM equipments WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '设备未找到' });
    }

    res.json({ message: '设备删除成功' });
  } catch (err) {
    console.error('[API] 删除设备失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;