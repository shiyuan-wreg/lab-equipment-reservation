// my-equipment-booking-backend/routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
// 1. 引入 MySQL 连接池 (现在 db 是一个连接池)
const db = require('../db');

const router = express.Router();

// 登录接口
router.post('/login', async (req, res) => { // 使用 async/await
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: '用户名和密码不能为空' });
  }

  let connection;
  try {
    // 2. 从连接池获取连接
    connection = await db.getConnection();

    // 3. 查询用户 (使用 ? 作为占位符)
    const [rows] = await connection.execute(
      `SELECT id, username, password_hash, role FROM users WHERE username = ?`,
      [username]
    );
    const user = rows[0]; // execute 返回一个数组，第一个元素是结果数组

    if (!user) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    // 4. 验证密码
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    // 5. 生成 JWT Token
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'your_default_secret_key_should_be_strong_and_secure!',
      { expiresIn: '1h' }
    );

    // 6. 返回成功信息和 Token
    res.json({
      message: '登录成功',
      token: token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('[AUTH] 登录时出错:', err.message);
    res.status(500).json({ message: '服务器内部错误' });
  } finally {
    // 7. 无论如何都要释放连接回池中
    if (connection) connection.release();
  }
});

// 注册接口
router.post('/register', async (req, res) => {
  const { username, password, role = 'user' } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: '用户名和密码不能为空' });
  }

  if (role !== 'user' && role !== 'admin') {
    return res.status(400).json({ message: '无效的角色' });
  }

  let connection;
  try {
    connection = await db.getConnection();

    // 1. 检查用户名是否已存在
    const [existingRows] = await connection.execute(
      `SELECT id FROM users WHERE username = ?`,
      [username]
    );

    if (existingRows.length > 0) {
      return res.status(409).json({ message: '用户名已存在' });
    }

    // 2. 加密密码
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 3. 插入新用户
    const [result] = await connection.execute(
      `INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)`,
      [username, hashedPassword, role]
    );

    res.status(201).json({ message: '用户注册成功', userId: result.insertId });
  } catch (err) {
    console.error('[AUTH] 注册时出错:', err.message);
    res.status(500).json({ message: '服务器内部错误' });
  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;