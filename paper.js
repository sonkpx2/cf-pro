// ==========================================
// 1. إعدادات النظام
// ==========================================
const socket = io('http://localhost:5000');

// مصفوفات البيانات
let allOrders = [];
let deliveredOrders = [];

// استرجاع الإحصائيات والعملاء من الذاكرة
let stats = JSON.parse(localStorage.getItem('stats') || '{"todayRevenue":0,"totalRevenue":0,"completedToday":0,"uniqueCustomers":0,"ordersWithNotes":0}');
let uniqueCustomers = new Set(JSON.parse(localStorage.getItem('uniqueCustomers') || '[]'));

// ==========================================
// 2. دوال التحميل والحفظ
// ==========================================

function saveData() {
    localStorage.setItem('cafeOrders', JSON.stringify(allOrders));
    localStorage.setItem('deliveredOrders', JSON.stringify(deliveredOrders));
    localStorage.setItem('stats', JSON.stringify(stats));
    localStorage.setItem('uniqueCustomers', JSON.stringify([...uniqueCustomers]));
}

function loadData() {
    try {
        const savedOrders = localStorage.getItem('cafeOrders');
        const savedDelivered = localStorage.getItem('deliveredOrders');
        
        if (savedOrders) {
            allOrders = JSON.parse(savedOrders);
            deliveredOrders = JSON.parse(savedDelivered) || [];
            uniqueCustomers = new Set(JSON.parse(localStorage.getItem('uniqueCustomers') || '[]'));
        } else {
            allOrders = [];
            deliveredOrders = [];
        }
        
        renderPendingOrders();
        updateStats();
        updateRecentOrders();
        hideEmptyStateIfNeeded();
    } catch (e) {
        console.error('خطأ في تحميل البيانات:', e);
        allOrders = [];
    }
}

loadData();

// ==========================================
// 3. دوال واجهة المستخدم
// ==========================================

function openOrderModal() {
    document.getElementById('orderModal').style.display = 'flex';
    const idInput = document.getElementById('manualOrderId');
    if(idInput) idInput.focus();
}

function closeOrderModal() {
    document.getElementById('orderModal').style.display = 'none';
    document.getElementById('orderForm').reset();
}

// ==========================================
// 4. دالة إضافة طلب يدوي
// ==========================================
function addNewOrder(event) {
    event.preventDefault();

    const manualId = document.getElementById('manualOrderId').value;
    const tableVal = document.getElementById('customer_table').value.trim();
    const customerName = document.getElementById('customerName').value;
    const customerPhone = document.getElementById('customerPhone').value;
    const itemsText = document.getElementById('orderItems').value;
    const total = parseFloat(document.getElementById('orderTotal').value) || 0;
    const notes = document.getElementById('orderNotes').value;

    if (allOrders.some(o => o.id == manualId)) {
        alert('⚠️ رقم الطلب هذا موجود بالفعل!');
        return;
    }

    if (!tableVal) {
        alert('⚠️ يرجى إدخال رقم الطاولة!');
        return;
    }

    const newOrder = {
        id: manualId,
        tableNumber: tableVal,
        customer: { 
            name: customerName, 
            phone: customerPhone 
        },
        items: parseItems(itemsText),
        totalAmount: total,
        notes: notes,
        createdAt: new Date().toISOString(),
        status: "pending",
        realTime: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        source: "manual"
    };

    if (customerName && !uniqueCustomers.has(customerName)) {
        uniqueCustomers.add(customerName);
        stats.uniqueCustomers = uniqueCustomers.size;
    }
    if (notes.trim()) stats.ordersWithNotes++;

    allOrders.unshift(newOrder);
    saveData();
    renderPendingOrders();
    updateStats();
    updateRecentOrders();
    
    closeOrderModal();
    showNotification(`✅ تم إضافة طلب يدوي رقم ${manualId} للطاولة ${tableVal}`);
}

function parseItems(text) {
    if (!text) return [];
    return text.split(',').map(part => {
        const match = part.match(/(.+?)\s*×\s*(\d+)/);
        if (match) return { name: match[1].trim(), quantity: parseInt(match[2]) };
        return { name: part.trim(), quantity: 1 };
    });
}

// ==========================================
// 5. استقبال الطلبات من السيرفر - متوافق مع السيرفر الجديد ✅
// ==========================================
socket.on('new-orders', (newOrders) => {
    console.log('طلبات جديدة من السيرفر:', newOrders);
    
    newOrders.forEach(orderData => {
        // التحقق من أن الطلب غير موجود باستخدام orderNumber من السيرفر
        if (!allOrders.find(o => o.id == orderData.orderNumber)) {
            
            // ✅ استخراج البيانات من السيرفر الجديد
            const orderId = orderData.orderNumber || `ORD-${Date.now()}`;
            const tableNumber = orderData.tableNumber || "غير محدد";
            const customerName = orderData.customer?.name || "عميل";
            const customerPhone = orderData.customer?.phone || "";
            const items = orderData.items || [];
            const totalAmount = orderData.totalAmount || 0;
            const notes = orderData.notes || "";
            
            // إنشاء الطلب
            const formattedOrder = {
                id: orderId,
                tableNumber: tableNumber,
                customer: {
                    name: customerName,
                    phone: customerPhone
                },
                items: items,
                totalAmount: totalAmount,
                notes: notes,
                createdAt: orderData.createdAt || new Date().toISOString(),
                status: "pending",
                realTime: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
                source: "customer"
            };

            // تحديث الإحصائيات
            if (formattedOrder.customer.name && !uniqueCustomers.has(formattedOrder.customer.name)) {
                uniqueCustomers.add(formattedOrder.customer.name);
                stats.uniqueCustomers = uniqueCustomers.size;
            }
            if (formattedOrder.notes.trim()) stats.ordersWithNotes++;

            // إضافة الطلب
            allOrders.unshift(formattedOrder);
            saveData();
            renderPendingOrders();
            updateStats();
            updateRecentOrders();
            
            // إشعار تفصيلي
            const itemsText = formattedOrder.items.map(i => `${i.name} ×${i.quantity}`).join(', ');
            showNotification(
                `🔔 طلب جديد\n` +
                `#${formattedOrder.id}\n` +
                `👤 ${formattedOrder.customer.name}\n` +
                `🪑 ${formattedOrder.tableNumber}\n` +
                `📞 ${formattedOrder.customer.phone || 'لا يوجد'}\n` +
                `🍵 ${itemsText || 'لا توجد مشروبات'}\n` +
                `💰 ${formattedOrder.totalAmount} ج.م`
            );
        }
    });
});

// ==========================================
// 6. العرض (Rendering)
// ==========================================
function renderPendingOrders() {
    const pending = allOrders.filter(o => o.status === 'pending');
    const container = document.getElementById('orders-container');
    
    if (pending.length === 0) {
        container.innerHTML = `
            <div class="empty-state" id="empty-state">
                <div class="icon">☕</div>
                لا توجد طلبات جارية
            </div>`;
        return;
    }

    container.innerHTML = pending.map(order => `
        <div class="order-card pending ${order.source === 'customer' ? 'customer-order' : 'manual-order'}">
            <div class="order-header">
                <div class="order-time-badge">🕐 ${order.realTime}</div>
                <div class="order-number">#${order.id}</div>
                <span class="source-badge">${order.source === 'customer' ? '👤 عميل' : '🖊️ يدوي'}</span>
            </div>
            <div class="customer-section">
                <div class="customer-name">${order.customer.name}</div>
                <div class="customer-details">
                    <div class="detail-item">📞 ${order.customer.phone || '-'}</div>
                    <div class="detail-item">🪑 ${order.tableNumber}</div>
                </div>
            </div>
            ${order.notes ? `<div class="notes-section">${order.notes}</div>` : ''}
            <div class="order-details">
                <div class="total-amount">${order.totalAmount} ج.م</div>
                <ul class="items-list">
                    ${order.items.map(i => `<li>${i.name} ×${i.quantity}</li>`).join('')}
                </ul>
                <button class="delivery-btn" onclick="deliverOrder('${order.id}')">
                    ✅ تسليم
                </button>
            </div>
        </div>
    `).join('');
}

function deliverOrder(orderId) {
    const index = allOrders.findIndex(o => o.id == orderId);
    if (index > -1) {
        const order = allOrders[index];
        order.status = 'delivered';
        order.deliveredAt = new Date().toISOString();
        
        deliveredOrders.unshift(order);
        allOrders.splice(index, 1);
        
        const today = new Date().toDateString();
        if (new Date(order.deliveredAt).toDateString() === today) {
            stats.todayRevenue += order.totalAmount;
            stats.completedToday++;
        }
        stats.totalRevenue += order.totalAmount;
        
        // إرسال تحديث الحالة للسيرفر (اختياري)
        try {
            fetch(`http://localhost:5000/api/orders/${orderId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: 'delivered' })
            });
        } catch (e) {
            console.log('تم تسليم الطلب محلياً');
        }
        
        saveData();
        renderPendingOrders();
        updateStats();
        updateRecentOrders();
        showNotification(`✅ تم تسليم الطلب #${orderId} بنجاح`);
    }
}

function updateStats() {
    document.getElementById('today-sales').textContent = stats.todayRevenue + ' ج.م';
    document.getElementById('total-orders').textContent = allOrders.length + deliveredOrders.length;
    document.getElementById('new-customers').textContent = stats.uniqueCustomers;
    document.getElementById('orders-with-notes').textContent = stats.ordersWithNotes;
}

function updateRecentOrders() {
    const list = document.getElementById('recent-orders');
    const all = [...deliveredOrders, ...allOrders].slice(0, 10);
    
    if (all.length === 0) {
        list.innerHTML = '<tr><td colspan="6" style="text-align:center">لا توجد بيانات</td></tr>';
        return;
    }

    list.innerHTML = all.map(o => `
        <tr>
            <td>${o.realTime}</td>
            <td>${o.customer.name}</td>
            <td>${o.customer.phone}</td>
            <td>${o.tableNumber}</td>
            <td>${o.totalAmount} ج.م</td>
            <td><span class="status-badge ${o.status == 'delivered' ? 'status-complete' : 'status-pending'}">
                ${o.status == 'delivered' ? 'مكتمل' : 'جاري'}
            </span></td>
        </tr>
    `).join('');
}

// ==========================================
// 7. أدوات التحكم
// ==========================================

function refreshData() {
    showNotification('جاري تحديث البيانات...');
    loadData();
    setTimeout(() => {
        showNotification('✅ تم التحديث');
    }, 500);
}

function clearStorage() {
    if (confirm('هل أنت متأكد من مسح جميع البيانات؟')) {
        localStorage.clear();
        allOrders = [];
        deliveredOrders = [];
        uniqueCustomers.clear();
        stats = { todayRevenue: 0, totalRevenue: 0, completedToday: 0, uniqueCustomers: 0, ordersWithNotes: 0 };
        
        renderPendingOrders();
        updateStats();
        updateRecentOrders();
        showNotification('تم مسح البيانات');
    }
}

function exportData() {
    const data = [...deliveredOrders, ...allOrders];
    if(data.length === 0) { 
        showNotification('لا توجد بيانات'); 
        return; 
    }
    
    const csvContent = "رقم الطلب,اسم العميل,رقم الهاتف,رقم الطاولة,المشروبات,المبلغ,الحالة,الوقت,المصدر\n" + 
        data.map(e => {
            const itemsText = e.items.map(i => `${i.name}×${i.quantity}`).join(', ');
            return `${e.id},${e.customer.name},${e.customer.phone},${e.tableNumber},"${itemsText}",${e.totalAmount},${e.status},${e.realTime},${e.source === 'customer' ? 'عميل' : 'يدوي'}`;
        }).join("\n");
        
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `orders-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function toggleStats() {
    const p = document.getElementById('stats-panel');
    p.style.display = p.style.display === 'none' ? 'block' : 'none';
}

function hideEmptyStateIfNeeded() {
    const emptyState = document.getElementById('empty-state');
    if (emptyState && allOrders.length > 0) emptyState.remove();
}

function filterOrders() {
    document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
    if(event) event.target.classList.add('active');
}

function showNotification(msg, type='info') {
    const div = document.createElement('div');
    div.textContent = msg;
    div.style.cssText = `
        position: fixed;
        top: 20px;
        left: 20px;
        padding: 15px 20px;
        background: ${type == 'success' ? '#27ae60' : '#3498db'};
        color: white;
        border-radius: 8px;
        z-index: 9999;
        font-weight: bold;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        max-width: 400px;
        white-space: pre-line;
        line-height: 1.6;
    `;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 5000);
}


// حفظ تلقائي
setInterval(saveData, 30000);

// ==========================================
// 8. CSS إضافي للتنسيق
// ==========================================
const style = document.createElement('style');
style.textContent = `
    .source-badge {
        position: absolute;
        top: 15px;
        right: 15px;
        background: #3498db;
        color: white;
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 0.8em;
        font-weight: bold;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    }
    
    .manual-order .source-badge {
        background: #27ae60;
    }
    
    .customer-order {
        border-right: 4px solid #3498db;
    }
    
    .manual-order {
        border-right: 4px solid #27ae60;
    }
    
    .status-badge {
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 0.85em;
        font-weight: bold;
        display: inline-block;
        min-width: 70px;
        text-align: center;
    }
    
    .status-complete {
        background: linear-gradient(135deg, #d5f4e6, #c8efd9);
        color: #27ae60;
        border: 1px solid rgba(39, 174, 96, 0.2);
    }
    
    .status-pending {
        background: linear-gradient(135deg, #fff3cd, #ffeaa7);
        color: #f39c12;
        border: 1px solid rgba(243, 156, 18, 0.2);
    }
    
    /* تحسين عرض الجدول */
    .orders-table td {
        padding: 12px 15px;
    }
    
    .orders-table th {
        padding: 15px;
        background: linear-gradient(135deg, #f8f9fa, #e9ecef);
        color: #2c3e50;
    }
    
    /* تحسين البطاقات */
    .order-card {
        transition: transform 0.3s, box-shadow 0.3s;
    }
    
    .order-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 15px 35px rgba(0,0,0,0.1);
    }
    
    /* تحسين النصوص */
    .customer-name {
        font-size: 1.3em;
        font-weight: 700;
        margin-bottom: 10px;
    }
    
    .total-amount {
        font-size: 1.6em;
        font-weight: 800;
        color: #f39c12;
        margin: 15px 0;
    }
    
    /* تحسين القائمة */
    .items-list li {
        padding: 10px 0;
        border-bottom: 1px solid rgba(0,0,0,0.05);
        display: flex;
        justify-content: space-between;
    }
    
    .items-list li:last-child {
        border-bottom: none;
    }
`;
document.head.appendChild(style);