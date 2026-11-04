// ============================================
// VENDORA PRO - FILE 9: js/accounting.js
// Accounting - Ledger, Profit & Loss, VAT
// Auto from POS - No manual entry needed
// ============================================

function renderAccounting() {
  let inc = DB.sales.reduce((a,s) => a + s.total, 0);
  let exp = DB.expenses.reduce((a,e) => a + e.amount, 0);
  $('accIncome').innerText = fmt(inc);
  $('accExp').innerText = fmt(exp);
  $('accProfit').innerText = fmt(inc - exp);
  $('ledgerList').innerHTML = DB.ledger.slice().reverse().map(l => `<div class="flex justify-between border-b pb-1"><span>${new Date(l.date).toLocaleString()} - ${l.type} - ${l.desc}</span><b class="${l.amount>=0?'text-emerald-600':'text-red-600'}">${fmt(l.amount)}</b></div>`).join('') || 'No ledger entries yet - Make a sale first';
}
