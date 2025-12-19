const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true }
});

const orderSchema = new mongoose.Schema({
    customer: {
        name: { type: String, required: true },
        phone: { type: String, required: true },
        address: String
    },
    items: [orderItemSchema],
    totalAmount: { type: Number, required: true },
    status: { 
        type: String, 
        enum: ['pending', 'preparing', 'ready', 'delivered', 'cancelled'],
        default: 'pending'
    },
    orderNumber: { type: String, unique: true },
    notes: String
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);