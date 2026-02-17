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
    
    // داده‌های پویا (آماده برای دریافت از سرور)
    games: [],           // لیست بازی‌ها خالی
    chatMessages: [],    // پیام‌های چت خالی
    shopItems: [         // آیتم‌های فروشگاه ثابت
        { coins: 500, price: 10000 },
        { coins: 1000, price: 18000 },
        { coins: 5000, price: 80000 },
        { coins: 10000, price: 150000 }
    ],
    
    // نقش‌های بازی
    roles: [
        { name: 'مافیا', team: 'mafia', icon: '🔪', count: 0 },
        { name: 'شهروند', team: 'citizen', icon: '👨‍🌾', count: 0 },
        { name: 'دکتر', team: 'citizen', icon: '💊', count: 0 },
        { name: 'کارآگاه', team: 'citizen', icon: '🔍', count: 0 },
        { name: 'تفنگدار', team: 'citizen', icon: '🔫', count: 0 },
        { name: 'طرفدار', team: 'citizen', icon: '⭐', count: 0 },
        { name: 'گروگان‌گیر', team: 'independent', icon: '🪢', count: 0 },
        { name: 'جاسوس', team: 'mafia', icon: '🕵️', count: 0 },
        { name: 'دکتر معتاد', team: 'citizen', icon: '💉', count: 0 },
        { name: 'بلدرچین', team: 'independent', icon: '🐦', count: 0 }
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

// آپدیت وضعیت لودینگ در همه صفحات
function updateLoadingState() {
    const pages = ['home', 'game', 'shop', 'profile'];
    pages.forEach(page => {
        const container = document.getElementById(`${page}-content`);
        if (container && App.isLoading) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="loading-spinner"></div>
                    <div class="empty-title">در حال بارگذاری...</div>
                    <div class="empty-description">لطفاً صبر کنید</div>
                </div>
            `;
        }
    });
}

// ===== ✅ توابع ارتباط با ربات =====

/**
 * ارسال داده به ربات تلگرام
 * @param {string} action - نوع عملیات (buy, chat, join, create)
 * @param {object} data - داده‌های اضافی
 */
function sendToBot(action, data) {
    if (!telegram) {
        console.error('تلگرام WebApp در دسترس نیست');
        showNotification('خطا در اتصال به ربات', 'error');
        return;
    }
    
    try {
        const payload = JSON.stringify({
            action: action,
            ...data,
            timestamp: Date.now(),
            userId: App.currentUser.id
        });
        
        telegram.sendData(payload);
        console.log(`✅ داده ارسال شد: ${action}`, data);
        
    } catch (error) {
        console.error('❌ خطا در ارسال به ربات:', error);
        showNotification('خطا در ارتباط با ربات', 'error');
    }
}

/**
 * هندلر خرید از فروشگاه
 * @param {number} amount - تعداد سکه
 */
function handlePurchase(amount) {
    sendToBot('buy', { coins: amount });
    showNotification('درخواست خرید ثبت شد پیوی ربات رو چک کن🪙', 'success');
}

/**
 * هندلر ارسال پیام در چت
 */
function handleSendMessage() {
    const input = document.getElementById('chat-input');
    const message = input?.value.trim();
    
    if (!message) return;
    
    if (!App.currentGameId) {
        showNotification('لطفاً ابتدا وارد بازی شوید', 'warning');
        return;
    }
    
    sendToBot('chat', {
        gameId: App.currentGameId,
        message: message,
        username: App.currentUser.username
    });
    
    // اضافه کردن پیام به صورت موقت
    addTemporaryMessage(message);
    input.value = '';
}

/**
 * اضافه کردن پیام موقت به چت
 */
function addTemporaryMessage(message) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    
    const time = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message sent';
    messageDiv.innerHTML = `
        <div class="message-info">
            <span class="message-sender">شما</span>
            <span class="message-time">${time}</span>
        </div>
        ${message}
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * هندلر ورود به بازی
 * @param {number} gameId - آیدی بازی
 */
function handleJoinGame(gameId) {
    sendToBot('join', { gameId: gameId });
}

/**
 * هندلر ساخت بازی جدید
 */
function handleCreateGame() {
    sendToBot('create', {
        username: App.currentUser.username,
        firstName: App.currentUser.firstName
    });
}

/**
 * هندلر اقدامات شب (برای نقش مافیا)
 * @param {number} targetId - آیدی قربانی
 */
function handleNightAction(targetId) {
    if (App.gamePhase !== 'night') {
        showNotification('الان شب نیست!', 'warning');
        return;
    }
    
    sendToBot('night_action', {
        gameId: App.currentGameId,
        targetId: targetId
    });
}

/**
 * هندلر رأی‌گیری روز
 * @param {number} targetId - آیدی کاندیدای اعدام
 */
function handleVote(targetId) {
    if (App.gamePhase !== 'day') {
        showNotification('الان روز نیست!', 'warning');
        return;
    }
    
    sendToBot('vote', {
        gameId: App.currentGameId,
        targetId: targetId
    });
}

// ===== توابع اصلی =====

// مقداردهی اولیه
async function initApp() {
    showLoading();
    
    try {
        // دریافت اطلاعات کاربر از تلگرام
        if (telegram?.initDataUnsafe?.user) {
            const user = telegram.initDataUnsafe.user;
            App.currentUser.id = user.id;
            App.currentUser.username = user.username ? `@${user.username}` : '';
            App.currentUser.firstName = user.first_name || '';
            App.currentUser.lastName = user.last_name || '';
            
            // به‌روزرسانی هدر
            updateHeader();
            
            // ارسال اطلاعات کاربر به ربات
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
        console.error('خطا در بارگذاری اولیه:', error);
        hideLoading();
        showNotification('خطا در اتصال به سرور', 'error');
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
        if (App.currentUser.firstName) {
            avatarEl.textContent = App.currentUser.firstName.charAt(0);
        } else {
            avatarEl.textContent = '👤';
        }
    }
}

// ===== صفحه اصلی =====

// رندر صفحه اصلی
function renderHomePage() {
    const container = document.getElementById('home-content');
    if (!container) return;
    
    if (App.games.length === 0) {
        // نمایش حالت خالی
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🎮</div>
                <div class="empty-title">هنوز بازی‌ای ساخته نشده!</div>
                <div class="empty-description">اولین نفری باش که یه بازی می‌سازه</div>
                <button class="create-game-btn" style="margin-top: 20px;" onclick="createGame()">
                    <span>➕</span> ساخت بازی جدید
                </button>
            </div>
        `;
    } else {
        // نمایش لیست بازی‌ها
        let gamesHTML = '';
        App.games.forEach(game => {
            gamesHTML += `
                <div class="game-card" onclick="joinGame(${game.id})">
                    <div class="game-header">
                        <span class="game-title">${game.name}</span>
                        <span class="game-status">${game.status}</span>
                    </div>
                    <div class="game-info">
                        <span>👥 ${game.players}/${game.maxPlayers} نفر</span>
                        <span>⚡️ سطح ${game.level}</span>
                        <span>🕒 ${game.time}</span>
                    </div>
                    <div class="game-progress">
                        <div class="progress-bar" style="width: ${(game.players/game.maxPlayers)*100}%"></div>
                    </div>
                    <button class="join-btn" onclick="event.stopPropagation(); joinGame(${game.id})">
                        ${game.players === game.maxPlayers ? 'مشاهده بازی' : 'ورود به بازی'}
                    </button>
                </div>
            `;
        });
        
        container.innerHTML = `
            <h2>🎮 بازی‌های در حال برگزاری</h2>
            <div class="games-list">
                ${gamesHTML}
            </div>
            <button class="create-game-btn" onclick="createGame()">
                <span>➕</span> ساخت بازی جدید
            </button>
        `;
    }
}

// ساخت بازی جدید
async function createGame() {
    showLoading();
    
    try {
        // ارسال به ربات
        handleCreateGame();
        showNotification('درخواست ساخت بازی ارسال شد', 'success');
        
        // شبیه‌سازی دریافت از سرور (بعداً با API واقعی عوض کن)
        setTimeout(() => {
            hideLoading();
        }, 1000);
        
    } catch (error) {
        showNotification('خطا در ساخت بازی', 'error');
        hideLoading();
    }
}

// ورود به بازی
async function joinGame(gameId) {
    showLoading();
    App.currentGameId = gameId;
    
    try {
        // ارسال به ربات
        handleJoinGame(gameId);
        
        // رندر صفحه بازی
        renderGamePage();
        changePage('game');
        
    } catch (error) {
        showNotification('خطا در ورود به بازی', 'error');
    } finally {
        hideLoading();
    }
}

// ===== صفحه بازی =====

// رندر صفحه بازی
function renderGamePage() {
    const container = document.getElementById('game-content');
    if (!container) return;
    
    // رندر نقش‌ها
    const rolesHTML = App.roles.map(role => `
        <div class="role-card ${role.team}" onclick="selectRole('${role.name}')">
            <div class="role-icon">${role.icon}</div>
            <div class="role-name">${role.name}</div>
            <div class="role-team">${getTeamName(role.team)}</div>
            ${role.count > 0 ? `<span class="badge ${role.team}" style="margin-top: 8px;">${role.count} نفر</span>` : ''}
        </div>
    `).join('');
    
    // رندر پیام‌ها
    const messagesHTML = App.chatMessages.map(msg => `
        <div class="message ${msg.type === 'self' ? 'sent' : 'received'}">
            <div class="message-info">
                <span class="message-sender">${msg.sender}</span>
                <span class="message-time">${msg.time}</span>
            </div>
            ${msg.message}
        </div>
    `).join('');
    
    container.innerHTML = `
        <div class="game-header" style="justify-content: space-between; margin-bottom: 20px;">
            <h2 style="margin-bottom: 0;">🎮 اتاق #${App.currentGameId}</h2>
            <span class="badge ${App.gamePhase === 'night' ? 'mafia' : 'citizen'}">
                ${App.gamePhase === 'night' ? 'شب 🌙' : 'روز ☀️'}
            </span>
        </div>

        <div class="roles-container">
            ${rolesHTML}
        </div>

        <div class="chat-container">
            <div class="chat-messages" id="chat-messages">
                ${messagesHTML || '<div class="empty-state" style="padding: 20px;">هنوز پیامی ارسال نشده</div>'}
            </div>
            <div class="chat-input">
                <input type="text" placeholder="پیامت رو بنویس..." id="chat-input" onkeypress="handleChatKeyPress(event)">
                <button onclick="sendMessage()">📤</button>
            </div>
        </div>
    `;
    
    // اسکرول به پایین چت
    setTimeout(() => {
        const chatDiv = document.getElementById('chat-messages');
        if (chatDiv) chatDiv.scrollTop = chatDiv.scrollHeight;
    }, 100);
}

// تبدیل نام تیم به فارسی
function getTeamName(team) {
    switch(team) {
        case 'mafia': return 'تیم مافیا';
        case 'citizen': return 'تیم شهر';
        case 'independent': return 'مستقل';
        default: return '';
    }
}

// انتخاب نقش
function selectRole(roleName) {
    if (roleName === 'مافیا' && App.gamePhase === 'night') {
        showNotification('می‌تونی امشب یکی رو بکشی', 'info');
    }
}

// ارسال پیام
function sendMessage() {
    handleSendMessage();
}

// هندلر کلید Enter در چت
function handleChatKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

// ===== صفحه فروشگاه =====

// رندر صفحه فروشگاه
function renderShopPage() {
    const container = document.getElementById('shop-content');
    if (!container) return;
    
    const itemsHTML = App.shopItems.map(item => `
        <div class="shop-item" onclick="showPurchaseModal(${item.coins})">
            <div class="item-info">
                <span class="item-coins">${item.coins.toLocaleString('fa-IR')} سکه</span>
                <span class="item-price">${item.price.toLocaleString('fa-IR')} تومان</span>
            </div>
            <button class="buy-btn" onclick="event.stopPropagation(); showPurchaseModal(${item.coins})">خرید</button>
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

// نمایش مودال خرید
function showPurchaseModal(coins) {
    App.selectedCoins = coins;
    
    const item = App.shopItems.find(i => i.coins === coins);
    if (!item) return;
    
    document.getElementById('modal-amount').textContent = 
        coins.toLocaleString('fa-IR') + ' سکه';
    
    document.getElementById('modal-price').textContent = 
        item.price.toLocaleString('fa-IR') + ' تومان';
    
    document.getElementById('purchase-modal').classList.add('active');
}

// بستن مودال
function closeModal() {
    document.getElementById('purchase-modal').classList.remove('active');
    App.selectedCoins = 0;
}

// تایید خرید
function confirmPurchase() {
    if (App.selectedCoins > 0) {
        handlePurchase(App.selectedCoins);
    }
    closeModal();
}

// ===== صفحه پروفایل =====

// رندر صفحه پروفایل
function renderProfilePage() {
    const container = document.getElementById('profile-content');
    if (!container) return;
    
    container.innerHTML = `
        <h2>👤 پروفایل</h2>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-icon">⭐️</div>
                <div class="stat-label">لول</div>
                <div class="stat-value">${App.currentUser.level}</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">🪙</div>
                <div class="stat-label">سکه</div>
                <div class="stat-value">${App.currentUser.coins.toLocaleString('fa-IR')}</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">🏆</div>
                <div class="stat-label">بردها</div>
                <div class="stat-value">${App.currentUser.wins}</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">🎮</div>
                <div class="stat-label">بازی‌ها</div>
                <div class="stat-value">${App.currentUser.games}</div>
            </div>
        </div>

        ${App.currentUser.games > 0 ? `
            <div style="margin-top: 20px;">
                <h3>📊 آمار پیشرفته</h3>
                <div style="background: var(--bg-secondary); border-radius: var(--border-radius-lg); padding: 16px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                        <span>بهترین نقش:</span>
                        <span class="badge mafia">${App.currentUser.role || 'ثبت نشده'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span>تاریخ عضویت:</span>
                        <span>${new Date().toLocaleDateString('fa-IR')}</span>
                    </div>
                </div>
            </div>
        ` : `
            <div class="empty-state" style="margin-top: 20px;">
                <div class="empty-icon">📊</div>
                <div class="empty-title">آماری وجود ندارد</div>
                <div class="empty-description">با بازی کردن آمارت رو بساز!</div>
            </div>
        `}
        
        <button class="create-game-btn" style="margin-top: 20px;" onclick="logout()">
            <span>⚙️</span> تنظیمات
        </button>
    `;
}

// ===== تغییر صفحه =====

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
    
    // رندر محتوای صفحه
    switch(pageName) {
        case 'home':
            renderHomePage();
            break;
        case 'shop':
            renderShopPage();
            break;
        case 'profile':
            renderProfilePage();
            break;
        // game page جداگانه رندر می‌شه
    }
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

// ===== خروج =====

function logout() {
    if (confirm('آیا می‌خوای خارج بشی؟')) {
        if (telegram) {
            telegram.close();
        }
    }
}

// ===== رویدادها =====

document.addEventListener('DOMContentLoaded', () => {
    // مقداردهی اولیه
    initApp();
});

// ===== انیمیشن‌های اضافی =====
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInDown {
        from {
            transform: translate(-50%, -100%);
            opacity: 0;
        }
        to {
            transform: translate(-50%, 0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutUp {
        from {
            transform: translate(-50%, 0);
            opacity: 1;
        }
        to {
            transform: translate(-50%, -100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);