// ===== تنظیمات اولیه و متغیرهای سراسری =====
const App = {
    // اطلاعات کاربر (خالی در ابتدا)
    currentUser: {
        id: null,
        username: '',
        firstName: '',
        lastName: '',
        coins: 0,
        level: 1,
        wins: 0,
        games: 0,
        role: ''
    },
    
    // وضعیت فعلی
    currentPage: 'home',
    selectedCoins: 0,
    currentGameId: null,
    gamePhase: 'day',
    isLoading: true,
    
    // داده‌های پویا
    games: [],
    chatMessages: [],
    shopItems: [
        { coins: 500, price: 10000 },
        { coins: 1000, price: 18000 },
        { coins: 5000, price: 80000 },
        { coins: 10000, price: 150000 }
    ],
    
    roles: [
        { name: 'مافیا', team: 'mafia', icon: '🔪', count: 0 },
        { name: 'شهروند', team: 'citizen', icon: '👨‍🌾', count: 0 },
        { name: 'دکتر', team: 'citizen', icon: '💊', count: 0 },
        { name: 'کارآگاه', team: 'citizen', icon: '🔍', count: 0 }
    ]
};

// ===== تلگرام WebApp =====
const telegram = window.Telegram?.WebApp;

// ===== توابع کمکی =====

// نمایش لودینگ
function showLoading() {
    App.isLoading = true;
    updateLoadingState();
}

// مخفی کردن لودینگ
function hideLoading() {
    App.isLoading = false;
    updateLoadingState();
}

// آپدیت وضعیت لودینگ
function updateLoadingState() {
    // ... (همون کد قبلی)
}

// ===== ✅ توابع ارتباط با ربات =====

/**
 * ارسال داده به ربات تلگرام
 * @param {string} action - نوع عملیات
 * @param {object} data - داده‌های اضافی
 */
function sendToBot(action, data) {
    if (!telegram) {
        console.error('❌ تلگرام WebApp در دسترس نیست');
        showNotification('خطا در اتصال به ربات', 'error');
        return false;
    }
    
    try {
        const payload = JSON.stringify({
            action: action,
            ...data,
            timestamp: Date.now()
        });
        
        console.log('📤 ارسال به ربات:', payload);
        telegram.sendData(payload);
        return true;
        
    } catch (error) {
        console.error('❌ خطا در ارسال به ربات:', error);
        showNotification('خطا در ارتباط با ربات', 'error');
        return false;
    }
}

/**
 * خرید سکه
 * @param {number} amount - تعداد سکه
 */
function buyCoins(amount) {
    console.log('🛒 درخواست خرید:', amount);
    
    // نمایش مودال تایید
    showPurchaseModal(amount);
}

/**
 * نمایش مودال خرید
 */
function showPurchaseModal(amount) {
    App.selectedCoins = amount;
    
    const item = App.shopItems.find(i => i.coins === amount);
    if (!item) return;
    
    document.getElementById('modal-amount').textContent = 
        amount.toLocaleString('fa-IR') + ' سکه';
    
    document.getElementById('modal-price').textContent = 
        item.price.toLocaleString('fa-IR') + ' تومان';
    
    document.getElementById('purchase-modal').classList.add('active');
}

/**
 * بستن مودال
 */
function closeModal() {
    document.getElementById('purchase-modal').classList.remove('active');
    App.selectedCoins = 0;
}

/**
 * تایید خرید - ✅ این تابع اصلاح شده
 */
function confirmPurchase() {
    if (App.selectedCoins <= 0) {
        showNotification('لطفاً یک گزینه رو انتخاب کن', 'warning');
        return;
    }
    
    // ارسال به ربات
    const success = sendToBot('buy', { 
        coins: App.selectedCoins 
    });
    
    if (success) {
        showNotification('درخواست خرید ثبت شد', 'success');
    }
    
    closeModal();
}

// ===== توابع صفحه‌بندی =====

function changePage(pageName) {
    // مخفی کردن همه صفحات
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // نمایش صفحه انتخاب شده
    document.getElementById(`${pageName}-page`).classList.add('active');
    
    // آپدیت دکمه فعال در منو
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.page === pageName) {
            btn.classList.add('active');
        }
    });
    
    App.currentPage = pageName;
}

// ===== صفحه فروشگاه =====

function renderShopPage() {
    const container = document.getElementById('shop-content');
    if (!container) return;
    
    const itemsHTML = App.shopItems.map(item => `
        <div class="shop-item" onclick="buyCoins(${item.coins})">
            <div class="item-info">
                <span class="item-coins">🪙 ${item.coins.toLocaleString('fa-IR')} سکه</span>
                <span class="item-price">${item.price.toLocaleString('fa-IR')} تومان</span>
            </div>
            <button class="buy-btn" onclick="event.stopPropagation(); buyCoins(${item.coins})">خرید</button>
        </div>
    `).join('');
    
    container.innerHTML = `
        <h2>🛒 فروشگاه</h2>
        <div class="shop-items">
            ${itemsHTML}
        </div>
        
        <div class="alert info" style="margin-top: 20px;">
            <span class="alert-icon">🎁</span>
            <div class="alert-content">
                <div class="alert-title">تخفیف ویژه!</div>
                <div class="alert-message">با خرید ۱۰۰۰۰ سکه، ۱۰۰۰ سکه جایزه بگیر!</div>
            </div>
        </div>
    `;
}

// ===== نوتیفیکیشن =====

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `alert ${type}`;
    notification.style.position = 'fixed';
    notification.style.top = '80px';
    notification.style.left = '50%';
    notification.style.transform = 'translateX(-50%)';
    notification.style.width = '90%';
    notification.style.maxWidth = '400px';
    notification.style.zIndex = '1000';
    notification.style.animation = 'slideInDown 0.3s ease';
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'warning') icon = '⚠️';
    
    notification.innerHTML = `
        <span class="alert-icon">${icon}</span>
        <div class="alert-content">
            <div class="alert-message">${message}</div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutUp 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ===== مقداردهی اولیه =====

async function initApp() {
    showLoading();
    
    try {
        // دریافت اطلاعات کاربر از تلگرام
        if (telegram?.initDataUnsafe?.user) {
            const user = telegram.initDataUnsafe.user;
            App.currentUser.id = user.id;
            App.currentUser.username = user.username ? `@${user.username}` : '';
            App.currentUser.firstName = user.first_name || '';
            
            // به‌روزرسانی هدر
            updateHeader();
            
            // ارسال اطلاعات به ربات
            sendToBot('init', {
                userId: user.id,
                username: user.username,
                firstName: user.first_name
            });
        }
        
        // تنظیم رنگ‌های تلگرام
        if (telegram) {
            telegram.expand();
            telegram.setHeaderColor('#0A0A0F');
            telegram.setBackgroundColor('#0A0A0F');
        }
        
        hideLoading();
        
        // نمایش صفحه اصلی
        renderHomePage();
        
    } catch (error) {
        console.error('خطا:', error);
        hideLoading();
        showNotification('خطا در اتصال', 'error');
    }
}

// به‌روزرسانی هدر
function updateHeader() {
    const usernameEl = document.getElementById('username');
    const coinsEl = document.getElementById('user-coins');
    const avatarEl = document.getElementById('avatar');
    
    if (usernameEl) {
        usernameEl.textContent = App.currentUser.username || 'کاربر';
    }
    
    if (coinsEl) {
        coinsEl.textContent = App.currentUser.coins.toLocaleString('fa-IR');
    }
    
    if (avatarEl) {
        avatarEl.textContent = App.currentUser.firstName.charAt(0) || '👤';
    }
}

// صفحه اصلی
function renderHomePage() {
    const container = document.getElementById('home-content');
    if (!container) return;
    
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">🎮</div>
            <div class="empty-title">به ربات مافیا خوش اومدی!</div>
            <div class="empty-description">از منوی پایین صفحه فروشگاه رو انتخاب کن</div>
        </div>
    `;
}

// ===== رویدادها =====

document.addEventListener('DOMContentLoaded', () => {
    initApp();
    
    // رندر صفحه فروشگاه وقتی که active میشه
    renderShopPage();
});

// ===== انیمیشن‌ها =====
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInDown {
        from { transform: translate(-50%, -100%); opacity: 0; }
        to { transform: translate(-50%, 0); opacity: 1; }
    }
    @keyframes slideOutUp {
        from { transform: translate(-50%, 0); opacity: 1; }
        to { transform: translate(-50%, -100%); opacity: 0; }
    }
`;
document.head.appendChild(style);