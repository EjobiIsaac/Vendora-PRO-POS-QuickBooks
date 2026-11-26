// ============================================
// VENDORA PRO - accounting.js
// Sales History + Expenses + P&L Accounting
// Depends on: app.js (DB, saveDB, fmt, money, uid, todayStr)
// ============================================

// ---------- SALES HISTORY ----------
function renderSales(){
  let el = document.getElementById('salesList');
  if(!el) return;
  let q = (document.getElementById('salesSearch')?.value || '').toLowerCase();

  let list = [...DB.sales].reverse().filter(s => {
    if(!q) return true;
    return (s.no||'').toLowerCase().includes(q) ||
           (s.customer||'').toLowerCase().includes(q) ||
           (s.payMethod||'').toLowerCase().includes(q) ||
           (s.items||[]).some(it => (it.name||'').toLowerCase().includes(q));
  });

  if(list.length === 0){
    el.innerHTML = '<p class="text-slate-400">No sales found.</p>';
    return;
  }

  el.innerHTML = list.map(s => {
    let itemsText = (s.items||[]).map(it => `${it.name} - ${it.variantName||''} x${it.qty}`).join(', ');
    return `
    <div class="bg-white p-3 rounded-2xl shadow-sm">
      <div class="flex justify-between">
        <b class="text-sm">${s.no}</b>
        <span class="text-[11px] text-slate-400">${new Date(s.date).toLocaleString()}</span>
      </div>
      <p class="text-xs text-slate-600 mt-1">${itemsText}</p>
      <div class="flex justify-between items-center mt-2">
        <span class="text-xs">Customer: <b>${s.customer||'Walk-in'}</b> • <span class="bg-slate-100 px-2 py-0.5 rounded-full">${s.payMethod}</span></span>
        <span class="text-xs">Paid: ${money(s.amountPaid)} ${Number(s.balance||0)>0 ? `<span class="text-red-600 font-bold">• Owes: ${money(s.balance)}</span>` : ''}</span>
        <b class="text-sm">${money(s.total)}</b>
      </div>
    </div>`;
  }).join('');
}

// ---------- EXPENSES ----------
function addExpense(){
  let title = document.getElementById('expTitle')?.value.trim();
  let amount = Number(document.getElementById('expAmount')?.value || 0);
  let cat = document.getElementById('expCat')?.value || 'General';
  if(!title){ alert('Enter expense title e.g. Rent, Transport'); return; }
  if(amount <= 0){ alert('Enter amount > 0'); return; }

  DB.expenses.push({ id: uid(), title, amount, category: cat, date: new Date().toISOString() });
  saveDB();
  document.getElementById('expTitle').value = '';
  document.getElementById('expAmount').value = '';
  renderExpenses();
  renderDashboard();
  if(typeof renderAccounting === 'function') renderAccounting();
}

function deleteExpense(id){
  if(!confirm('Delete this expense?')) return;
  DB.expenses = DB.expenses.filter(e => e.id !== id);
  saveDB();
  renderExpenses();
  renderDashboard();
  if(typeof renderAccounting === 'function') renderAccounting();
}

function renderExpenses(){
  let el = document.getElementById('expList');
  if(!el) return;
  let totalEl = document.getElementById('totalExp');
  let total = DB.expenses.reduce((a,e)=>a+Number(e.amount||0),0);
  if(totalEl) totalEl.innerText = money(total);

  if(DB.expenses.length === 0){
    el.innerHTML = '<p class="text-slate-400">No expenses yet.</p>';
    return;
  }
  el.innerHTML = [...DB.expenses].reverse().map(e => `
    <div class="bg-white p-3 rounded-2xl shadow-sm flex justify-between items-center">
      <div><b class="text-sm">${e.title}</b><p class="text-[11px] text-slate-400">${e.category} • ${new Date(e.date).toLocaleDateString()}</p></div>
      <div class="flex gap-2 items-center"><b class="text-red-600">${money(e.amount)}</b><button onclick="deleteExpense('${e.id}')" class="bg-red-100 text-red-600 px-2 py-1 rounded-lg text-xs font-bold">Delete</button></div>
    </div>
  `).join('');
}

// ---------- ACCOUNTING / P&L ----------
function renderAccounting(){
  let el = document.getElementById('acctList');
  if(!el) return;

  // Real sales only, exclude Debt Payment records (total = 0)
  let realSales = DB.sales.filter(s => s.payMethod !== 'Debt Payment');
  let revenue = realSales.reduce((a,s)=>a+Number(s.total||0),0);
  let totalVat = realSales.reduce((a,s)=>a+Number(s.vat||0),0);
  let totalDisc = realSales.reduce((a,s)=>a+Number(s.discount||0),0);

  let cogs = 0;
  realSales.forEach(s => (s.items||[]).forEach(it => cogs += Number(it.cost||0)*Number(it.qty||0)));

  let gross = revenue - cogs;
  let totalExp = DB.expenses.reduce((a,e)=>a+Number(e.amount||0),0);
  let net = gross - totalExp;

  let debtCollected = DB.sales.filter(s => s.payMethod === 'Debt Payment').reduce((a,s)=>a+Number(s.amountPaid||0),0);
  let outstanding = DB.customers.reduce((a,c)=>a+Number(c.balance||0),0);

  el.innerHTML = `
    <div class="grid md:grid-cols-3 gap-3">
      <div class="bg-white p-4 rounded-2xl"><p class="text-slate-500 text-xs">Total Revenue</p><b class="text-xl">${money(revenue)}</b><p class="text-[11px] text-slate-400">${realSales.length} sales</p></div>
      <div class="bg-white p-4 rounded-2xl"><p class="text-slate-500 text-xs">VAT Collected</p><b class="text-xl">${money(totalVat)}</b><p class="text-[11px] text-slate-400">Discounts given: ${money(totalDisc)}</p></div>
      <div class="bg-white p-4 rounded-2xl"><p class="text-slate-500 text-xs">Cost of Goods (COGS)</p><b class="text-xl">${money(cogs)}</b><p class="text-[11px] text-slate-400">What you paid for stock sold</p></div>
      <div class="bg-emerald-50 p-4 rounded-2xl"><p class="text-slate-500 text-xs">Gross Profit</p><b class="text-xl text-emerald-600">${money(gross)}</b><p class="text-[11px] text-slate-400">Revenue - COGS</p></div>
      <div class="bg-red-50 p-4 rounded-2xl"><p class="text-slate-500 text-xs">Total Expenses</p><b class="text-xl text-red-600">${money(totalExp)}</b><p class="text-[11px] text-slate-400">${DB.expenses.length} expenses</p></div>
      <div class="bg-indigo-50 p-4 rounded-2xl"><p class="text-slate-500 text-xs">NET PROFIT</p><b class="text-xl ${net>=0?'text-emerald-600':'text-red-600'}">${money(net)}</b><p class="text-[11px] text-slate-400">Gross - Expenses</p></div>
    </div>
    <div class="grid md:grid-cols-2 gap-3 mt-3">
      <div class="bg-white p-4 rounded-2xl"><p class="text-slate-500 text-xs">Debt Collected (Cash In)</p><b>${money(debtCollected)}</b></div>
      <div class="bg-white p-4 rounded-2xl"><p class="text-slate-500 text-xs">Still Owed By Customers</p><b class="text-red-600">${money(outstanding)}</b></div>
    </div>
    <div class="bg-white p-4 rounded-2xl mt-3">
      <b class="text-sm">How Profit Is Calculated (for your customers to trust you)</b>
      <p class="text-xs text-slate-600 mt-1 leading-relaxed">
        Revenue (${money(revenue)}) − Cost of Stock Sold (${money(cogs)}) = Gross Profit (${money(gross)}).<br>
        Gross Profit (${money(gross)}) − Expenses (${money(totalExp)}) = <b>Net Profit (${money(net)})</b>.<br>
        This uses the Cost Price you entered for each variant. If you leave Cost = 0, profit will look higher than real.
      </p>
    </div>
  `;
    }
