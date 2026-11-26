// ============================================
// VENDORA PRO - app.js - MAIN BRAIN
// Works with: main.py (Source 3) + index.html + lock.html
// ============================================

// ---------- GLOBAL STATE ----------
let DB = {
  products: [],   // [{id, name, category, variants: [{id, name, price, cost, barcode, stock, lowAlert}]}]
  sales: [],      // [{id, no, date, customer, items, subtotal, discount, vat, total, payMethod, amountPaid, change}]
  customers: [],  // [{id, name, phone, balance}]
  expenses: [],   // [{id, title, amount, category, date}]
  settings: { bizName: 'My Shop', bizPhone: '', currency: 'UGX', vatRate: 18 }
};

let currentPage = 'dashboard';
let payMethod = 'Cash';
let cart = [];

// ---------- HELPERS ----------
function fmt(n){
  n = Number(n||0);
  return n.toLocaleString('en-US');
}
function money(n){
  return (DB.settings.currency || 'UGX') + ' ' + fmt(n);
}
function uid(){
  return 'id_' + Date.now() + '_' + Math.floor(Math.random()*10000);
}
function todayStr(){
  return new Date().toISOString().slice(0,10);
}
function genSaleNo(){
  return 'INV-' + String(DB.sales.length + 1).padStart(4,'0');
}

// ---------- SAVE / LOAD ----------
function saveDB(){
  localStorage.setItem('vendora_products', JSON.stringify(DB.products));
  localStorage.setItem('vendora_sales', JSON.stringify(DB.sales));
  localStorage.setItem('vendora_customers', JSON.stringify(DB.customers));
  localStorage.setItem('vendora_expenses', JSON.stringify(DB.expenses));
  localStorage.setItem('vendora_settings', JSON.stringify(DB.settings));
  // Note: index.html overrides localStorage.setItem to ALSO save to SQLite via pywebview
  // So this one call saves twice: browser + vendora.db
}

function loadDB(){
  try{
    DB.products = JSON.parse(localStorage.getItem('vendora_products') || '[]');
    DB.sales = JSON.parse(localStorage.getItem('vendora_sales') || '[]');
    DB.customers = JSON.parse(localStorage.getItem('vendora_customers') || '[]');
    DB.expenses = JSON.parse(localStorage.getItem('vendora_expenses') || '[]');
    let s = JSON.parse(localStorage.getItem('vendora_settings') || 'null');
    if(s) DB.settings = Object.assign(DB.settings, s);
  }catch(e){ console.error('loadDB error', e); }
}

function saveSettings(){
  DB.settings.bizName = document.getElementById('bizName').value || 'My Shop';
  DB.settings.bizPhone = document.getElementById('bizPhone').value || '';
  DB.settings.currency = document.getElementById('currency').value || 'UGX';
  DB.settings.vatRate = Number(document.getElementById('vatRate').value || 18);
  localStorage.setItem('vendora_settings', JSON.stringify(DB.settings));
  let vl = document.getElementById('vatLabel');
  if(vl) vl.innerText = DB.settings.vatRate;
  renderDashboard();
  if(typeof renderCart === 'function') renderCart();
}

// ---------- MENU + PAGES ----------
const MENU_ITEMS = [
  { id:'dashboard', label:'📊 Dashboard', icon:'📊' },
  { id:'pos', label:'🛒 POS - Sell', icon:'🛒' },
  { id:'products', label:'📦 Products & Variants', icon:'📦' },
  { id:'stock', label:'📦 Stock Management', icon:'📦' },
  { id:'sales', label:'🧾 Sales History', icon:'🧾' },
  { id:'customers', label:'👥 Customers & Credit', icon:'👥' },
  { id:'expenses', label:'💸 Expenses', icon:'💸' },
  { id:'accounting', label:'📒 Accounting', icon:'📒' },
  { id:'settings', label:'⚙️ Settings & Backup', icon:'⚙️' },
];

function renderMenu(){
  let el = document.getElementById('menu');
  if(!el) return;
  el.innerHTML = MENU_ITEMS.map(m => `
    <button onclick="showPage('${m.id}')" data-menu="${m.id}"
      class="w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold flex gap-2 items-center ${currentPage===m.id ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 text-slate-700'}">
      ${m.label}
    </button>
  `).join('');
}

function showPage(page){
  currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  let target = document.getElementById('page-' + page);
  if(target) target.classList.remove('hidden');
  renderMenu();
  // Refresh the page you just opened
  if(page==='dashboard') renderDashboard();
  if(page==='pos'){ if(typeof renderPOSProducts==='function') renderPOSProducts(); if(typeof renderCart==='function') renderCart(); }
  if(page==='products'){ if(typeof renderProducts==='function') renderProducts(); }
  if(page==='stock'){ if(typeof renderStock==='function') renderStock(); }
  if(page==='sales'){ if(typeof renderSales==='function') renderSales(); }
  if(page==='customers'){ if(typeof renderCustomers==='function') renderCustomers(); }
  if(page==='expenses'){ if(typeof renderExpenses==='function') renderExpenses(); }
  if(page==='accounting'){ if(typeof renderAccounting==='function') renderAccounting(); }
}

// ---------- DASHBOARD ----------
function renderDashboard(){
  // Stats
  let today = todayStr();
  let todaySales = DB.sales.filter(s => (s.date||'').slice(0,10) === today);
  let todayTotal = todaySales.reduce((a,s)=>a+Number(s.total||0),0);
  let totalSales = DB.sales.reduce((a,s)=>a+Number(s.total||0),0);
  let totalExp = DB.expenses.reduce((a,e)=>a+Number(e.amount||0),0);
  let totalProducts = DB.products.length;
  let totalStock = 0;
  DB.products.forEach(p => (p.variants||[]).forEach(v => totalStock += Number(v.stock||0)));

  let statsEl = document.getElementById('dashStats');
  if(statsEl){
    statsEl.innerHTML = `
      <div class="bg-white p-4 rounded-2xl shadow-sm"><p class="text-[11px] text-slate-500">Today Sales</p><b class="text-lg text-emerald-600">${money(todayTotal)}</b><p class="text-[10px] text-slate-400">${todaySales.length} sales today</p></div>
      <div class="bg-white p-4 rounded-2xl shadow-sm"><p class="text-[11px] text-slate-500">Total Sales</p><b class="text-lg">${money(totalSales)}</b><p class="text-[10px] text-slate-400">${DB.sales.length} total sales</p></div>
      <div class="bg-white p-4 rounded-2xl shadow-sm"><p class="text-[11px] text-slate-500">Total Expenses</p><b class="text-lg text-red-600">${money(totalExp)}</b><p class="text-[10px] text-slate-400">${DB.expenses.length} expenses</p></div>
      <div class="bg-white p-4 rounded-2xl shadow-sm"><p class="text-[11px] text-slate-500">Stock Items</p><b class="text-lg">${fmt(totalStock)} units</b><p class="text-[10px] text-slate-400">${totalProducts} products</p></div>
    `;
  }

  // Low Stock
  let lowEl = document.getElementById('lowStockList');
  if(lowEl){
    let lows = [];
    DB.products.forEach(p => (p.variants||[]).forEach(v => {
      let alert = Number(v.lowAlert || 5);
      if(Number(v.stock||0) <= alert) lows.push({p, v});
    }));
    lowEl.innerHTML = lows.length ? lows.map(({p,v}) => `
      <div class="flex justify-between bg-red-50 p-2 rounded-lg"><span>${p.name} - ${v.name}</span><b class="text-red-600">${v.stock} left</b></div>
    `).join('') : '<p class="text-slate-400">✅ No low stock. All good.</p>';
  }

  // Recent Sales
  let recEl = document.getElementById('recentSales');
  if(recEl){
    let recent = [...DB.sales].reverse().slice(0,5);
    recEl.innerHTML = recent.length ? recent.map(s => `
      <div class="flex justify-between bg-slate-50 p-2 rounded-lg"><span>${s.no} • ${s.customer||'Walk-in'} • ${s.payMethod||''}</span><b>${money(s.total)}</b></div>
    `).join('') : '<p class="text-slate-400">No sales yet. Go to POS to sell.</p>';
  }

  // P&L Quick View
  let plEl = document.getElementById('plView');
  if(plEl){
    let cogs = 0;
    DB.sales.forEach(s => (s.items||[]).forEach(it => cogs += Number(it.cost||0) * Number(it.qty||0)));
    let gross = totalSales - cogs;
    let net = gross - totalExp;
    plEl.innerHTML = `
      <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
        <div class="bg-slate-50 p-2 rounded-lg"><p class="text-slate-500">Revenue</p><b>${money(totalSales)}</b></div>
        <div class="bg-slate-50 p-2 rounded-lg"><p class="text-slate-500">Cost (COGS)</p><b>${money(cogs)}</b></div>
        <div class="bg-slate-50 p-2 rounded-lg"><p class="text-slate-500">Gross Profit</p><b class="text-emerald-600">${money(gross)}</b></div>
        <div class="bg-slate-50 p-2 rounded-lg"><p class="text-slate-500">Net Profit</p><b class="${net>=0?'text-emerald-600':'text-red-600'}">${money(net)}</b></div>
      </div>
    `;
  }
}

// ---------- INIT ----------
function init(){
  loadDB();
  // If first run and empty, seed.js will fill sample data
  if(DB.products.length===0 && typeof seedData==='function'){
    seedData();
    loadDB();
  }
  // Fill settings inputs
  let bN = document.getElementById('bizName'); if(bN) bN.value = DB.settings.bizName;
  let bP = document.getElementById('bizPhone'); if(bP) bP.value = DB.settings.bizPhone;
  let cur = document.getElementById('currency'); if(cur) cur.value = DB.settings.currency;
  let vat = document.getElementById('vatRate'); if(vat) vat.value = DB.settings.vatRate;
  let vl = document.getElementById('vatLabel'); if(vl) vl.innerText = DB.settings.vatRate;

  // Sale No
  let sn = document.getElementById('saleNo'); if(sn) sn.innerText = genSaleNo();

  renderMenu();
  renderDashboard();
  showPage('dashboard');

  // Let other files fill their dropdowns
  if(typeof fillCustomerDropdown==='function') fillCustomerDropdown();
  if(typeof fillStockDropdowns==='function') fillStockDropdowns();
  if(typeof renderPOSProducts==='function') renderPOSProducts();
  if(typeof renderCart==='function') renderCart();
}

// Run when page loads - index.html also calls init() after SQLite sync
document.addEventListener('DOMContentLoaded', init);
