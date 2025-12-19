const express = require('express');
const { auth } = require('../middleware/auth');
const { createOrder, getRecentOrders } = require('../controllers/orderController');
const router = express.Router();

router.post('/', createOrder); // العملاء يرسلون الطلبات
router.get('/recent', auth, getRecentOrders); // الكاشير يشوف الطلبات الجديدة

module.exports = router;