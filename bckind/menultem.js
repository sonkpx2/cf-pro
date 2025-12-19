const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { type: String, enum: ['قهوة', 'شاي', 'عصائر', 'حلويات'], required: true },
    price: { type: Number, required: true },
    description: String,
    image: String,
    isAvailable: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('MenuItem', menuItemSchema);