// ===============================
// Cafe Backend Server (Universal)
// ===============================

// تحميل متغيرات البيئة
require('dotenv').config();

// استيراد المكتبات
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

// إنشاء التطبيق
const app = express();
const server = http.createServer(app);

// ===============================
// Middlewares
// ===============================
app.use(express.json());

// إعداد CORS ليعمل مع أي frontend
const allowedOrigins = [
    process.env.CLIENT_URL || '*',
    process.env.CASHIER_URL || '*'
];

app.use(cors({
    origin: function(origin, callback){
        // السماح لأي origin إذا لم يُرسل origin (Postman أو server-side request)
        if(!origin) return callback(null, true);
        if(allowedOrigins.includes(origin) || allowedOrigins.includes('*')){
            return callback(null, true);
        } else {
            return callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
    credentials: true
}));

// ===============================
// Socket.IO
// ===============================
const io = new Server(server, {
    cors: {
        origin: allowedOrigins.includes('*') ? '*' : allowedOrigins,
        methods: ['GET','POST','PUT'],
        credentials: true
    }
});

// ===============================
// Routes
// ===============================

// Health Check
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: '🚀 Cafe Backend يعمل بنجاح',
        environment: process.env.NODE_ENV || 'development'
    });
});

// ===============================
// Orders API
// ===============================
app.post('/api/orders', (req, res) => {
    try {
        const data = req.body;

        // دعم أكثر من شكل للبيانات
        const customerName =
            data.customerName ||
            data.customer?.name ||
            data.name ||
            null;

        const customerPhone =
            data.customerPhone ||
            data.customer?.phone ||
            data.phone ||
            '';

        const tableNumber =
            data.tableNumber ||
            data.table ||
            data.customer?.table ||
            'غير محدد';

        if (!customerName) {
            return res.status(400).json({
                success: false,
                message: 'يرجى إدخال اسم العميل'
            });
        }

        const order = {
            id: Date.now().toString(),
            orderNumber: `ORD-${Date.now()}`,
            tableNumber,
            customer: {
                name: customerName,
                phone: customerPhone
            },
            items: data.items || [],
            totalAmount: data.totalAmount || 0,
            notes: data.notes || '',
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        console.log('🆕 طلب جديد:', order);

        // إرسال الطلب لجميع العملاء المتصلين عبر Socket.IO
        io.emit('new-orders', [order]);

        res.status(201).json({
            success: true,
            data: order,
            message: 'تم استلام الطلب بنجاح'
        });

    } catch (error) {
        console.error('❌ خطأ في إنشاء الطلب:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ داخلي في السيرفر'
        });
    }
});

// ===============================
// Update Order Status
// ===============================
app.put('/api/orders/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
        return res.status(400).json({
            success: false,
            message: 'الحالة مطلوبة'
        });
    }

    console.log(`🔄 تحديث حالة الطلب ${id} → ${status}`);

    // إرسال التحديث لكل العملاء
    io.emit('order-updated', { id, status });

    res.json({
        success: true,
        message: 'تم تحديث حالة الطلب بنجاح'
    });
});

// ===============================
// Server Start
// ===============================
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});