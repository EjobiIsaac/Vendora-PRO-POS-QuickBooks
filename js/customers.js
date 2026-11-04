// ============================================
// VENDORA PRO - FILE 8: js/customers.js
// Customers + Credit / Debt + Expenses
// ============================================

function addCustomer() {
  let n = $('custName').value.trim();
  if(!n) return;
  DB.customers.push({id: Date.now(), name: n, phone: $('custPhone').value || '', balance: 0});
  $('custName').value = ''; $('custPhone').value = '';
  save();
}

function renderCustomers() {
  $('custList').innerHTML = DB.customers.map(c => `<div class="bg-white p-4 rounded-2xl"><b>${c.name}</b><p class="text-xs text-slate-500">${c.phone}</p><p class="text-xs mt-1">Credit Balance: <b class="${c.balance>0?'text-red-600':'text-emerald-600'}">${fmt(c.balance)}</b></p>${c.balance>0?`<button onclick="payDebt(${c.id})" class="bg-emerald-600 text-white px-3 py-1 rounded-lg text-[11px] mt-2">Record Payment</button>`:''}</div>`).join('');
}

function payDebt(id) {
  let amt = Number(prompt('Amount paid by customer?'));
  if(!amt) return;
  let c = DB.customers.find(x => x.id == id);
  c.balance = Math.max(0, c.balance - amt);
  DB.ledger.push({date: new Date().toISOString(), type: 'Income - Debt Payment', desc: `Debt payment from ${c.name}`, amount: amt});
  save();
  alert('✅ Payment recorded. Remaining balance: ' + fmt(c.balance));
}

function addExpense() {
  let t = $('expTitle').value.trim();
  let a = Number($('expAmt').value);
  if(!t || !a) { alert('Enter expense title and amount'); return; }
  DB.expenses.push({id: Date.now(), title: t, amount: a, cat: $('expCat').value, date: new Date().toISOString()});
  DB.ledger.push({date: new Date().toISOString(), type: 'Expense', desc: `${t} - ${$('expCat').value}`, amount: -a});
  $('expTitle').value = ''; $('expAmt').value = '';
  save();
}

function renderExpenses() {
  $('expList').innerHTML = DB.expenses.slice().reverse().map(e => `<div class="bg-white p-3 rounded-2xl flex justify-between"><span>${e.title} - ${e.cat} - ${new Date(e.date).toLocaleDateString()}</span><b class="text-red-600">${fmt(e.amount)}</b></div>`).join('') || '<p>No expenses yet</p>';
    }
