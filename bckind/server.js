const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" } // يمكن تحديد أوراق الأصل حسب الحاجة
});

app.use(cors());
app.use(express.json());

// اختبار السيرفر
app.get('/', (req, res) => {
    res.json({ message: '🚀 Cafe Backend يعمل بنجاح!' });
});

// استقبال طلب جديد من العميل
app.post('/api/orders', (req, res) => {
    const order = req.body;
    order.orderNumber = `ORD-${Date.now()}`;
    order.status = 'pending';

    // هنا يمكن إضافة حفظ الطلب في قاعدة البيانات لاحقاً

    // إشعار الكاشير بالطلب الجديد
    io.emit('new-orders', [order]);

    res.json({ success: true, data: order, message: 'تم استلام الطلب بنجاح!' });
});

// تحديث حالة الطلب
app.put('/api/orders/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    // هنا يمكن تحديث حالة الطلب في قاعدة البيانات لاحقاً

    io.emit('order-updated', { id, status }); // إعلام الجميع بحالة الطلب الجديدة

    res.json({ success: true, message: 'تم تحديث حالة الطلب.' });
});

// استرجاع الطلبات الأخيرة (مثال)
app.get('/api/orders/recent', (req, res) => {
    // في تطبيق حقيقي تسترجع من قاعدة البيانات
    res.json({ success: true, data: [] });
});

// بدء السيرفر
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});