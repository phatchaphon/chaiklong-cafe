// --- 1. ข้อมูลเริ่มต้นและ State ของระบบ ---
let menus = [];
let materials = [];
let historyLogs = [];
let cart = [];
let salesChartInstance = null;

let editingMenuId = null;
let editingMaterialId = null;
let currentStockMatId = null;

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
        { id: 1, name: 'Espresso', category: 'Coffee', price: 50, recipe: [{materialId: 1, qty: 20}] },
        { id: 2, name: 'Latte', category: 'Coffee', price: 65, recipe: [{materialId: 1, qty: 20}, {materialId: 2, qty: 150}] }
    ];
    materials = JSON.parse(localStorage.getItem('coffee_materials')) || [
        { id: 1, category: 'เมล็ดกาแฟ', name: 'เมล็ดกาแฟ', qty: 1000, unit: 'กรัม', minQty: 200, costPerUnit: 0.5 },
        { id: 2, category: 'นม', name: 'นมสด', qty: 5000, unit: 'มล.', minQty: 1000, costPerUnit: 0.05 },
        { id: 3, category: 'ไซรัป', name: 'น้ำตาลทราย', qty: 2000, unit: 'กรัม', minQty: 500, costPerUnit: 0.02 }
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
});

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
        errorDiv.textContent = 'ชื่อผู้ใช้ หรือ รหัสผ่านไม่ถูกต้อง (User: admin, Pass: 1234)';
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
    let totalCupsToday = 0;

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
        if (m.qty <= 0) {
            empty++;
            lowStockListHTML += `<li style="color:var(--danger); font-size:13px; margin-bottom:5px;">❌ ${m.name} หมดแล้ว (เหลือ ${m.qty} ${m.unit})</li>`;
        } else if (m.qty <= m.minQty) {
            warn++;
            lowStockListHTML += `<li style="color:var(--warning); font-size:13px; margin-bottom:5px;">⚠️ ${m.name} ใกล้หมด (เหลือ ${m.qty} ${m.unit})</li>`;
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
    const hasLowStock = materials.some(m => m.qty <= m.minQty);
    if (hasLowStock) {
        const lowStockModal = document.getElementById('low-stock-modal');
        const lowStockModalList = document.getElementById('low-stock-modal-list');
        if (lowStockModal && lowStockModalList) {
            lowStockModalList.innerHTML = materials
                .filter(m => m.qty <= m.minQty)
                .map(m => `<div style="padding: 5px 0; border-bottom: 1px dashed var(--border-color);">${m.name}: เหลือ ${m.qty} ${m.unit} (ขั้นต่ำ ${m.minQty})</div>`)
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
                        const name = parts[0].trim();
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

// ฟังก์ชันคำนวณและแสดงผลการใช้วัตถุดิบตามช่วงเวลา
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
                        const menuName = parts[0].trim();
                        const qtySold = parseInt(parts[1]) || 1;

                        const menu = menus.find(m => m.name === menuName);
                        if (menu && menu.recipe) {
                            menu.recipe.forEach(rec => {
                                const mat = materials.find(m => m.id === parseInt(rec.materialId));
                                if (mat) {
                                    const totalUsed = rec.qty * qtySold;
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
    const existing = cart.find(item => item.id === menuId);
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({ id: menu.id, name: menu.name, price: menu.price, qty: 1 });
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
        <div class="cart-item">
            <div class="cart-item-info">
                <strong>${item.name}</strong><br>
                <small>${item.price} ฿ x ${item.qty}</small>
            </div>
            <div class="cart-item-actions">
                <button class="qty-btn" onclick="updateCartQty(${index}, -1)">-</button>
                <span>${item.qty}</span>
                <button class="qty-btn" onclick="updateCartQty(${index}, 1)">+</button>
                <button onclick="removeFromCart(${index})" class="btn-danger btn-small" style="padding:2px 6px; margin-left:5px;">X</button>
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

function removeFromCart(index) {
    cart.splice(index, 1);
    renderCart();
}

function checkoutDailySales() {
    if (cart.length === 0) {
        Swal.fire('แจ้งเตือน', 'กรุณาเลือกรายการสินค้า', 'warning');
        return;
    }

    for (let cartItem of cart) {
        const menu = menus.find(m => m.id === cartItem.id);
        if (menu && menu.recipe) {
            for (let rec of menu.recipe) {
                const mat = materials.find(m => m.id === parseInt(rec.materialId));
                if (mat && mat.qty < (rec.qty * cartItem.qty)) {
                    Swal.fire('วัตถุดิบไม่พอ', `วัตถุดิบ "${mat.name}" คงเหลือไม่เพียงพอสำหรับทำ ${menu.name}`, 'error');
                    return;
                }
            }
        }
    }

    cart.forEach(cartItem => {
        const menu = menus.find(m => m.id === cartItem.id);
        if (menu && menu.recipe) {
            menu.recipe.forEach(rec => {
                const mat = materials.find(m => m.id === parseInt(rec.materialId));
                if (mat) {
                    mat.qty -= (rec.qty * cartItem.qty);
                }
            });
        }
    });

    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const summaryStr = cart.map(i => `${i.name} x${i.qty}`).join(', ');

    addHistoryLog('ขายสินค้า', 'สรุปยอดขายประจำวัน', `รายการ: [${summaryStr}] | ยอดรวม: ${total} บาท`, 'sales');
    
    saveData();
    cart = [];
    renderCart();
    updateDashboard();
    renderMaterialTable();
    checkLowStockAlert();
    
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

window.openMenuModal = function(id = null) {
    updateCategoryDatalists();
    document.getElementById('menu-form').reset();
    document.getElementById('recipe-inputs').innerHTML = '';
    
    const titleEl = document.getElementById('menu-modal-title');
    if (id) {
        editingMenuId = id;
        titleEl.textContent = 'แก้ไขเมนู';
        const menu = menus.find(m => m.id === id);
        if (menu) {
            document.getElementById('menu-category').value = menu.category || '';
            document.getElementById('menu-name').value = menu.name || '';
            document.getElementById('menu-price').value = menu.price || '';
            
            if (menu.recipe && menu.recipe.length > 0) {
                menu.recipe.forEach(rec => {
                    addRecipeRow(rec.materialId, rec.qty);
                });
            } else {
                addRecipeRow();
            }
        }
    } else {
        editingMenuId = null;
        titleEl.textContent = 'เพิ่มเมนูใหม่';
        addRecipeRow();
    }
    document.getElementById('menu-modal').style.display = 'flex';
};

function addRecipeRow(materialId = '', qty = '') {
    const container = document.getElementById('recipe-inputs');
    if (!container) return;
    
    const rowId = 'recipe-row-' + Date.now() + Math.random().toString(36).substring(2, 5);
    const materialOptions = materials.map(m => `<option value="${m.name}" data-id="${m.id}">${m.unit ? '(' + m.unit + ')' : ''}</option>`).join('');
    
    let currentMatName = '';
    if (materialId) {
        const found = materials.find(m => m.id == materialId);
        if (found) currentMatName = found.name;
    }

    const div = document.createElement('div');
    div.className = 'recipe-row';
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
            <input type="number" class="recipe-qty" placeholder="ปริมาณ" value="${qty}" step="0.01" min="0.01" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 6px;" required>
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
            const recipeStr = m.recipe ? m.recipe.map(r => {
                const mat = materials.find(mat => mat.id == r.materialId);
                return mat ? `${mat.name} (${r.qty} ${mat.unit})` : '';
            }).filter(Boolean).join(', ') : 'ไม่มีสูตร';

            return `
                <tr>
                    <td><span class="cat-tag">${m.category || 'ทั่วไป'}</span></td>
                    <td><strong>${m.name}</strong></td>
                    <td>${m.price} บาท</td>
                    <td style="font-size: 12px; color: var(--text-muted);">${recipeStr}</td>
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

    const recipeRows = document.querySelectorAll('.recipe-row');
    let recipe = [];
    recipeRows.forEach(row => {
        const matId = row.querySelector('.recipe-mat-id').value;
        const qty = row.querySelector('.recipe-qty').value;
        if (matId && qty) {
            recipe.push({ materialId: parseInt(matId), qty: parseFloat(qty) });
        }
    });

    if (editingMenuId) {
        const menu = menus.find(m => m.id === editingMenuId);
        if (menu) {
            menu.category = category;
            menu.name = name;
            menu.price = price;
            menu.recipe = recipe;
            addHistoryLog('จัดการระบบ', 'แก้ไขเมนู', `แก้ไขเมนู: ${name} (${price} บาท)`);
            Swal.fire('สำเร็จ', 'แก้ไขเมนูเรียบร้อย', 'success');
        }
    } else {
        const newMenu = {
            id: Date.now(),
            category,
            name,
            price,
            recipe
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

// --- 9. หน้าจัดการวัตถุดิบ (เพิ่ม / แก้ไข / ลบ / ปรับสต็อก) ---
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
            document.getElementById('mat-min').value = mat.minQty || 0;
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
            if (m.qty <= 0) badgeColor = 'var(--danger)';
            else if (m.qty <= m.minQty) badgeColor = 'var(--warning)';

            const costPerUnit = parseFloat(m.costPerUnit || 0);
            const totalCost = (m.qty * costPerUnit).toFixed(2);

            return `
            <tr>
                <td><span class="cat-tag">${m.category || 'ทั่วไป'}</span></td>
                <td><strong>${m.name}</strong></td>
                <td><strong style="color:${badgeColor}">${m.qty}</strong></td>
                <td>${m.unit}</td>
                <td>${m.minQty}</td>
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
            mat.minQty = min;
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
            qty: stock,
            minQty: min,
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
        mat.qty += (type * amount);
        if (mat.qty < 0) mat.qty = 0;
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

// --- ฟังก์ชันกลางสำหรับสร้างปุ่ม Pagination UI ---
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

// --- 11. กราฟยอดขาย 7 วันย้อนหลัง ---
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
// --- ฟังก์ชันดาวน์โหลดข้อมูลสำรอง (Export) ---
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
        } else {
            alert('ดาวน์โหลดข้อมูลสำรองเรียบร้อยแล้ว');
        }
    } catch (error) {
        console.error(error);
        if (typeof Swal !== 'undefined') {
            Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถดาวน์โหลดข้อมูลได้', 'error');
        }
    }
}

// --- ฟังก์ชันอัพโหลดและกู้คืนข้อมูล (Import) ---
function importDataBackup() {
    const fileInput = document.getElementById('import-file-input');
    if (!fileInput || fileInput.files.length === 0) {
        if (typeof Swal !== 'undefined') {
            Swal.fire('แจ้งเตือน', 'กรุณาเลือกไฟล์ JSON ที่ต้องการอัพโหลด', 'warning');
        } else {
            alert('กรุณาเลือกไฟล์ JSON ที่ต้องการอัพโหลด');
        }
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function(event) {
        try {
            const parsedData = JSON.parse(event.target.result);

            // ตรวจสอบโครงสร้างข้อมูลเบื้องต้น
            if (!parsedData.menus || !parsedData.materials) {
                throw new Error('รูปแบบไฟล์ไม่ถูกต้อง');
            }

            if (typeof Swal !== 'undefined') {
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
            } else {
                if (confirm('ยืนยันการกู้คืนข้อมูล? ข้อมูลปัจจุบันจะถูกแทนที่')) {
                    applyImportedData(parsedData);
                }
            }
        } catch (e) {
            console.error(e);
            if (typeof Swal !== 'undefined') {
                Swal.fire('ผิดพลาด', 'ไฟล์ข้อมูลไม่ถูกต้องหรือเสียหาย', 'error');
            } else {
                alert('ไฟล์ข้อมูลไม่ถูกต้องหรือเสียหาย');
            }
        }
    };

    reader.readAsText(file);
}

// ฟังก์ชันช่วยบันทึกข้อมูลที่อัพโหลดลง LocalStorage และรีเฟรชหน้าจอ
function applyImportedData(data) {
    localStorage.setItem('coffee_menus', JSON.stringify(data.menus));
    localStorage.setItem('coffee_materials', JSON.stringify(data.materials));
    localStorage.setItem('coffee_history', JSON.stringify(data.history || []));

    if (typeof loadData === 'function') loadData();
    if (typeof initializeAppUI === 'function') initializeAppUI();

    if (typeof Swal !== 'undefined') {
        Swal.fire('สำเร็จ', 'กู้คืนข้อมูลเรียบร้อยแล้ว', 'success').then(() => {
            location.reload();
        });
    } else {
        alert('กู้คืนข้อมูลเรียบร้อยแล้ว');
        location.reload();
    }
}