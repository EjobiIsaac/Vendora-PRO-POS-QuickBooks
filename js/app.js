// ============================================
// VENDORA PRO - FILE 4: js/app.js
// Main Brain - Load, Save, Menu, Dashboard
// ============================================
let DB = JSON.parse(localStorage.getItem('vendora_pro_db') || 'null') || JSON.parse(JSON.stringify(SEED_DATA));
let cart = [];
let payMethod = 'Cash';
let editingId = null;

const $ = id => document.getElementById(id);
const fmt = n => { let c = (DB.settings.currency || 'UGX'); return c + ' ' + Number(n || 0).toLocaleString(); };

function save() { localStorage.setItem('vendora_pro_db', JSON.stringify(DB)); renderAll(); }

function saveSettings() {
  DB.settings.biz = $('bizName').value;
  DB.settings.phone = $('bizPhone').value;
  DB.settings.currency = $('currency').value;
  DB.settings.vat = Number($('vatRate').value || 18);
  $('vatLabel').innerText = DB.settings.vat;
  save();
}

function showPage(p) {
  document.querySelectorAll('.page').forEach(e => e.classList.add('hidden'));
  $('page-' + p).classList.remove('hidden');
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  let btn = document.querySelector(`[data-page="${p}"]`);
  if (btn) btn.classList.add('active');
  renderAll();
}

// MENU - Left Sidebar
const menuItems = [
  ['dashboard','🏠 Dashboard'],
  ['pos','🛒 POS - Sell'],
  ['products','📦 Products & Variants'],
  ['stock','📊 Stock'],
  ['sales','🧾 Sales'],
  ['customers','👥 Customers'],
  ['expenses','💸 Expenses'],
  ['accounting','📒 Accounting / Ledger'],
  ['settings','⚙️ Settings & Backup']
];
$('menu').innerHTML = menuItems.map(m => `<button data-page="${m[0]}" onclick="showPage('${m[0]}')" class="tab-btn w-full text-left px-3 py-2.5 rounded-lg text-[13px] font-semibold hover:bg-slate-100">${m[1]}</button>`).join('');

function renderAll() {
  if(!$('bizName')) return;
  $('bizName').value = DB.settings.biz || '';
  $('bizPhone').value = DB.settings.phone || '';
  $('currency').value = DB.settings.currency || 'UGX';
  $('vatRate').value = DB.settings.vat || 18;
  $('vatLabel').innerText = DB.settings.vat || 18;
  $('todayDate').innerText = new Date().toDateString();
  $('backupName').innerText = 'vendora-backup-' + new Date().toISOString().slice(0,10) + '.json';
  $('saleNo').innerText = '#' + String(DB.sales.length + 1).padStart(4,'0');
  if(typeof renderDashboard === 'function') renderDashboard();
  if(typeof renderPOSProducts === 'function') renderPOSProducts();
  if(typeof renderCart === 'function') renderCart();
  if(typeof renderProducts === 'function') renderProducts();
  if(typeof renderStock === 'function') renderStock();
  if(typeof renderSales === 'function') renderSales();
  if(typeof renderCustomers === 'function') renderCustomers();
  if(typeof renderExpenses === 'function') renderExpenses();
  if(typeof renderAccounting === 'function') renderAccounting();
  // Fill dropdowns
  if($('posCustomer')) $('posCustomer').innerHTML = DB.customers.map(c => `<option value="${c.id}">${c.name} - ${c.phone}</option>`).join('');
  if($('stockProd')) { $('stockProd').innerHTML = DB.products.map(p => `<option value="${p.id}">${p.name}</option>`).join(''); if(typeof updateStockVariantSel === 'function') updateStockVariantSel(); }
}

function renderDashboard() {
  let today = new Date().toDateString();
  let tSales = DB.sales.filter(s => new Date(s.date).toDateString() === today);
  let tTotal = tSales.reduce((a,s) => a + s.total, 0);
  let total = DB.sales.reduce((a,s) => a + s.total, 0);
  let profit = DB.sales.reduce((a,s) => a + s.profit, 0) - DB.expenses.reduce((a,e) => a + e.amount, 0);
  let stockVal = 0;
  DB.products.forEach(p => p.variants.forEach(v => stockVal += v.stock * v.cost));
  $('kpiToday').innerText = fmt(tTotal);
  $('kpiTotal').innerText = fmt(total);
  $('kpiProfit').innerText = fmt(profit);
  $('kpiStock').innerText = fmt(stockVal);
  let low = [];
  DB.products.forEach(p => p.variants.forEach(v => { if(v.stock <= 5) low.push(`${p.name} - ${v.label} : ${v.stock} left`); }));
  $('lowStockList').innerHTML = low.length ? low.map(l => `<div class="bg-red-50 p-2 rounded-lg">⚠️ ${l}</div>`).join('') : '<p class="text-emerald-600">✅ All stock OK</p>';
  $('recentSales').innerHTML = DB.sales.slice(-5).reverse().map(s => `<div class="flex justify-between border-b pb-1"><span>#${s.id} - ${s.items.length} items - ${s.pay}</span><b>${fmt(s.total)}</b></div>`).join('') || 'No sales yet';
  let inc = DB.sales.reduce((a,s) => a + s.total, 0);
  let exp = DB.expenses.reduce((a,e) => a + e.amount, 0);
  $('plView').innerHTML = `Income: <b class="text-emerald-600">${fmt(inc)}</b> &nbsp; Expenses: <b class="text-red-600">${fmt(exp)}</b> &nbsp; Net: <b>${fmt(inc-exp)}</b>`;
}

function renderSales() {
  $('salesList').innerHTML = DB.sales.slice().reverse().map(s => `<div class="bg-white p-3 rounded-2xl flex justify-between"><div><b>Sale #${s.id}</b> - ${new Date(s.date).toLocaleString()} - ${s.pay}<br><span class="text-[11px] text-slate-500">${s.items.map(i => i.name + ' x' + i.qty).join(', ')}</span></div><div class="text-right"><b>${fmt(s.total)}</b><br><span class="text-[11px] text-emerald-600">Profit ${fmt(s.profit)}</span></div></div>`).join('') || '<p>No sales yet</p>';
}

// Start App
renderAll();
showPage('dashboard');
