// --- 1. ข้อมูลเริ่มต้นและ State ของระบบ ---
let menus = [];
let materials = [];
let historyLogs = [];
let cart = [];
let salesChartInstance = null;

let editingMenuId = null;
let editingMaterialId = null;
let currentStockMatId = null;

// ตัวแปรเก็บข้อมูลชั่วคราวก่อนกดยืนยันชำระเงินใน POS
let pendingCheckoutCart = null;

// --- ตัวแปรสำหรับ Pagination State ---
let paginationState = {
    menu: { page: 1 },
    material: { page: 1 },
    histSales: { page: 1 },
    histSys: { page: 1 }
};

// โหลดข้อมูลจาก LocalStorage หรือใช้ค่าเริ่มต้น
function loadData() {
    menus = JSON.parse(localStorage.getItem('coffee_menus')) || [
        { 
            id: 1, 
            name: 'Espresso', 
            category: 'Coffee', 
            price: 50, 
            hasSweetnessLevels: false,
            recipe: [{materialId: 1, stock: 20}] 
        },
        { 
            id: 2, 
            name: 'Latte', 
            category: 'Coffee', 
            price: 65, 
            hasSweetnessLevels: true,
            recipeByLevel: {
                'ไม่หวาน': [{materialId: 1, stock: 20}, {materialId: 2, stock: 150}, {materialId: 3, stock: 0}],
                'หวานน้อย': [{materialId: 1, stock: 20}, {materialId: 2, stock: 150}, {materialId: 3, stock: 10}],
                'หวานปกติ': [{materialId: 1, stock: 20}, {materialId: 2, stock: 150}, {materialId: 3, stock: 20}],
                'หวานมาก': [{materialId: 1, stock: 20}, {materialId: 2, stock: 150}, {materialId: 3, stock: 30}]
            }
        }
    ];
    materials = JSON.parse(localStorage.getItem('coffee_materials')) || [
        { id: 1, category: 'เมล็ดกาแฟ', name: 'เมล็ดกาแฟ', stock: 1000, unit: 'กรัม', minStock: 200, costPerUnit: 0.5 },
        { id: 2, category: 'นม', name: 'นมสด', stock: 5000, unit: 'มล.', minStock: 1000, costPerUnit: 0.05 },
        { id: 3, category: 'ไซรัป', name: 'ไซรัป/น้ำตาล', stock: 2000, unit: 'มล.', minStock: 500, costPerUnit: 0.1 }
    ];
    historyLogs = JSON.parse(localStorage.getItem('coffee_history')) || [];
}

// บันทึกข้อมูลลง LocalStorage
function saveData() {
    localStorage.setItem('coffee_menus', JSON.stringify(menus));
    localStorage.setItem('coffee_materials', JSON.stringify(materials));
    localStorage.setItem('coffee_history', JSON.stringify(historyLogs));
}

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadData();
    checkLoginState();
    injectSweetnessModals(); // ฉีด HTML Modal เลือกระดับความหวานเข้าสู่หน้าเว็บ
});

// --- ฉีดโครงสร้าง HTML สำหรับ Modal เลือกระดับความหวาน (ถ้ายังไม่มี) ---
function injectSweetnessModals() {
    if (document.getElementById('sweetness-modal')) return;

    const modalHTML = `
    <!-- Modal เลือกระดับความหวานตอนเพิ่ม/แก้ไขเมนู -->
    <div id="recipe-sweetness-modal" class="modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:1000; justify-content:center; align-items:center;">
        <div class="modal-content" style="background:var(--bg-card); padding:20px; border-radius:8px; width:90%; max-width:600px; max-height:90vh; overflow-y:auto;">
            <h3>กำหนดสูตรตามระดับความหวาน</h3>
            <p style="font-size:13px; color:var(--text-muted); margin-bottom:15px;">กรอกปริมาณวัตถุดิบแยกตามระดับความหวานแต่ละระดับ</p>
            
            <div id="sweetness-recipe-tabs" style="display:flex; gap:5px; margin-bottom:15px; border-bottom:1px solid var(--border-color); padding-bottom:10px;">
                <button type="button" class="btn-small active" onclick="switchSweetTab('ไม่หวาน', this)">ไม่หวาน</button>
                <button type="button" class="btn-small" onclick="switchSweetTab('หวานน้อย', this)">หวานน้อย</button>
                <button type="button" class="btn-small" onclick="switchSweetTab('หวานปกติ', this)">หวานปกติ</button>
                <button type="button" class="btn-small" onclick="switchSweetTab('หวานมาก', this)">หวานมาก</button>
            </div>

            <div id="sweetness-recipe-containers">
                <div class="sweet-tab-pane" data-level="ไม่หวาน">
                    <div class="recipe-inputs-list" data-level="ไม่หวาน"></div>
                    <button type="button" class="btn-small" onclick="addRecipeRowForLevel('ไม่หวาน')" style="margin-top:10px;">+ เพิ่มวัตถุดิบ (ไม่หวาน)</button>
                </div>
                <div class="sweet-tab-pane" data-level="หวานน้อย" style="display:none;">
                    <div class="recipe-inputs-list" data-level="หวานน้อย"></div>
                    <button type="button" class="btn-small" onclick="addRecipeRowForLevel('หวานน้อย')" style="margin-top:10px;">+ เพิ่มวัตถุดิบ (หวานน้อย)</button>
                </div>
                <div class="sweet-tab-pane" data-level="หวานปกติ" style="display:none;">
                    <div class="recipe-inputs-list" data-level="หวานปกติ"></div>
                    <button type="button" class="btn-small" onclick="addRecipeRowForLevel('หวานปกติ')" style="margin-top:10px;">+ เพิ่มวัตถุดิบ (หวานปกติ)</button>
                </div>
                <div class="sweet-tab-pane" data-level="หวานมาก" style="display:none;">
                    <div class="recipe-inputs-list" data-level="หวานมาก"></div>
                    <button type="button" class="btn-small" onclick="addRecipeRowForLevel('หวานมาก')" style="margin-top:10px;">+ เพิ่มวัตถุดิบ (หวานมาก)</button>
                </div>
            </div>

            <div style="margin-top:20px; text-align:right;">
                <button type="button" class="btn-warning" onclick="closeModal('recipe-sweetness-modal')">เสร็จสิ้น</button>
            </div>
        </div>
    </div>

    <!-- Modal เลือกระดับความหวานตอนกดชำระเงินใน POS -->
    <div id="checkout-sweetness-modal" class="modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:1000; justify-content:center; align-items:center;">
        <div class="modal-content" style="background:var(--bg-card); padding:20px; border-radius:8px; width:90%; max-width:500px; max-height:90vh; overflow-y:auto;">
            <h3>เลือกระดับความหวานสำหรับรายการสินค้า</h3>
            <p style="font-size:13px; color:var(--text-muted); margin-bottom:15px;">โปรดกำหนดระดับความหวานสำหรับเมนูที่มีการควบคุมความหวาน</p>
            
            <div id="checkout-sweetness-list" style="margin-bottom:20px;">
                <!-- จะถูกเติมด้วย Javascript -->
            </div>

            <div style="display:flex; justify-content:flex-end; gap:10px;">
                <button type="button" class="btn-danger" onclick="closeModal('checkout-sweetness-modal')">ยกเลิก</button>
                <button type="button" class="btn-success" onclick="confirmCheckoutWithSweetness()">ยืนยันชำระเงิน</button>
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// --- 2. ระบบ Login / Logout ---
function handleLogin(event) {
    if (event) event.preventDefault();
    const usernameInput = document.getElementById('login-username').value.trim();
    const passwordInput = document.getElementById('login-password').value.trim();
    const errorDiv = document.getElementById('login-error');

    if (usernameInput === 'admin' && passwordInput === '1234') {
        localStorage.setItem('coffee_logged_in', 'true');
        localStorage.setItem('coffee_user', usernameInput);
        document.getElementById('login-screen').style.display = 'none';
        errorDiv.textContent = '';
        initializeAppUI();
    } else {
        errorDiv.textContent = 'ชื่อผู้ใช้ หรือ รหัสผ่านไม่ถูกต้อง';
    }
}

function handleLogout() {
    localStorage.removeItem('coffee_logged_in');
    localStorage.removeItem('coffee_user');
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('login-form').reset();
}

function checkLoginState() {
    const isLoggedIn = localStorage.getItem('coffee_logged_in');
    if (isLoggedIn === 'true') {
        document.getElementById('login-screen').style.display = 'none';
        initializeAppUI();
    } else {
        document.getElementById('login-screen').style.display = 'flex';
    }
}

function initializeAppUI() {
    updateDashboard();
    renderPOSMenu();
    renderMenuTable();
    renderMaterialTable();
    renderSalesHistoryTable();
    renderSystemHistoryTable();
    renderSalesChart();
    checkLowStockAlert();
    updateCategoryDatalists();
}

// --- 3. ระบบธีม (Dark / Light Mode) ---
function initTheme() {
    const savedTheme = localStorage.getItem('coffee_theme') || 'light';
    if (savedTheme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
    updateThemeLabel(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'dark') {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('coffee_theme', 'light');
        updateThemeLabel('light');
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('coffee_theme', 'dark');
        updateThemeLabel('dark');
    }
    renderSalesChart();
}

function updateThemeLabel(theme) {
    const label = document.getElementById('theme-label');
    if (label) {
        label.textContent = theme === 'dark' ? '🌙 โหมดมืด' : '☀️ โหมดสว่าง';
    }
}

// --- 4. การจัดการหน้า Pages ---
function changePage(pageId, btnElement) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    document.querySelectorAll('.sidebar nav button').forEach(btn => btn.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');
    
    if (pageId === 'dashboard') updateDashboard();
    if (pageId === 'pos') renderPOSMenu();
}

// --- 5. ระบบบันทึกประวัติ ---
function addHistoryLog(actionType, itemName, details, type = "system") {
    const logObj = {
        id: Date.now(),
        timestamp: new Date().toLocaleString('th-TH'),
        type: type,
        action: actionType,
        targetName: itemName,
        detail: details,
        user: localStorage.getItem('coffee_user') || 'Admin'
    };
    historyLogs.unshift(logObj);
    saveData();
    renderSalesHistoryTable();
    renderSystemHistoryTable();
}

// --- 6. หน้าภาพรวม (Dashboard) ---
function updateDashboard() {
    const todayStr = new Date().toLocaleDateString('th-TH');
    const todaySalesLogs = historyLogs.filter(log => log.type === 'sales' && log.timestamp.includes(todayStr));
    
    let totalSalesToday = 0;
    todaySalesLogs.forEach(log => {
        if(log.detail) {
            const matchPrice = log.detail.match(/ยอดรวม:\s*([\d.]+)\s*บาท/);
            if(matchPrice) totalSalesToday += parseFloat(matchPrice[1]);
        }
    });

    document.getElementById('dash-sales').innerText = `${totalSalesToday.toLocaleString()} บาท`;
    
    let cupsCount = 0;
    todaySalesLogs.forEach(log => {
        const matches = log.detail.matchAll(/x(\d+)/g);
        for (const match of matches) {
            cupsCount += parseInt(match[1]);
        }
    });
    document.getElementById('dash-cups').innerText = `${cupsCount} แก้ว`;

    let normal = 0, warn = 0, empty = 0;
    let lowStockListHTML = '';

    materials.forEach(m => {
        if (m.stock <= 0) {
            empty++;
            lowStockListHTML += `<li style="color:var(--danger); font-size:13px; margin-bottom:5px;">❌ ${m.name} หมดแล้ว (เหลือ ${m.stock} ${m.unit})</li>`;
        } else if (m.stock <= m.minStock) {
            warn++;
            lowStockListHTML += `<li style="color:var(--warning); font-size:13px; margin-bottom:5px;">⚠️ ${m.name} ใกล้หมด (เหลือ ${m.stock} ${m.unit})</li>`;
        } else {
            normal++;
        }
    });

    document.getElementById('stock-normal').innerText = normal;
    document.getElementById('stock-warn').innerText = warn;
    document.getElementById('stock-empty').innerText = empty;

    const dashLowStockEl = document.getElementById('dash-low-stock');
    if(dashLowStockEl) {
        dashLowStockEl.innerHTML = lowStockListHTML || '<li style="color:var(--success); font-size:13px; list-style:none;">วัตถุดิบทั้งหมดอยู่ในเกณฑ์ปกติ</li>';
    }

    updateTopSellingMenus();
    updateMaterialUsageStats();
    renderSalesChart();
}

function checkLowStockAlert() {
    const hasLowStock = materials.some(m => m.stock <= m.minStock);
    if (hasLowStock) {
        const lowStockModal = document.getElementById('low-stock-modal');
        const lowStockModalList = document.getElementById('low-stock-modal-list');
        if (lowStockModal && lowStockModalList) {
            lowStockModalList.innerHTML = materials
                .filter(m => m.stock <= m.minStock)
                .map(m => `<div style="padding: 5px 0; border-bottom: 1px dashed var(--border-color);">${m.name}: เหลือ ${m.stock} ${m.unit} (ขั้นต่ำ ${m.minStock})</div>`)
                .join('');
            lowStockModal.style.display = 'flex';
        }
    }
}

function updateTopSellingMenus() {
    const listEl = document.getElementById('top-selling-list');
    if (!listEl) return;

    let salesCountMap = {};
    historyLogs.filter(l => l.type === 'sales').forEach(log => {
        if (log.detail) {
            const matches = log.detail.matchAll(/\[(.*?)\]/g);
            for (const match of matches) {
                const items = match[1].split(',');
                items.forEach(item => {
                    const parts = item.trim().split(' x');
                    if (parts.length === 2) {
                        const name = parts[0].split('(')[0].trim();
                        const qty = parseInt(parts[1]) || 1;
                        salesCountMap[name] = (salesCountMap[name] || 0) + qty;
                    }
                });
            }
        }
    });

    const sortedMenus = Object.entries(salesCountMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

    if (sortedMenus.length === 0) {
        listEl.innerHTML = '<li style="color: var(--text-muted); font-size: 13px;">ยังไม่มีข้อมูลการขาย</li>';
        return;
    }

    listEl.innerHTML = sortedMenus.map(([name, qty], index) => `
        <li style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--border-color); font-size: 13px;">
            <span>${index + 1}. ${name}</span>
            <strong>${qty} แก้ว</strong>
        </li>
    `).join('');
}

function updateMaterialUsageStats() {
    const usageTodayEl = document.getElementById('usage-today-list');
    const usage7DaysEl = document.getElementById('usage-7days-list');
    const usage30DaysEl = document.getElementById('usage-30days-list');
    if (!usageTodayEl || !usage7DaysEl || !usage30DaysEl) return;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOf7Days = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)).getTime();
    const startOf30Days = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)).getTime();

    let usageTodayMap = {};
    let usage7DaysMap = {};
    let usage30DaysMap = {};

    historyLogs.filter(log => log.type === 'sales').forEach(log => {
        let logTime = parseLocalDateString(log.timestamp);
        if (!logTime) return;

        if (log.detail) {
            const matches = log.detail.matchAll(/\[(.*?)\]/g);
            for (const match of matches) {
                const items = match[1].split(',');
                items.forEach(item => {
                    const parts = item.trim().split(' x');
                    if (parts.length === 2) {
                        const rawName = parts[0].trim();
                        const qtySold = parseInt(parts[1]) || 1;

                        let menuName = rawName;
                        let sweetLevel = 'หวานปกติ';
                        const matchSweet = rawName.match(/(.*?)\s*\((.*?)\)$/);
                        if (matchSweet) {
                            menuName = matchSweet[1].trim();
                            sweetLevel = matchSweet[2].trim();
                        }

                        const menu = menus.find(m => m.name === menuName);
                        if (menu) {
                            let activeRecipe = [];
                            if (menu.hasSweetnessLevels && menu.recipeByLevel && menu.recipeByLevel[sweetLevel]) {
                                activeRecipe = menu.recipeByLevel[sweetLevel];
                            } else if (menu.recipe) {
                                activeRecipe = menu.recipe;
                            }

                            activeRecipe.forEach(rec => {
                                const mat = materials.find(m => m.id === parseInt(rec.materialId));
                                if (mat) {
                                    const totalUsed = rec.stock * qtySold;
                                    if (logTime >= startOf30Days) {
                                        usage30DaysMap[mat.name] = (usage30DaysMap[mat.name] || 0) + totalUsed;
                                    }
                                    if (logTime >= startOf7Days) {
                                        usage7DaysMap[mat.name] = (usage7DaysMap[mat.name] || 0) + totalUsed;
                                    }
                                    if (logTime >= startOfToday) {
                                        usageTodayMap[mat.name] = (usageTodayMap[mat.name] || 0) + totalUsed;
                                    }
                                }
                            });
                        }
                    }
                });
            }
        }
    });

    function renderUsageList(mapObj) {
        const entries = Object.entries(mapObj);
        if (entries.length === 0) return '<li style="color: var(--text-muted); font-size: 13px; list-style:none;">ไม่มีข้อมูลการใช้</li>';
        return entries.map(([matName, totalAmt]) => {
            const mat = materials.find(m => m.name === matName);
            const unitStr = mat ? mat.unit : '';
            return `<li style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed var(--border-color); font-size: 13px;">
                <span>${matName}</span>
                <strong>${parseFloat(totalAmt.toFixed(2))} ${unitStr}</strong>
            </li>`;
        }).join('');
    }

    usageTodayEl.innerHTML = renderUsageList(usageTodayMap);
    usage7DaysEl.innerHTML = renderUsageList(usage7DaysMap);
    usage30DaysEl.innerHTML = renderUsageList(usage30DaysMap);
}

function parseLocalDateString(dateStr) {
    try {
        const parts = dateStr.split(', ');
        const dateParts = parts[0].split('/');
        if (dateParts.length === 3) {
            const day = parseInt(dateParts[0]);
            const month = parseInt(dateParts[1]) - 1;
            const year = parseInt(dateParts[2]);
            const timeParts = parts[1] ? parts[1].split(':') : [0,0,0];
            return new Date(year, month, day, parseInt(timeParts[0]), parseInt(timeParts[1]), parseInt(timeParts[2])).getTime();
        }
    } catch(e) {
        return null;
    }
    return null;
}

// --- 7. หน้า POS ---
function renderPOSMenu() {
    const container = document.getElementById('pos-menu-container');
    if (!container) return;
    if (menus.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted); text-align:center;">ยังไม่มีเมนูในระบบ กรุณาเพิ่มเมนูก่อน</p>';
        return;
    }
    
    let categories = {};
    menus.forEach(m => {
        let cat = m.category || 'ทั่วไป';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(m);
    });

    let html = '';
    for (let cat in categories) {
        html += `
            <div class="category-section">
                <div class="category-header">${cat}</div>
                <div class="pos-grid">
                    ${categories[cat].map(m => `
                        <div class="menu-item" onclick="addToCart(${m.id})">
                            <h4>${m.name}</h4>
                            <p>${m.price} บาท</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    container.innerHTML = html;
}

function addToCart(menuId) {
    const menu = menus.find(m => m.id === menuId);
    if (!menu) return;

    const defaultSweet = menu.hasSweetnessLevels ? 'หวานปกติ' : null;

    const existing = cart.find(item => item.id === menuId && item.sweetness === defaultSweet);
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({ 
            id: menu.id, 
            name: menu.name, 
            price: menu.price, 
            qty: 1, 
            hasSweetnessLevels: menu.hasSweetnessLevels,
            sweetness: defaultSweet 
        });
    }
    renderCart();
}

function renderCart() {
    const container = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total-price');
    if (!container) return;
    
    if (cart.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--text-muted); margin-top:20px;">ยังไม่ได้เลือกเมนู</p>';
        totalEl.innerText = '0';
        return;
    }
    let total = 0;
    container.innerHTML = cart.map((item, index) => {
        total += item.price * item.qty;
        return `
        <div class="cart-item" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom:1px solid var(--border-color); padding-bottom:6px;">
            <div class="cart-item-info">
                <strong>${item.name}</strong><br>
                <small>${item.price} ฿ x ${item.qty}</small>
                ${item.hasSweetnessLevels ? `
                    <div style="margin-top:2px;">
                        <select onchange="updateCartSweetness(${index}, this.value)" style="font-size:11px; padding:2px;">
                            <option value="ไม่หวาน" ${item.sweetness === 'ไม่หวาน' ? 'selected' : ''}>ไม่หวาน</option>
                            <option value="หวานน้อย" ${item.sweetness === 'หวานน้อย' ? 'selected' : ''}>หวานน้อย</option>
                            <option value="หวานปกติ" ${item.sweetness === 'หวานปกติ' ? 'selected' : ''}>หวานปกติ</option>
                            <option value="หวานมาก" ${item.sweetness === 'หวานมาก' ? 'selected' : ''}>หวานมาก</option>
                        </select>
                    </div>
                ` : ''}
            </div>
            <div class="cart-item-actions" style="display:flex; align-items:center; gap:4px;">
                <button class="qty-btn" onclick="updateCartQty(${index}, -1)">-</button>
                <span>${item.qty}</span>
                <button class="qty-btn" onclick="updateCartQty(${index}, 1)">+</button>
                <button onclick="removeFromCart(${index})" class="btn-danger btn-small" style="padding:2px 6px;">X</button>
            </div>
        </div>`;
    }).join('');
    totalEl.innerText = total.toLocaleString();
}

function updateCartQty(index, change) {
    cart[index].qty += change;
    if (cart[index].qty <= 0) {
        cart.splice(index, 1);
    }
    renderCart();
}

function updateCartSweetness(index, val) {
    cart[index].sweetness = val;
}

function removeFromCart(index) {
    cart.splice(index, 1);
    renderCart();
}

function checkoutDailySales() {
    if (cart.length === 0) {
        Swal.fire('แจ้งเตือน', 'กรุณาเลือกรายการสินค้า', 'warning');
        return;
    }

    pendingCheckoutCart = JSON.parse(JSON.stringify(cart));
    
    const sweetnessListContainer = document.getElementById('checkout-sweetness-list');
    let htmlContent = '';

    pendingCheckoutCart.forEach((item, idx) => {
        if (item.hasSweetnessLevels) {
            htmlContent += `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; padding-bottom:8px; border-bottom:1px dashed var(--border-color);">
                    <span><strong>${item.name}</strong> (x${item.qty})</span>
                    <select id="checkout-sweet-${idx}" style="padding:5px; border-radius:4px; border:1px solid var(--border-color);">
                        <option value="ไม่หวาน" ${item.sweetness === 'ไม่หวาน' ? 'selected' : ''}>ไม่หวาน</option>
                        <option value="หวานน้อย" ${item.sweetness === 'หวานน้อย' ? 'selected' : ''}>หวานน้อย</option>
                        <option value="หวานปกติ" ${item.sweetness === 'หวานปกติ' ? 'selected' : ''}>หวานปกติ</option>
                        <option value="หวานมาก" ${item.sweetness === 'หวานมาก' ? 'selected' : ''}>หวานมาก</option>
                    </select>
                </div>
            `;
        } else {
            htmlContent += `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; padding-bottom:8px; border-bottom:1px dashed var(--border-color);">
                    <span><strong>${item.name}</strong> (x${item.qty})</span>
                    <span style="font-size:12px; color:var(--text-muted);">สูตรปกติ (ไม่ปรับความหวาน)</span>
                </div>
            `;
        }
    });

    sweetnessListContainer.innerHTML = htmlContent;
    document.getElementById('checkout-sweetness-modal').style.display = 'flex';
}

function confirmCheckoutWithSweetness() {
    pendingCheckoutCart.forEach((item, idx) => {
        if (item.hasSweetnessLevels) {
            const selectEl = document.getElementById(`checkout-sweet-${idx}`);
            if (selectEl) {
                item.sweetness = selectEl.value;
            }
        }
    });

    for (let cartItem of pendingCheckoutCart) {
        const menu = menus.find(m => m.id === cartItem.id);
        if (menu) {
            let activeRecipe = [];
            if (menu.hasSweetnessLevels && menu.recipeByLevel && menu.recipeByLevel[cartItem.sweetness]) {
                activeRecipe = menu.recipeByLevel[cartItem.sweetness];
            } else if (menu.recipe) {
                activeRecipe = menu.recipe;
            }

            for (let rec of activeRecipe) {
                const mat = materials.find(m => m.id === parseInt(rec.materialId));
                if (mat && mat.stock < (rec.stock * cartItem.qty)) {
                    Swal.fire('วัตถุดิบไม่พอ', `วัตถุดิบ "${mat.name}" คงเหลือไม่เพียงพอสำหรับทำ ${menu.name} (${cartItem.sweetness})`, 'error');
                    return;
                }
            }
        }
    }

    pendingCheckoutCart.forEach(cartItem => {
        const menu = menus.find(m => m.id === cartItem.id);
        if (menu) {
            let activeRecipe = [];
            if (menu.hasSweetnessLevels && menu.recipeByLevel && menu.recipeByLevel[cartItem.sweetness]) {
                activeRecipe = menu.recipeByLevel[cartItem.sweetness];
            } else if (menu.recipe) {
                activeRecipe = menu.recipe;
            }

            activeRecipe.forEach(rec => {
                const mat = materials.find(m => m.id === parseInt(rec.materialId));
                if (mat) {
                    mat.stock -= (rec.stock * cartItem.qty);
                }
            });
        }
    });

    const total = pendingCheckoutCart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const summaryStr = pendingCheckoutCart.map(i => i.hasSweetnessLevels ? `${i.name}(${i.sweetness}) x${i.qty}` : `${i.name} x${i.qty}`).join(', ');

    addHistoryLog('ขายสินค้า', 'สรุปยอดขายประจำวัน', `รายการ: [${summaryStr}] | ยอดรวม: ${total} บาท`, 'sales');
    
    saveData();
    cart = [];
    renderCart();
    updateDashboard();
    renderMaterialTable();
    checkLowStockAlert();
    closeModal('checkout-sweetness-modal');
    
    Swal.fire('สำเร็จ', 'บันทึกยอดขายและตัดสต็อกเรียบร้อยแล้ว', 'success');
}

// --- 8. หน้าจัดการเมนู (เพิ่ม / แก้ไข / ลบ) ---
function updateCategoryDatalists() {
    const matCategories = [...new Set(materials.map(m => m.category).filter(Boolean))];
    const menuCategories = [...new Set(menus.map(m => m.category).filter(Boolean))];

    const matListEl = document.getElementById('material-categories-list');
    if (matListEl) {
        matListEl.innerHTML = matCategories.map(cat => `<option value="${cat}">`).join('');
    }

    const menuListEl = document.getElementById('menu-categories-list');
    if (menuListEl) {
        menuListEl.innerHTML = menuCategories.map(cat => `<option value="${cat}">`).join('');
    }
}

let tempRecipeByLevel = {
    'ไม่หวาน': [],
    'หวานน้อย': [],
    'หวานปกติ': [],
    'หวานมาก': []
};
let tempHasSweetness = false;

window.openMenuModal = function(id = null) {
    updateCategoryDatalists();
    document.getElementById('menu-form').reset();
    
    tempRecipeByLevel = {
        'ไม่หวาน': [],
        'หวานน้อย': [],
        'หวานปกติ': [],
        'หวานมาก': []
    };
    tempHasSweetness = false;
    const checkboxSweet = document.getElementById('menu-has-sweetness');
    if (checkboxSweet) checkboxSweet.checked = false;
    toggleSweetnessSection(false);

    const titleEl = document.getElementById('menu-modal-title');
    if (id) {
        editingMenuId = id;
        titleEl.textContent = 'แก้ไขเมนู';
        const menu = menus.find(m => m.id === id);
        if (menu) {
            document.getElementById('menu-category').value = menu.category || '';
            document.getElementById('menu-name').value = menu.name || '';
            document.getElementById('menu-price').value = menu.price || '';
            
            if (menu.hasSweetnessLevels) {
                tempHasSweetness = true;
                if (checkboxSweet) checkboxSweet.checked = true;
                toggleSweetnessSection(true);
                tempRecipeByLevel = JSON.parse(JSON.stringify(menu.recipeByLevel || tempRecipeByLevel));
            } else {
                if (menu.recipe) {
                    tempRecipeByLevel['หวานปกติ'] = JSON.parse(JSON.stringify(menu.recipe));
                }
            }
            renderAllLevelRecipeRows();
        }
    } else {
        editingMenuId = null;
        titleEl.textContent = 'เพิ่มเมนูใหม่';
        renderAllLevelRecipeRows();
    }
    document.getElementById('menu-modal').style.display = 'flex';
};

function toggleSweetnessSection(enabled) {
    tempHasSweetness = enabled;
    const btnOpenSweetModal = document.getElementById('btn-open-sweet-modal');
    if (btnOpenSweetModal) {
        btnOpenSweetModal.style.display = enabled ? 'inline-block' : 'none';
    }
}

function openRecipeSweetnessModal() {
    document.getElementById('recipe-sweetness-modal').style.display = 'flex';
    renderAllLevelRecipeRows();
}

function switchSweetTab(levelName, btnEl) {
    document.querySelectorAll('#sweetness-recipe-tabs button').forEach(b => b.classList.remove('active'));
    btnEl.classList.add('active');

    document.querySelectorAll('.sweet-tab-pane').forEach(pane => {
        if (pane.getAttribute('data-level') === levelName) {
            pane.style.display = 'block';
        } else {
            pane.style.display = 'none';
        }
    });
}

function renderAllLevelRecipeRows() {
    ['ไม่หวาน', 'หวานน้อย', 'หวานปกติ', 'หวานมาก'].forEach(level => {
        const container = document.querySelector(`.recipe-inputs-list[data-level="${level}"]`);
        if (!container) return;
        container.innerHTML = '';
        
        if (tempRecipeByLevel[level] && tempRecipeByLevel[level].length > 0) {
            tempRecipeByLevel[level].forEach(rec => {
                appendRecipeRowDOM(container, level, rec.materialId, rec.stock);
            });
        }
    });
}

function addRecipeRowForLevel(level) {
    const container = document.querySelector(`.recipe-inputs-list[data-level="${level}"]`);
    if (container) {
        appendRecipeRowDOM(container, level, '', '');
    }
}

function appendRecipeRowDOM(container, level, materialId = '', stock = '') {
    const rowId = 'recipe-' + level + '-' + Date.now() + Math.random().toString(36).substring(2, 5);
    const materialOptions = materials.map(m => `<option value="${m.name}" data-id="${m.id}">${m.unit ? '(' + m.unit + ')' : ''}</option>`).join('');
    
    let currentMatName = '';
    if (materialId) {
        const found = materials.find(m => m.id == materialId);
        if (found) currentMatName = found.name;
    }

    const div = document.createElement('div');
    div.className = 'recipe-row-item';
    div.style.cssText = 'display: flex; gap: 10px; margin-bottom: 8px; align-items: center;';
    div.id = rowId;
    
    div.innerHTML = `
        <div style="flex: 2; position: relative;">
            <input type="text" class="recipe-mat-search" placeholder="พิมพ์ค้นหาวัตถุดิบ..." list="datalist-${rowId}" value="${currentMatName}" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 6px;" autocomplete="off" required>
            <datalist id="datalist-${rowId}">
                ${materialOptions}
            </datalist>
            <input type="hidden" class="recipe-mat-id" value="${materialId}">
        </div>
        <div style="flex: 1;">
            <input type="number" class="recipe-qty" placeholder="ปริมาณ" value="${stock}" step="0.01" min="0.01" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 6px;" required>
        </div>
        <button type="button" class="btn-danger btn-small" onclick="document.getElementById('${rowId}').remove()" style="padding: 8px 12px; cursor: pointer;">✕</button>
    `;
    
    container.appendChild(div);

    const searchInput = div.querySelector('.recipe-mat-search');
    const hiddenIdInput = div.querySelector('.recipe-mat-id');
    
    searchInput.addEventListener('input', function() {
        const val = this.value;
        const matchedMat = materials.find(m => m.name === val);
        if (matchedMat) {
            hiddenIdInput.value = matchedMat.id;
        } else {
            hiddenIdInput.value = '';
        }
    });
}

function collectRecipeFromDOM() {
    let result = {
        'ไม่หวาน': [],
        'หวานน้อย': [],
        'หวานปกติ': [],
        'หวานมาก': []
    };

    ['ไม่หวาน', 'หวานน้อย', 'หวานปกติ', 'หวานมาก'].forEach(level => {
        const container = document.querySelector(`.recipe-inputs-list[data-level="${level}"]`);
        if (container) {
            const rows = container.querySelectorAll('.recipe-row-item');
            rows.forEach(row => {
                const matId = row.querySelector('.recipe-mat-id').value;
                const stockVal = row.querySelector('.recipe-qty').value;
                if (matId && stockVal) {
                    result[level].push({ materialId: parseInt(matId), stock: parseFloat(stockVal) });
                }
            });
        }
    });
    return result;
}

function renderMenuTable() {
    const tbody = document.getElementById('menu-table-body');
    if (!tbody) return;
    const searchVal = (document.getElementById('menu-search')?.value || '').toLowerCase();
    const limit = parseInt(document.getElementById('menu-limit')?.value || 20);
    
    const filtered = menus.filter(m => 
        m.name.toLowerCase().includes(searchVal) || 
        (m.category && m.category.toLowerCase().includes(searchVal))
    );

    const totalData = filtered.length;
    const totalPages = Math.ceil(totalData / limit) || 1;
    if (paginationState.menu.page > totalPages) paginationState.menu.page = totalPages;
    
    const start = (paginationState.menu.page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    tbody.innerHTML = paginated.length === 0 ? `<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">ไม่พบข้อมูลเมนู</td></tr>` : 
        paginated.map(m => {
            let recipeStr = '';
            if (m.hasSweetnessLevels) {
                recipeStr = '<em>แยกตามระดับความหวาน</em>';
            } else if (m.recipe) {
                recipeStr = m.recipe.map(r => {
                    const mat = materials.find(mat => mat.id == r.materialId);
                    return mat ? `${mat.name} (${r.stock} ${mat.unit})` : '';
                }).filter(Boolean).join(', ');
            }

            return `
                <tr>
                    <td><span class="cat-tag">${m.category || 'ทั่วไป'}</span></td>
                    <td><strong>${m.name}</strong> ${m.hasSweetnessLevels ? '<span style="font-size:10px; background:var(--primary); color:#fff; padding:2px 4px; border-radius:4px;">ปรับความหวานได้</span>' : ''}</td>
                    <td>${m.price} บาท</td>
                    <td style="font-size: 12px; color: var(--text-muted);">${recipeStr || 'ไม่มีสูตร'}</td>
                    <td>
                        <button onclick="openMenuModal(${m.id})" class="btn-warning btn-small" style="margin-right:5px;">แก้ไข</button>
                        <button onclick="deleteMenu(${m.id})" class="btn-danger btn-small">ลบ</button>
                    </td>
                </tr>
            `;
        }).join('');

    updatePaginationUI('menu', totalData, limit, totalPages);
}

function saveMenu(event) {
    event.preventDefault();
    const category = document.getElementById('menu-category').value.trim();
    const name = document.getElementById('menu-name').value.trim();
    const price = parseFloat(document.getElementById('menu-price').value);
    const hasSweetness = document.getElementById('menu-has-sweetness').checked;

    let recipeByLevel = collectRecipeFromDOM();
    let standardRecipe = recipeByLevel['หวานปกติ'] || [];

    if (editingMenuId) {
        const menu = menus.find(m => m.id === editingMenuId);
        if (menu) {
            menu.category = category;
            menu.name = name;
            menu.price = price;
            menu.hasSweetnessLevels = hasSweetness;
            if (hasSweetness) {
                menu.recipeByLevel = recipeByLevel;
                delete menu.recipe;
            } else {
                menu.recipe = standardRecipe;
                delete menu.recipeByLevel;
            }
            addHistoryLog('จัดการระบบ', 'แก้ไขเมนู', `แก้ไขเมนู: ${name} (${price} บาท)`);
            Swal.fire('สำเร็จ', 'แก้ไขเมนูเรียบร้อย', 'success');
        }
    } else {
        const newMenu = {
            id: Date.now(),
            category,
            name,
            price,
            hasSweetnessLevels: hasSweetness,
            ...(hasSweetness ? { recipeByLevel } : { recipe: standardRecipe })
        };
        menus.push(newMenu);
        addHistoryLog('จัดการระบบ', 'เพิ่มเมนู', `เพิ่มเมนูใหม่: ${name} (${price} บาท)`);
        Swal.fire('สำเร็จ', 'บันทึกเมนูใหม่เรียบร้อย', 'success');
    }

    saveData();
    renderMenuTable();
    renderPOSMenu();
    closeModal('menu-modal');
}

function deleteMenu(id) {
    Swal.fire({
        title: 'ยืนยันการลบเมนู?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'ลบ',
        cancelButtonText: 'ยกเลิก'
    }).then(res => {
        if(res.isConfirmed) {
            menus = menus.filter(m => m.id !== id);
            saveData();
            renderMenuTable();
            renderPOSMenu();
            addHistoryLog('จัดการระบบ', 'ลบเมนู', `ลบเมนู ID: ${id}`);
            Swal.fire('สำเร็จ', 'ลบเมนูเรียบร้อย', 'success');
        }
    });
}

// --- 9. หน้าจัดการวัตถุดิบ ---
window.openMaterialModal = function(id = null) {
    updateCategoryDatalists();
    document.getElementById('material-form').reset();
    const titleEl = document.getElementById('mat-modal-title');
    const stockGroup = document.getElementById('mat-stock-group');

    if (id) {
        editingMaterialId = id;
        titleEl.textContent = 'แก้ไขวัตถุดิบ';
        if(stockGroup) stockGroup.style.display = 'none';
        
        const mat = materials.find(m => m.id === id);
        if (mat) {
            document.getElementById('mat-category').value = mat.category || '';
            document.getElementById('mat-name').value = mat.name || '';
            document.getElementById('mat-unit').value = mat.unit || '';
            document.getElementById('mat-cost-per-unit').value = mat.costPerUnit || 0;
            document.getElementById('mat-min').value = mat.minStock || 0;
        }
    } else {
        editingMaterialId = null;
        titleEl.textContent = 'เพิ่มวัตถุดิบใหม่';
        if(stockGroup) stockGroup.style.display = 'block';
    }
    document.getElementById('material-modal').style.display = 'flex';
};

function renderMaterialTable() {
    const tbody = document.getElementById('material-table-body');
    if (!tbody) return;
    const searchVal = (document.getElementById('material-search')?.value || '').toLowerCase();
    const limit = parseInt(document.getElementById('material-limit')?.value || 20);

    const filtered = materials.filter(m => 
        m.name.toLowerCase().includes(searchVal) || 
        (m.category && m.category.toLowerCase().includes(searchVal))
    );

    const totalData = filtered.length;
    const totalPages = Math.ceil(totalData / limit) || 1;
    if (paginationState.material.page > totalPages) paginationState.material.page = totalPages;

    const start = (paginationState.material.page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    tbody.innerHTML = paginated.length === 0 ? `<tr><td colspan="8" style="text-align:center; color:var(--text-muted);">ไม่พบข้อมูลวัตถุดิบ</td></tr>` : 
        paginated.map(m => {
            let badgeColor = 'var(--success)';
            if (m.stock <= 0) badgeColor = 'var(--danger)';
            else if (m.stock <= m.minStock) badgeColor = 'var(--warning)';

            const costPerUnit = parseFloat(m.costPerUnit || 0);
            const totalCost = (m.stock * costPerUnit).toFixed(2);

            return `
            <tr>
                <td><span class="cat-tag">${m.category || 'ทั่วไป'}</span></td>
                <td><strong>${m.name}</strong></td>
                <td><strong style="color:${badgeColor}">${m.stock}</strong></td>
                <td>${m.unit}</td>
                <td>${m.minStock}</td>
                <td>${costPerUnit.toFixed(2)} ฿</td>
                <td><strong>${totalCost} ฿</strong></td>
                <td>
                    <button onclick="openStockModal(${m.id})" class="btn-warning btn-small" style="margin-right:3px;">ปรับสต็อก</button>
                    <button onclick="openMaterialModal(${m.id})" class="btn-warning btn-small" style="margin-right:3px; background:#29B6F6; color:#fff;">แก้ไข</button>
                    <button onclick="deleteMaterial(${m.id})" class="btn-danger btn-small">ลบ</button>
                </td>
            </tr>`;
        }).join('');

    updatePaginationUI('material', totalData, limit, totalPages);
}

function saveMaterial(event) {
    event.preventDefault();
    const category = document.getElementById('mat-category').value.trim();
    const name = document.getElementById('mat-name').value.trim();
    const unit = document.getElementById('mat-unit').value.trim();
    const min = parseFloat(document.getElementById('mat-min').value);
    const cost = parseFloat(document.getElementById('mat-cost-per-unit').value) || 0;

    if (editingMaterialId) {
        const mat = materials.find(m => m.id === editingMaterialId);
        if (mat) {
            mat.category = category;
            mat.name = name;
            mat.unit = unit;
            mat.minStock = min;
            mat.costPerUnit = cost;
            addHistoryLog('จัดการระบบ', 'แก้ไขวัตถุดิบ', `แก้ไขวัตถุดิบ: ${name}`);
            Swal.fire('สำเร็จ', 'แก้ไขวัตถุดิบเรียบร้อย', 'success');
        }
    } else {
        const stock = parseFloat(document.getElementById('mat-stock').value) || 0;
        const newMat = {
            id: Date.now(),
            category,
            name,
            unit,
            stock: stock,
            minStock: min,
            costPerUnit: cost
        };
        materials.push(newMat);
        addHistoryLog('จัดการระบบ', 'เพิ่มวัตถุดิบ', `เพิ่มวัตถุดิบ: ${name} จำนวน ${stock} ${unit}`);
        Swal.fire('สำเร็จ', 'บันทึกวัตถุดิบเรียบร้อย', 'success');
    }

    saveData();
    renderMaterialTable();
    closeModal('material-modal');
}

function openStockModal(id) {
    const mat = materials.find(m => m.id === id);
    if (!mat) return;
    currentStockMatId = id;
    document.getElementById('adj-mat-name').innerText = mat.name;
    document.getElementById('stock-form').reset();
    document.getElementById('stock-modal').style.display = 'flex';
}

function saveStockAdjustment(event) {
    event.preventDefault();
    const type = parseInt(document.getElementById('adj-type').value);
    const amount = parseFloat(document.getElementById('adj-amount').value);
    
    const mat = materials.find(m => m.id === currentStockMatId);
    if (mat) {
        mat.stock += (type * amount);
        if (mat.stock < 0) mat.stock = 0;
        saveData();
        renderMaterialTable();
        updateDashboard();
        closeModal('stock-modal');
        checkLowStockAlert();
        addHistoryLog('จัดการระบบ', 'ปรับปรุงสต็อก', `ปรับสต็อก ${mat.name} (${type === 1 ? '+' : '-'}${amount} ${mat.unit})`);
        Swal.fire('สำเร็จ', 'ปรับปรุงสต็อกเรียบร้อย', 'success');
    }
}

function deleteMaterial(id) {
    Swal.fire({
        title: 'ยืนยันการลบวัตถุดิบ?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'ลบ',
        cancelButtonText: 'ยกเลิก'
    }).then(res => {
        if(res.isConfirmed) {
            materials = materials.filter(m => m.id !== id);
            saveData();
            renderMaterialTable();
            renderPOSMenu();
            addHistoryLog('จัดการระบบ', 'ลบวัตถุดิบ', `ลบวัตถุดิบ ID: ${id}`);
            Swal.fire('สำเร็จ', 'ลบวัตถุดิบเรียบร้อย', 'success');
        }
    });
}

// --- 10. หน้าประวัติ (History) ---
function showHistoryTab(tabName, btn) {
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.tabs .tab-btn').forEach(el => el.classList.remove('active'));
    
    if (tabName === 'sales') {
        document.getElementById('hist-sales').style.display = 'block';
    } else {
        document.getElementById('hist-system').style.display = 'block';
    }
    btn.classList.add('active');
}

function renderSalesHistoryTable() {
    const tbody = document.getElementById('hist-sales-body');
    if(!tbody) return;
    const searchVal = (document.getElementById('hist-sales-search')?.value || '').toLowerCase();
    const limit = parseInt(document.getElementById('hist-sales-limit')?.value || 20);

    const filtered = historyLogs.filter(log => log.type === 'sales' && 
        (log.timestamp.toLowerCase().includes(searchVal) || (log.detail && log.detail.toLowerCase().includes(searchVal)))
    );

    const totalData = filtered.length;
    const totalPages = Math.ceil(totalData / limit) || 1;
    if (paginationState.histSales.page > totalPages) paginationState.histSales.page = totalPages;

    const start = (paginationState.histSales.page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    tbody.innerHTML = paginated.length === 0 ? `<tr><td colspan="2" style="text-align:center; color:var(--text-muted);">ไม่มีประวัติการขาย</td></tr>` :
        paginated.map(log => `
            <tr>
                <td style="white-space: nowrap;">${log.timestamp}</td>
                <td>${log.detail}</td>
            </tr>
        `).join('');

    updatePaginationUI('histSales', totalData, limit, totalPages);
}

function renderSystemHistoryTable() {
    const tbody = document.getElementById('hist-system-body');
    if(!tbody) return;
    const searchVal = (document.getElementById('hist-sys-search')?.value || '').toLowerCase();
    const limit = parseInt(document.getElementById('hist-sys-limit')?.value || 20);

    const filtered = historyLogs.filter(log => log.type !== 'sales' && 
        (log.timestamp.toLowerCase().includes(searchVal) || log.action.toLowerCase().includes(searchVal) || (log.detail && log.detail.toLowerCase().includes(searchVal)))
    );

    const totalData = filtered.length;
    const totalPages = Math.ceil(totalData / limit) || 1;
    if (paginationState.histSys.page > totalPages) paginationState.histSys.page = totalPages;

    const start = (paginationState.histSys.page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    tbody.innerHTML = paginated.length === 0 ? `<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">ไม่มีประวัติระบบ</td></tr>` :
        paginated.map(log => `
            <tr>
                <td>${log.timestamp}</td>
                <td><strong>${log.action}</strong></td>
                <td><span style="padding: 2px 6px; border-radius: 4px; font-size: 11px; background: var(--bg-main);">${log.type}</span></td>
                <td>${log.detail || '-'}</td>
            </tr>
        `).join('');

    updatePaginationUI('histSys', totalData, limit, totalPages);
}

function updatePaginationUI(type, totalData, limit, totalPages) {
    const infoEl = document.getElementById(`${type === 'histSys' ? 'hist-sys' : type}-page-info`);
    const btnContainer = document.getElementById(`${type === 'histSys' ? 'hist-sys' : type}-pagination`);
    if (!infoEl || !btnContainer) return;

    const currentPage = paginationState[type].page;
    const startItem = totalData === 0 ? 0 : (currentPage - 1) * limit + 1;
    const endItem = Math.min(currentPage * limit, totalData);

    infoEl.innerText = `แสดง ${startItem} ถึง ${endItem} จาก ${totalData} รายการ`;

    let buttonsHTML = '';
    buttonsHTML += `<button onclick="changeTablePage('${type}', 1)" ${currentPage === 1 ? 'disabled' : ''}>« หน้าแรก</button>`;
    buttonsHTML += `<button onclick="changeTablePage('${type}', ${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>‹ ก่อนหน้า</button>`;
    
    let startPage = Math.max(1, currentPage - 1);
    let endPage = Math.min(totalPages, startPage + 2);
    for (let i = startPage; i <= endPage; i++) {
        buttonsHTML += `<button onclick="changeTablePage('${type}', ${i})" class="${i === currentPage ? 'active' : ''}">${i}</button>`;
    }

    buttonsHTML += `<button onclick="changeTablePage('${type}', ${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>ถัดไป ›</button>`;
    buttonsHTML += `<button onclick="changeTablePage('${type}', ${totalPages})" ${currentPage === totalPages ? 'disabled' : ''}>หน้าสุดท้าย »</button>`;

    btnContainer.innerHTML = buttonsHTML;
}

function changeTablePage(type, targetPage) {
    paginationState[type].page = targetPage;
    if (type === 'menu') renderMenuTable();
    else if (type === 'material') renderMaterialTable();
    else if (type === 'histSales') renderSalesHistoryTable();
    else if (type === 'histSys') renderSystemHistoryTable();
}

// --- 11. กราฟยอดขาย ---
function renderSalesChart() {
    const canvas = document.getElementById('salesChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let labels = [];
    let dataValues = [];

    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
        labels.push(dateStr);

        const targetDateStr = d.toLocaleDateString('th-TH');
        const dayLogs = historyLogs.filter(l => l.type === 'sales' && l.timestamp.includes(targetDateStr));
        
        let sum = 0;
        dayLogs.forEach(log => {
            const matchPrice = log.detail.match(/ยอดรวม:\s*([\d.]+)\s*บาท/);
            if(matchPrice) sum += parseFloat(matchPrice[1]);
        });
        dataValues.push(sum);
    }

    if (salesChartInstance) {
        salesChartInstance.destroy();
    }

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#EFEBE9' : '#3E2723';

    salesChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'ยอดขาย (บาท)',
                data: dataValues,
                borderColor: '#E91E63',
                backgroundColor: isDark ? 'rgba(233, 30, 99, 0.2)' : 'rgba(233, 30, 99, 0.1)',
                borderWidth: 2,
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: textColor } }
            },
            scales: {
                x: { ticks: { color: textColor }, grid: { color: isDark ? '#3E2723' : '#EFEBE9' } },
                y: { ticks: { color: textColor }, grid: { color: isDark ? '#3E2723' : '#EFEBE9' }, beginAtZero: true }
            }
        }
    });
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function resetData() {
    Swal.fire({
        title: 'ยืนยันการล้างข้อมูล?',
        text: "ข้อมูลทั้งหมดจะถูกลบและรีเซ็ตเป็นค่าเริ่มต้น!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'ล้างข้อมูล'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.clear();
            location.reload();
        }
    });
}

function exportDataBackup() {
    try {
        const backupData = {
            version: "1.0",
            exportDate: new Date().toISOString(),
            menus: JSON.parse(localStorage.getItem('coffee_menus')) || [],
            materials: JSON.parse(localStorage.getItem('coffee_materials')) || [],
            history: JSON.parse(localStorage.getItem('coffee_history')) || []
        };

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
        const downloadAnchor = document.createElement('a');
        
        const dateString = new Date().toISOString().slice(0, 10);
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `coffee_shop_backup_${dateString}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();

        if (typeof addHistoryLog === 'function') {
            addHistoryLog('จัดการระบบ', 'สำรองข้อมูล', 'ดาวน์โหลดไฟล์สำรองข้อมูลระบบสำเร็จ');
        }

        if (typeof Swal !== 'undefined') {
            Swal.fire('สำเร็จ', 'ดาวน์โหลดข้อมูลสำรองเรียบร้อยแล้ว', 'success');
        }
    } catch (error) {
        console.error(error);
    }
}

function importDataBackup() {
    const fileInput = document.getElementById('import-file-input');
    if (!fileInput || fileInput.files.length === 0) {
        Swal.fire('แจ้งเตือน', 'กรุณาเลือกไฟล์ JSON ที่ต้องการอัพโหลด', 'warning');
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function(event) {
        try {
            const parsedData = JSON.parse(event.target.result);

            if (!parsedData.menus || !parsedData.materials) {
                throw new Error('รูปแบบไฟล์ไม่ถูกต้อง');
            }

            Swal.fire({
                title: 'ยืนยันการกู้คืนข้อมูล?',
                text: "ข้อมูลปัจจุบันทั้งหมดจะถูกแทนที่ด้วยข้อมูลจากไฟล์สำรอง!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'ยืนยันกู้คืน',
                cancelButtonText: 'ยกเลิก'
            }).then((result) => {
                if (result.isConfirmed) {
                    applyImportedData(parsedData);
                }
            });
        } catch (e) {
            Swal.fire('ผิดพลาด', 'ไฟล์ข้อมูลไม่ถูกต้องหรือเสียหาย', 'error');
        }
    };

    reader.readAsText(file);
}

function applyImportedData(data) {
    localStorage.setItem('coffee_menus', JSON.stringify(data.menus));
    localStorage.setItem('coffee_materials', JSON.stringify(data.materials));
    localStorage.setItem('coffee_history', JSON.stringify(data.history || []));

    loadData();
    initializeAppUI();

    Swal.fire('สำเร็จ', 'กู้คืนข้อมูลเรียบร้อยแล้ว', 'success').then(() => {
        location.reload();
    });
}
