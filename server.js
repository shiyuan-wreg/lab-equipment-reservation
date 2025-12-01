// my-equipment-booking-backend/server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('./db'); 

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const bookingRoutes = require('./routes/booking'); // 引入预约路由

app.use(cors());
app.use(express.json());

// --- API 路由 ---
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// 设备管理路由
const equipmentRoutes = require('./routes/equipment');
app.use('/api/equipments', equipmentRoutes); // 注意这里的路径前缀是 /api/equipments
// ----------------
app.use('/api/bookings', bookingRoutes);// 挂载预约路由到 /api/bookings

// --- 测试 API 端点 ---
app.get('/', (req, res) => {
  res.json({ message: '欢迎来到设备预约系统的后端 API! (MySQL)' });
});

app.get('/api/test', (req, res) => {
  res.json({ data: '这是一个测试 API 端点', timestamp: new Date().toISOString(), db: 'MySQL' });
});
// ------------------------

app.listen(PORT, () => {
  console.log(`[服务器] 后端服务器正在 http://localhost:${PORT} 上运行`);
});