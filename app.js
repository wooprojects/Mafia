// ===== تنظیمات اولیه و متغیرهای سراسری =====
const App = {
    // اطلاعات کاربر
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
    selectedItem: null,
    currentGameId: null,
    gamePhase: 'day',
    isLoading: false,
    
    // داده‌های پویا
    games: [],
    chatMessages: [],
    pendingPurchases: [],
    shopItems: [
        { id: 'coin_500', coins: 500, price: 10000 },
        { id: 'coin_1000', coins: 1000, price: 18000 },
        { id: 'coin_5000', coins: 5000, price: 80000 },
        { id: 'coin_10000', coins: 10000, price: 150000 }
    ],
    
    roles: [
        { name: 'مافیا', team: 'mafia', icon: '🔪', count: 0 },
        { name: 'شهروند', team: 'citizen', icon: '👨‍🌾', count: 0 },
        { name: 'دکتر', team: 'citizen', icon: '💊', count: 0 },
        { name: 'کارآگاه', team: 'citizen', icon: '🔍', count: 0 },
        { name: 'تک‌تیرانداز', team: 'citizen', icon: '🔫', count: 0 },
        { name: 'پدرخوانده', team: 'mafia', icon: '👑', count: 0 },
        { name: 'دکتر مافیا', team: 'mafia', icon: '💉', count: 0 }
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
    const loadingElements = document.querySelectorAll('.loading-spinner');
    loadingElements.forEach(el => {
        el.style.display = App.isLoading ? 'block' : 'none';
    });
}

// ===== ✅ توابع ارتباط با ربات (اصلاح شده) =====

/**
 * ارسال داده به ربات تلگرام
 */
function sendToBot(action, data) {
    if (!telegram) {
        console.error('❌ تلگرام WebApp در دسترس نیست');
        showNotification('خطا در اتصال به ربات', 'error');
        return false;
    }
    
    try {
        // آماده‌سازی داده
        const payload = {
            action: action,
            ...data,
            timestamp: Date.now(),
            webAppData: true,
            userId: App.currentUser.id
        };
        
        // تبدیل به JSON
        const jsonString = JSON.stringify(payload);
        
        console.log('📤 ارسال به ربات:', {
            action: action,
            data: data,
            payload: payload
        });
        
        // ارسال داده
        telegram.sendData(jsonString);
        
        console.log('✅ داده با موفقیت ارسال شد');
        
        // ارسال نوتیفیکیشن برای خرید
        if (action === 'purchase_invoice') {
            showNotification('✅ فاکتور خرید با موفقیت ارسال شد', 'success');
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ خطا در ارسال به ربات:', error);
        showNotification('خطا در ارتباط با ربات', 'error');
        return false;
    }
}

/**
 * دریافت پاسخ از ربات
 */
function handleBotResponse(data) {
    console.log('📩 دریافت از ربات:', data);
    
    try {
        // اگر داده به صورت JSON است
        const response = typeof data === 'string' ? JSON.parse(data) : data;
        
        switch(response.action) {
            case 'purchase_completed':
                handlePurchaseCompleted(response);
                break;
                
            case 'purchase_failed':
                handlePurchaseFailed(response);
                break;
                
            case 'purchase_cancelled':
                showNotification('خرید لغو شد', 'warning');
                break;
                
            case 'user_updated':
                handleUserUpdated(response);
                break;
                
            case 'game_created':
                handleGameCreated(response);
                break;
                
            case 'game_joined':
                handleGameJoined(response);
                break;
                
            case 'new_message':
                handleNewMessage(response);
                break;
                
            default:
                console.log('اقدام ناشناخته:', response.action);
        }
    } catch (error) {
        console.error('خطا در پردازش پاسخ ربات:', error);
    }
}

function handlePurchaseCompleted(response) {
    // به‌روزرسانی سکه‌های کاربر
    if (response.newCoins) {
        App.currentUser.coins = response.newCoins;
        updateHeader();
    }
    
    // نمایش مودال موفقیت
    showSuccessModal();
    
    // حذف از خریدهای در انتظار
    if (App.pendingPurchases) {
        App.pendingPurchases = App.pendingPurchases.filter(
            p => p.timestamp !== response.timestamp
        );
        localStorage.setItem('pendingPurchases', JSON.stringify(App.pendingPurchases));
    }
    
    // به‌روزرسانی صفحه پروفایل
    if (App.currentPage === 'profile') {
        renderProfilePage();
    }
    
    showNotification('خرید با موفقیت انجام شد! 🎉', 'success');
}

function handlePurchaseFailed(response) {
    showErrorModal(response.message || 'خطا در تکمیل خرید');
    
    // حذف از خریدهای در انتظار
    if (App.pendingPurchases) {
        App.pendingPurchases = App.pendingPurchases.filter(
            p => p.timestamp !== response.timestamp
        );
        localStorage.setItem('pendingPurchases', JSON.stringify(App.pendingPurchases));
    }
}

function handleUserUpdated(response) {
    if (response.user) {
        App.currentUser = {
            ...App.currentUser,
            ...response.user
        };
        updateHeader();
        
        if (App.currentPage === 'profile') {
            renderProfilePage();
        }
    }
}

function handleGameCreated(response) {
    if (response.gameId) {
        App.currentGameId = response.gameId;
        showNotification(`بازی ${response.gameId} ساخته شد`, 'success');
        changePage('game');
    }
}

function handleGameJoined(response) {
    if (response.gameId) {
        App.currentGameId = response.gameId;
        showNotification(`به بازی ${response.gameId} ملحق شدید`, 'success');
        changePage('game');
    }
}

function handleNewMessage(response) {
    if (response.message && App.currentPage === 'game') {
        addReceivedMessage(response.message);
    }
}

// ===== توابع صفحه‌بندی =====

function changePage(pageName) {
    // مخفی کردن همه صفحات
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // نمایش صفحه انتخاب شده
    const selectedPage = document.getElementById(`${pageName}-page`);
    if (selectedPage) {
        selectedPage.classList.add('active');
    }
    
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
        case 'game':
            if (App.currentGameId) {
                renderGamePage();
            }
            break;
    }
}

// ===== صفحه اصلی =====

function renderHomePage() {
    const container = document.getElementById('home-content');
    if (!container) return;
    
    if (App.games.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🎮</div>
                <div class="empty-title">به ربات مافیا خوش اومدی!</div>
                <div class="empty-description">برای شروع، یک بازی بساز یا به بازی دیگه ملحق شو</div>
                <button class="create-game-btn" onclick="createGame()" style="margin-top: 20px;">
                    <span>➕</span> ساخت بازی جدید
                </button>
            </div>
        `;
    } else {
        let gamesHTML = '<h2>🎮 بازی‌های فعال</h2><div class="games-list">';
        
        App.games.forEach(game => {
            gamesHTML += `
                <div class="game-card" onclick="joinGame(${game.id})">
                    <div class="game-header">
                        <span class="game-title">بازی ${game.id}</span>
                        <span class="game-status ${game.status}">${game.status || 'در انتظار'}</span>
                    </div>
                    <div class="game-info">
                        <span>👥 ${game.players || 0}/10</span>
                        <span>🕒 ${game.time || 'لحظاتی پیش'}</span>
                    </div>
                    <div class="game-progress">
                        <div class="progress-bar" style="width: ${((game.players || 0)/10)*100}%"></div>
                    </div>
                    <button class="join-btn" onclick="event.stopPropagation(); joinGame(${game.id})">
                        ورود به بازی
                    </button>
                </div>
            `;
        });
        
        gamesHTML += '</div><button class="create-game-btn" onclick="createGame()"><span>➕</span> ساخت بازی جدید</button>';
        container.innerHTML = gamesHTML;
    }
}

// ===== صفحه فروشگاه (اصلاح شده) =====

function renderShopPage() {
    const container = document.getElementById('shop-content');
    if (!container) return;
    
    let itemsHTML = '<h2>🛒 فروشگاه</h2><div class="shop-items">';
    
    App.shopItems.forEach(item => {
        itemsHTML += `
            <div class="shop-item" onclick="buyCoins(${item.coins})">
                <div class="item-info">
                    <span class="item-coins">🪙 ${item.coins.toLocaleString('fa-IR')} سکه</span>
                    <span class="item-price">${item.price.toLocaleString('fa-IR')} تومان</span>
                </div>
                <button class="buy-btn" onclick="event.stopPropagation(); buyCoins(${item.coins})">خرید</button>
            </div>
        `;
    });
    
    itemsHTML += '</div>';
    
    // اضافه کردن بنر تخفیف
    itemsHTML += `
        <div class="alert info" style="margin-top: 20px;">
            <span class="alert-icon">🎁</span>
            <div class="alert-content">
                <div class="alert-title">تخفیف ویژه!</div>
                <div class="alert-message">با خرید ۱۰۰۰۰ سکه، ۱۰۰۰ سکه جایزه بگیر!</div>
            </div>
        </div>
    `;
    
    container.innerHTML = itemsHTML;
}

// ===== صفحه پروفایل =====

function renderProfilePage() {
    const container = document.getElementById('profile-content');
    if (!container) return;
    
    const winRate = App.currentUser.games > 0 
        ? ((App.currentUser.wins / App.currentUser.games) * 100).toFixed(1) 
        : 0;
    
    container.innerHTML = `
        <h2>👤 پروفایل</h2>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-icon">⭐️</div>
                <div class="stat-label">سطح</div>
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

        <div style="margin-top: 20px;">
            <h3>📊 آمار پیشرفته</h3>
            <div style="background: var(--bg-secondary); border-radius: var(--border-radius-lg); padding: 16px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                    <span>راندمان:</span>
                    <span class="badge ${winRate > 50 ? 'success' : 'warning'}">${winRate}%</span>
                </div>
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
        
        <div style="display: flex; gap: 10px; margin-top: 20px;">
            <button class="create-game-btn" style="flex: 1;" onclick="showSettings()">
                <span>⚙️</span> تنظیمات
            </button>
            <button class="create-game-btn" style="flex: 1; background: var(--red-secondary);" onclick="showPurchaseHistory()">
                <span>📜</span> تاریخچه خرید
            </button>
        </div>
    `;
}

// ===== صفحه بازی =====

function renderGamePage() {
    const container = document.getElementById('game-content');
    if (!container) return;
    
    // رندر نقش‌ها
    let rolesHTML = '<div class="roles-container">';
    App.roles.forEach(role => {
        rolesHTML += `
            <div class="role-card ${role.team}">
                <div class="role-icon">${role.icon}</div>
                <div class="role-name">${role.name}</div>
                <div class="role-team">${getTeamName(role.team)}</div>
                ${role.count > 0 ? `<span class="badge ${role.team}">${role.count} نفر</span>` : ''}
            </div>
        `;
    });
    rolesHTML += '</div>';
    
    // رندر پیام‌ها
    let messagesHTML = '<div class="chat-messages" id="chat-messages">';
    if (App.chatMessages.length === 0) {
        messagesHTML += '<div class="empty-state" style="padding: 20px;">هنوز پیامی ارسال نشده</div>';
    } else {
        App.chatMessages.forEach(msg => {
            messagesHTML += `
                <div class="message ${msg.type === 'self' ? 'sent' : 'received'}">
                    <div class="message-info">
                        <span class="message-sender">${msg.sender}</span>
                        <span class="message-time">${msg.time}</span>
                    </div>
                    ${msg.message}
                </div>
            `;
        });
    }
    messagesHTML += '</div>';
    
    container.innerHTML = `
        <div class="game-header" style="justify-content: space-between; margin-bottom: 20px;">
            <h2 style="margin-bottom: 0;">🎮 اتاق #${App.currentGameId}</h2>
            <span class="badge ${App.gamePhase === 'night' ? 'mafia' : 'citizen'}">
                ${App.gamePhase === 'night' ? 'شب 🌙' : 'روز ☀️'}
            </span>
        </div>

        ${rolesHTML}

        <div class="chat-container">
            ${messagesHTML}
            <div class="chat-input">
                <input type="text" placeholder="پیامت رو بنویس..." id="chat-input" onkeypress="handleChatKeyPress(event)">
                <button onclick="sendMessage()">📤</button>
            </div>
        </div>
    `;
    
    // اسکرول به پایین
    setTimeout(() => {
        const chatDiv = document.getElementById('chat-messages');
        if (chatDiv) chatDiv.scrollTop = chatDiv.scrollHeight;
    }, 100);
}

// ===== توابع بازی =====

function createGame() {
    showLoading();
    
    const success = sendToBot('create_game', {
        name: `بازی ${App.currentUser.username || 'جدید'}`,
        userId: App.currentUser.id
    });
    
    if (success) {
        showNotification('درخواست ساخت بازی ارسال شد', 'success');
    }
    
    setTimeout(hideLoading, 1000);
}

function joinGame(gameId) {
    App.currentGameId = gameId;
    
    const success = sendToBot('join_game', { 
        gameId: gameId,
        userId: App.currentUser.id
    });
    
    if (success) {
        showNotification('درخواست ورود به بازی ارسال شد', 'success');
        changePage('game');
    }
}

function sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input?.value.trim();
    
    if (!message) return;
    
    if (!App.currentGameId) {
        showNotification('لطفاً ابتدا وارد بازی شوید', 'warning');
        return;
    }
    
    const success = sendToBot('chat_message', {
        gameId: App.currentGameId,
        message: message,
        userId: App.currentUser.id
    });
    
    if (success) {
        // اضافه کردن پیام به صورت موقت
        addTemporaryMessage(message);
        input.value = '';
    }
}

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

function addReceivedMessage(message) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message received';
    messageDiv.innerHTML = `
        <div class="message-info">
            <span class="message-sender">${message.sender}</span>
            <span class="message-time">${message.time}</span>
        </div>
        ${message.text}
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function handleChatKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

function getTeamName(team) {
    switch(team) {
        case 'mafia': return 'تیم مافیا';
        case 'citizen': return 'تیم شهر';
        case 'independent': return 'مستقل';
        default: return '';
    }
}

// ===== توابع خرید (اصلاح شده) =====

function buyCoins(amount) {
    console.log('🛒 درخواست خرید:', amount);
    App.selectedCoins = amount;
    showPurchaseModal(amount);
}

function showPurchaseModal(amount) {
    const item = App.shopItems.find(i => i.coins === amount);
    if (!item) return;
    
    document.getElementById('modal-amount').textContent = 
        amount.toLocaleString('fa-IR') + ' سکه';
    
    document.getElementById('modal-price').textContent = 
        item.price.toLocaleString('fa-IR') + ' تومان';
    
    // ذخیره اطلاعات آیتم برای استفاده در تأیید خرید
    App.selectedItem = item;
    
    document.getElementById('purchase-modal').classList.add('active');
}

function closeModal() {
    document.getElementById('purchase-modal').classList.remove('active');
    App.selectedCoins = 0;
    App.selectedItem = null;
}

function confirmPurchase() {
    if (App.selectedCoins <= 0 || !App.selectedItem) {
        showNotification('لطفاً یک گزینه رو انتخاب کن', 'warning');
        return;
    }
    
    // ایجاد اطلاعات فاکتور    // ایجاد اطلاعات فاکتور
    const invoiceData = {
        coins: App.selectedCoins,
        price: App.selectedItem.price,
        itemId: App.selectedItem.id,
        description: `خرید ${App.selectedCoins.toLocaleString('fa-IR')} سکه`,
        userId: App.currentUser.id,
        username: App.currentUser.username,
        firstName: App.currentUser.firstName,
        lastName: App.currentUser.lastName
    };
    
    console.log('💰 ارسال فاکتور خرید:', invoiceData);
    
    // ارسال فاکتور به ربات
    const success = sendToBot('purchase_invoice', invoiceData);
    
    if (success) {
        closeModal();
        // نمایش پیام در انتظار پرداخت
        showNotification('فاکتور خرید ارسال شد. لطفاً صبر کنید...', 'info');
        
        // اضافه کردن به تاریخچه خریدهای در انتظار
        addToPendingPurchases(invoiceData);
    } else {
        showErrorModal('خطا در ارتباط با ربات');
    }
}

// اضافه کردن تابع برای پیگیری خریدهای در انتظار
function addToPendingPurchases(invoiceData) {
    if (!App.pendingPurchases) {
        App.pendingPurchases = [];
    }
    
    App.pendingPurchases.push({
        ...invoiceData,
        timestamp: Date.now(),
        status: 'pending'
    });
    
    // ذخیره در localStorage برای بازیابی بعد از بسته شدن مینی‌اپ
    try {
        localStorage.setItem('pendingPurchases', JSON.stringify(App.pendingPurchases));
    } catch (e) {
        console.error('خطا در ذخیره سازی محلی:', e);
    }
}

// ===== توابع مودال‌ها =====

function showSuccessModal() {
    document.getElementById('success-modal').classList.add('active');
    
    // بستن خودکار بعد از 3 ثانیه
    setTimeout(() => {
        closeSuccessModal();
    }, 3000);
}

function closeSuccessModal() {
    document.getElementById('success-modal').classList.remove('active');
}

function showErrorModal(message) {
    document.getElementById('error-message').textContent = message || 'لطفاً دوباره تلاش کن.';
    document.getElementById('error-modal').classList.add('active');
}

function closeErrorModal() {
    document.getElementById('error-modal').classList.remove('active');
}

// ===== توابع اضافی =====

function showSettings() {
    showNotification('تنظیمات به زودی اضافه می‌شود', 'info');
}

function showPurchaseHistory() {
    if (App.pendingPurchases && App.pendingPurchases.length > 0) {
        let history = 'خریدهای در انتظار:\n';
        App.pendingPurchases.forEach(p => {
            history += `- ${p.coins} سکه (${new Date(p.timestamp).toLocaleString('fa-IR')})\n`;
        });
        alert(history);
    } else {
        showNotification('تاریخچه خریدی وجود ندارد', 'info');
    }
}

// ===== خروج =====

function logout() {
    if (confirm('آیا می‌خوای خارج بشی؟')) {
        if (telegram) {
            telegram.close();
        }
    }
}

// ===== نوتیفیکیشن =====

function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = `alert ${type}`;
    
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
    
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutUp 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ===== مقداردهی اولیه (اصلاح شده) =====

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
            
            // ارسال اطلاعات به ربات
            sendToBot('init', {
                userId: user.id,
                username: user.username,
                firstName: user.first_name,
                lastName: user.last_name
            });
        }
        
        // تنظیم رنگ‌های تلگرام
        if (telegram) {
            telegram.expand();
            telegram.setHeaderColor('#0A0A0F');
            telegram.setBackgroundColor('#0A0A0F');
            
            // تنظیم دکمه برگشت
            telegram.BackButton.hide();
            
            // تنظیم رویداد دریافت داده از ربات
            telegram.onEvent('message', handleBotResponse);
        }
        
        // بررسی خریدهای در انتظار از localStorage
        checkPendingPurchases();
        
        hideLoading();
        
        // رندر صفحات
        renderHomePage();
        renderShopPage();
        renderProfilePage();
        
        console.log('✅ برنامه با موفقیت مقداردهی شد');
        
    } catch (error) {
        console.error('خطا در مقداردهی اولیه:', error);
        hideLoading();
        showNotification('خطا در اتصال', 'error');
    }
}

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

function checkPendingPurchases() {
    try {
        const pending = localStorage.getItem('pendingPurchases');
        if (pending) {
            App.pendingPurchases = JSON.parse(pending);
            
            // اگر خرید در انتظار وجود داشت، به ربات اطلاع بده
            if (App.pendingPurchases && App.pendingPurchases.length > 0) {
                App.pendingPurchases.forEach(purchase => {
                    if (purchase.status === 'pending') {
                        sendToBot('check_purchase_status', {
                            timestamp: purchase.timestamp,
                            userId: purchase.userId,
                            itemId: purchase.itemId
                        });
                    }
                });
            }
        }
    } catch (e) {
        console.error('خطا در بررسی خریدهای در انتظار:', e);
    }
}

// ===== رویدادها =====

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

// گوش دادن به پیام‌های iframe برای دریافت پاسخ از ربات
window.addEventListener('message', function(event) {
    // بررسی امنیتی - فقط از همان origin قبول کن
    if (event.data) {
        try {
            const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
            handleBotResponse(data);
        } catch (e) {
            console.log('پیام دریافتی:', event.data);
        }
    }
});

// ===== انیمیشن‌ها =====
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInDown {
        from {
            transform: translateY(-100%);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutUp {
        from {
            transform: translateY(0);
            opacity: 1;
        }
        to {
            transform: translateY(-100%);
            opacity: 0;
        }
    }
    
    .loading-spinner {
        width: 50px;
        height: 50px;
        border: 3px solid var(--bg-tertiary);
        border-top-color: var(--red-primary);
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 20px auto;
    }
    
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    
    .game-status {
        padding: 4px 8px;
        border-radius: var(--border-radius-sm);
        font-size: 12px;
        font-weight: 500;
    }
    
    .game-status.در-انتظار {
        background: var(--warning);
        color: var(--bg-primary);
    }
    
    .game-status.شروع-شده {
        background: var(--success);
        color: var(--bg-primary);
    }
`;
document.head.appendChild(style);
