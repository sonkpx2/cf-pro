let cart = [];

// إضافة مشروب للسلة
document.querySelectorAll('.add-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const item = btn.closest('.menu-item');
        const name = item.dataset.name;
        const price = parseFloat(item.dataset.price);

        const existingItem = cart.find(item => item.name === name);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({ name, price, quantity: 1 });
        }
        showAddToCartNotification(name);
        updateCart();
        updateFloatingButton();
    });
});

// تحديث عرض السلة والسعر الإجمالي
function updateCart() {
    const cartItemsContainer = document.getElementById('cart-items');
    const totalPrice = document.getElementById('total-price');

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="cart-empty">
                <p>السلة فارغة، أضف مشروبات من القائمة</p>
            </div>`;
    } else {
        cartItemsContainer.innerHTML = cart.map((item, index) => `
            <div class="cart-item">
                <span>${item.name} × ${item.quantity}</span>
                <div>
                    <span>${(item.price * item.quantity).toFixed(2)} جنيه</span>
                    <button class="remove-btn" onclick="removeItem(${index})">حذف</button>
                </div>
            </div>
        `).join('');
    }

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    totalPrice.textContent = total.toFixed(2);
    
    // تحديث الإجمالي النهائي
    document.getElementById('final-total').textContent = `${total.toFixed(2)} جنيه`;
}

// حذف عنصر من السلة
function removeItem(index) {
    cart.splice(index, 1);
    updateCart();
    updateFloatingButton();
}

// إرسال الطلب إلى Backend API - تم التصحيح ✅
document.getElementById('order-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const customerName = formData.get('customer_name');
    const customerPhone = formData.get('customer_phone');
    const tableNumber = formData.get('customer_table'); // ✅ رقم الطاولة مهم!

    // ✅ التحقق من البيانات
    if (!customerName || !customerPhone || !tableNumber) {
        alert('⚠️ يرجى إدخال جميع البيانات المطلوبة: الاسم، الهاتف، ورقم الطاولة');
        return;
    }

    if (cart.length === 0) {
        alert('⚠️ السلة فارغة! أضف مشروبات أولاً');
        return;
    }

    try {
        // ✅ البيانات التي يرسلها العميل إلى السيرفر
        const orderData = {
            customerName: customerName,
            customerPhone: customerPhone,
            tableNumber: tableNumber,  // ✅ رقم الطاولة يرسل هنا
            items: cart,
            totalAmount: parseFloat(document.getElementById('total-price').textContent)
        };

        console.log('بيانات الطلب المرسلة:', orderData);

        const response = await fetch('http://localhost:5000/api/orders', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify(orderData) // ✅ البيانات المصححة
        });

        const result = await response.json();
        
        if (response.ok && result.success) {
            alert(`✅ تم إرسال الطلب للكاشير بنجاح!\nرقم الطلب: ${result.data.orderNumber}`);
            
            // إفراغ السلة وإعادة التعيين
            cart = [];
            updateCart();
            updateFloatingButton();
            e.target.reset();
            
            // إظهار تفاصيل الطلب
            console.log('تفاصيل الطلب:', result.data);
        } else {
            alert(`❌ فشل في إرسال الطلب: ${result.message || 'حدث خطأ غير معروف'}`);
        }
    } catch (error) {
        console.error('خطأ في الاتصال:', error);
        alert('❌ خطأ في الاتصال بالخادم. تأكد من تشغيل السيرفر على localhost:5000');
    }
});

// التنقل السلس داخل الصفحة
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelector(anchor.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

// Floating Order Button Logic
const floatingOrderBtn = document.getElementById('floating-order-btn');
const cartBadge = document.getElementById('cart-badge');

// تحديث زر الطلب الطائر
function updateFloatingButton() {
    if (cart.length > 0) {
        floatingOrderBtn.style.display = 'flex';
        cartBadge.textContent = cart.reduce((total, item) => total + item.quantity, 0);
    } else {
        floatingOrderBtn.style.display = 'none';
    }
}

// عند النقر على زر الطائر، انتقل إلى نموذج الطلب
floatingOrderBtn.addEventListener('click', () => {
    // قم بالتمرير إلى قسم الطلب
    document.getElementById('order').scrollIntoView({ behavior: 'smooth' });
    
    // إضافة تأثير اهتزاز للفت الانتباه إلى النموذج
    const orderForm = document.getElementById('order-form');
    orderForm.style.animation = 'shake 0.5s';
    setTimeout(() => {
        orderForm.style.animation = '';
    }, 500);
    
    // وضع التركيز على أول حقل إدخال
    const firstInput = orderForm.querySelector('input');
    if (firstInput) {
        setTimeout(() => {
            firstInput.focus();
        }, 300);
    }
});

// دالة إشعار إضافة المشروب
function showAddToCartNotification(itemName) {
    // إنشاء تنبيه مؤقت
    const notification = document.createElement('div');
    notification.className = 'cart-notification';
    notification.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>تمت إضافة ${itemName} إلى السلة</span>
    `;
    
    // إضافة الأنماط
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background-color: #27ae60;
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 1001;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // إزالة التنبيه بعد 3 ثوانٍ
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// إضافة الأنماط مرة واحدة فقط
const style = document.createElement('style');
style.textContent = `
    /* تحسين نماذج الطلبات */
    .order-form input {
        width: 100%;
        padding: 12px;
        margin: 10px 0;
        border: 2px solid #ddd;
        border-radius: 8px;
        font-size: 16px;
        transition: border-color 0.3s;
    }
    
    .order-form input:focus {
        outline: none;
        border-color: #3498db;
    }
    
    .order-form button {
        width: 100%;
        padding: 15px;
        background: #27ae60;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 18px;
        font-weight: bold;
        cursor: pointer;
        transition: background 0.3s;
        margin-top: 15px;
    }
    
    .order-form button:hover {
        background: #219653;
    }
    
    /* تحسين سلة التسوق */
    .cart-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px;
        border-bottom: 1px solid #eee;
        background: #f9f9f9;
        margin-bottom: 8px;
        border-radius: 6px;
    }
    
    .cart-item span {
        font-weight: bold;
        color: #2c3e50;
    }
    
    .remove-btn {
        background: #e74c3c;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        margin-left: 10px;
    }
    
    .remove-btn:hover {
        background: #c0392b;
    }
    
    .cart-empty {
        text-align: center;
        padding: 30px;
        color: #7f8c8d;
        font-size: 18px;
    }
    
    /* تسليط الضوء على حقل الطاولة */
    input[name="customer_table"] {
        background-color: #fff8e1;
        border-color: #f39c12;
    }
    
    input[name="customer_table"]::placeholder {
        color: #e67e22;
        font-weight: bold;
    }
    
    /* تحسين عرض السعر */
    #total-price, #final-total {
        color: #27ae60;
        font-weight: bold;
        font-size: 1.2em;
    }
    
    /* Floating Order Button */
    .floating-order-btn {
        position: fixed;
        bottom: 30px;
        left: 30px;
        background-color: #8B4513;
        color: white;
        width: 70px;
        height: 70px;
        border-radius: 50%;
        display: none;
        justify-content: center;
        align-items: center;
        font-size: 24px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        cursor: pointer;
        z-index: 1000;
        transition: all 0.3s ease;
        border: none;
    }

    .floating-order-btn:hover {
        background-color: #A0522D;
        transform: scale(1.1);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
    }

    .floating-order-btn .badge {
        position: absolute;
        top: -5px;
        right: -5px;
        background-color: #e74c3c;
        color: white;
        font-size: 14px;
        font-weight: bold;
        width: 25px;
        height: 25px;
        border-radius: 50%;
        display: flex;
        justify-content: center;
        align-items: center;
    }
    
    /* Animations */
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
    
    @keyframes slideIn {
        from {
            top: -100px;
            opacity: 0;
        }
        to {
            top: 20px;
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            top: 20px;
            opacity: 1;
        }
        to {
            top: -100px;
            opacity: 0;
        }
    }
    
    /* للشاشات الصغيرة */
    @media (max-width: 768px) {
        .floating-order-btn {
            bottom: 20px;
            left: 20px;
            width: 60px;
            height: 60px;
            font-size: 20px;
        }
    }
`;
document.head.appendChild(style);

// التأكد من إخفاء الزر الطائر في البداية
document.addEventListener('DOMContentLoaded', () => {
    updateFloatingButton();
});