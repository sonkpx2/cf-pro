const Order = require('../models/Order');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log('👤 Cashier connected');

        // إرسال الطلبات الجديدة فوراً للكاشير
        socket.on('join-orders', async () => {
            const recentOrders = await Order.find({ status: 'pending' })
                .sort({ createdAt: -1 })
                .limit(5);
            socket.emit('new-orders', recentOrders);
        });

        // تحديث حالة الطلب
        socket.on('update-order-status', async (orderId, status) => {
            const order = await Order.findByIdAndUpdate(
                orderId, 
                { status }, 
                { new: true }
            ).populate('items.item');

            io.emit('order-updated', order);

            // إشعار العميل
            if (status === 'ready') {
                transporter.sendMail({
                    to: order.customer.phone,
                    subject: `طلبك ${order.orderNumber} جاهز!`,
                    html: `<h2>طلبك جاهز للاستلام</h2><p>رقم الطلب: ${order.orderNumber}</p>`
                });
            }
        });
    });
};