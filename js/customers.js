// ============================================
// VENDORA PRO - customers.js
// Customers + Credit / Debt Management
// Depends on: app.js (DB, saveDB, fmt, money, uid)
// ============================================

function fillCustomerDropdown(){
  let sel = document.getElementById('posCustomer');
  if(!sel) return;
  // Keep selected value if possible
  let old = sel.value;
  sel.innerHTML = `<option value="walkin">Walk-in Customer</option>` +
    DB.customers.map(c => `<option value="${c.id}">${c.name} ${Number(c.balance||0)>0 ? '(Owes: ' + money(c.balance) + ')' : ''}</option>`).join('');
  if(old) sel.value = old;
}

function addCustomer(){
  let nameEl = document.getElementById('custName');
  let phoneEl = document.getElementById('custPhone');
  let name = nameEl.value.trim();
  let phone = phoneEl.value.trim();
  if(!name){ alert('Enter customer name'); return; }

  // Prevent duplicate name
  let exists = DB.customers.find(c => c.name.toLowerCase() === name.toLowerCase());
  if(exists){ alert('Customer already exists'); return; }

  DB.customers.push({ id: uid(), name, phone, balance: 0 });
  saveDB();
  nameEl.value = '';
  phoneEl.value = '';
  renderCustomers();
  fillCustomerDropdown();
}

function deleteCustomer(id){
  let c = DB.customers.find(x => x.id === id);
  if(!c) return;
  if(Number(c.balance||0) > 0){
    if(!confirm(c.name + ' still owes ' + money(c.balance) + '. Delete anyway?')) return;
  } else {
    if(!confirm('Delete ' + c.name + '?')) return;
  }
  DB.customers = DB.customers.filter(x => x.id !== id);
  saveDB();
  renderCustomers();
  fillCustomerDropdown();
}

function renderCustomers(){
  let el = document.getElementById('custList');
  if(!el) return;
  let totalDebt = DB.customers.reduce((a,c)=>a+Number(c.balance||0),0);

  let debtEl = document.getElementById('totalDebt');
  if(debtEl) debtEl.innerText = money(totalDebt);

  if(DB.customers.length === 0){
    el.innerHTML = '<p class="text-slate-400">No customers yet. Add your first customer above.</p>';
    return;
  }

  el.innerHTML = DB.customers.map(c => {
    let sales = DB.sales.filter(s => s.customerId === c.id);
    let totalBought = sales.reduce((a,s)=>a+Number(s.total||0),0);
    return `
    <div class="bg-white p-3 rounded-2xl shadow-sm flex justify-between items-center">
      <div>
        <b class="text-sm">${c.name}</b> <span class="text-slate-400 text-xs">${c.phone||''}</span>
        <p class="text-[11px] text-slate-500">${sales.length} purchases • Total bought: ${money(totalBought)}</p>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs font-bold ${Number(c.balance||0)>0 ? 'text-red-600 bg-red-50 px-2 py-1 rounded-full' : 'text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full'}">
          ${Number(c.balance||0)>0 ? 'Owes: ' + money(c.balance) : 'Clear ✅'}
        </span>
        ${Number(c.balance||0)>0 ? `<button onclick="payDebt('${c.id}')" class="bg-emerald-600 text-white px-3 py-1 rounded-lg text-xs font-bold">Pay Debt</button>` : ''}
        <button onclick="deleteCustomer('${c.id}')" class="bg-red-100 text-red-600 px-2 py-1 rounded-lg text-xs font-bold">Delete</button>
      </div>
    </div>`;
  }).join('');
}

function payDebt(customerId){
  let c = DB.customers.find(x => x.id === customerId);
  if(!c) return;
  let owed = Number(c.balance||0);
  if(owed <= 0){ alert('This customer owes nothing'); return; }

  let amt = prompt(c.name + ' owes ' + money(owed) + '. How much are they paying now?', owed);
  if(amt === null) return; // Cancelled
  amt = Number(amt);
  if(isNaN(amt) || amt <= 0){ alert('Enter valid amount'); return; }
  if(amt > owed){ alert('Cannot pay more than owed. Owed is ' + money(owed)); return; }

  c.balance = owed - amt;

  // Record payment as a sale-like entry so accounting sees it?
  // We keep it simple: create an expense-style record in sales as payment
  // Actually: just save balance, and add a note sale with payMethod = Debt Payment, total = 0, so history shows it
  DB.sales.push({
    id: uid(),
    no: 'PAY-' + String(DB.sales.length+1).padStart(4,'0'),
    date: new Date().toISOString(),
    customer: c.name,
    customerId: c.id,
    items: [{ name: 'Debt Payment', variantName: '', price: amt, cost: 0, qty: 1 }],
    subtotal: 0, discount: 0, vat: 0, total: 0,
    payMethod: 'Debt Payment',
    amountPaid: amt, change: 0, balance: 0
  });

  saveDB();
  renderCustomers();
  fillCustomerDropdown();
  if(typeof renderDashboard === 'function') renderDashboard();
  if(typeof renderSales === 'function') renderSales();
  alert(c.name + ' paid ' + money(amt) + '. Remaining balance: ' + money(c.balance));
}
