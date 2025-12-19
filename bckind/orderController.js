const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');

const createOrder = async (req, res) => {
    try {
        const { customer, items, totalAmount, notes } = req.body;
        
        // Validate items exist and calculate total
        let calculatedTotal = 0;
        for (let item of items) {
            const menuItem = await MenuItem.findById(item.item);
            if (!menuItem || !menuItem.isAvailable) {
                return res.status(400).json({ success: false, message: `${menuItem?.name || 'المنتج'} غير متوفر` });
            }
            calculatedTotal += menuItem.price * item.quantity;
        }

        if (Math.abs(calculatedTotal - totalAmount) > 0.01) {
            return res.status(400).json({ success: false, message: 'الإجمالي غير صحيح' });
        }

        const orderNumber = `ORD-${Date.now()}`;
        const order = new Order({ 
            customer, 
            items, 
            totalAmount, 
            orderNumber, 
            notes 
        });

        await order.save();
        res.status(201).json({ 
            success: true, 
            data: order,
            message: 'تم إرسال الطلب بنجاح للكاشير' 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getRecentOrders = async (req, res) => {
    try {
        const orders = await Order.find({ status: { $in: ['pending', 'preparing'] } })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('items.item');
        res.json({ success: true, data: orders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { createOrder, getRecentOrders };