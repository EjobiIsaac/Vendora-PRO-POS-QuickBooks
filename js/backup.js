// ============================================
// VENDORA PRO - backup.js
// Backup / Restore / Excel Export / QuickBooks
// Depends on: app.js (DB, saveDB, fmt, money)
// ============================================

function collectAllData(){
  return {
    app: 'VendoraPRO',
    version: '1.0',
    exportedAt: new Date().toISOString(),
    settings: DB.settings,
    products: DB.products,
    sales: DB.sales,
    customers: DB.customers,
    expenses: DB.expenses
  };
}

function downloadFile(filename, content, type='application/json'){
  let blob = new Blob([content], {type});
  let a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
}

// ---------- BACKUP ----------
function backupAll(){
  let data = collectAllData();
  let date = new Date().toISOString().slice(0,10);
  let biz = (DB.settings.bizName || 'shop').replace(/[^a-z0-9]/gi,'_');
  downloadFile(`VendoraPRO_Backup_${biz}_${date}.json`, JSON.stringify(data, null, 2));
  alert('Backup downloaded! Keep this file safe. If computer dies, use Restore to bring back everything.');
}

// ---------- RESTORE ----------
function restoreAll(){
  let input = document.getElementById('restoreFile');
  if(input) input.click();
}

function handleRestoreFile(input){
  let file = input.files[0];
  if(!file) return;
  let reader = new FileReader();
  reader.onload = function(e){
    try{
      let data = JSON.parse(e.target.result);
      if(!data.products && !data.sales){
        alert('This file is not a valid VendoraPRO backup.');
        return;
      }
      if(!confirm('Restore will REPLACE all current data with backup data. Continue?')){
        input.value = '';
        return;
      }
      DB.products = data.products || [];
      DB.sales = data.sales || [];
      DB.customers = data.customers || [];
      DB.expenses = data.expenses || [];
      if(data.settings) DB.settings = Object.assign(DB.settings, data.settings);
      saveDB();
      input.value = '';
      // Refresh everything
      if(typeof renderDashboard === 'function') renderDashboard();
      if(typeof renderProducts === 'function') renderProducts();
      if(typeof renderPOSProducts === 'function') renderPOSProducts();
      if(typeof renderCustomers === 'function') renderCustomers();
      if(typeof renderSales === 'function') renderSales();
      if(typeof renderExpenses === 'function') renderExpenses();
      if(typeof renderAccounting === 'function') renderAccounting();
      if(typeof fillCustomerDropdown === 'function') fillCustomerDropdown();
      alert('Restore complete! All data brought back from backup.');
      showPage('dashboard');
    }catch(err){
      alert('Backup file is damaged: ' + err.message);
    }
  };
  reader.readAsText(file);
}

// ---------- EXCEL EXPORT ----------
function exportExcel(){
  if(typeof XLSX === 'undefined'){
    alert('Excel library not loaded. Check js/xlsx.full.min.js exists.');
    return;
  }
  let wb = XLSX.utils.book_new();

  // Sheet 1: Sales
  let salesRows = [['Invoice', 'Date', 'Customer', 'Payment', 'Subtotal', 'Discount', 'VAT', 'Total', 'Paid', 'Balance', 'Items']];
  DB.sales.forEach(s => {
    salesRows.push([
      s.no, new Date(s.date).toLocaleString(), s.customer, s.payMethod,
      s.subtotal, s.discount, s.vat, s.total, s.amountPaid, s.balance||0,
      (s.items||[]).map(it => `${it.name} - ${it.variantName||''} x${it.qty}`).join('; ')
    ]);
  });
  let wsSales = XLSX.utils.aoa_to_sheet(salesRows);
  XLSX.utils.book_append_sheet(wb, wsSales, 'Sales');

  // Sheet 2: Products
  let prodRows = [['Product', 'Category', 'Variant', 'Price', 'Cost', 'Barcode', 'Stock', 'Low Alert', 'Stock Value']];
  DB.products.forEach(p => (p.variants||[]).forEach(v => {
    prodRows.push([p.name, p.category, v.name, v.price, v.cost||0, v.barcode||'', v.stock, v.lowAlert||5, Number(v.stock||0)*Number(v.price||0)]);
  }));
  let wsProd = XLSX.utils.aoa_to_sheet(prodRows);
  XLSX.utils.book_append_sheet(wb, wsProd, 'Products');

  // Sheet 3: Customers
  let custRows = [['Name', 'Phone', 'Balance Owed', 'Total Purchases', 'No. of Sales']];
  DB.customers.forEach(c => {
    let sales = DB.sales.filter(s => s.customerId === c.id);
    custRows.push([c.name, c.phone||'', c.balance||0, sales.reduce((a,s)=>a+Number(s.total||0),0), sales.length]);
  });
  let wsCust = XLSX.utils.aoa_to_sheet(custRows);
  XLSX.utils.book_append_sheet(wb, wsCust, 'Customers');

  // Sheet 4: Expenses
  let expRows = [['Title', 'Category', 'Amount', 'Date']];
  DB.expenses.forEach(e => expRows.push([e.title, e.category, e.amount, new Date(e.date).toLocaleDateString()]));
  let wsExp = XLSX.utils.aoa_to_sheet(expRows);
  XLSX.utils.book_append_sheet(wb, wsExp, 'Expenses');

  // Sheet 5: P&L
  let realSales = DB.sales.filter(s => s.payMethod !== 'Debt Payment');
  let revenue = realSales.reduce((a,s)=>a+Number(s.total||0),0);
  let cogs = 0;
  realSales.forEach(s => (s.items||[]).forEach(it => cogs += Number(it.cost||0)*Number(it.qty||0)));
  let gross = revenue - cogs;
  let totalExp = DB.expenses.reduce((a,e)=>a+Number(e.amount||0),0);
  let net = gross - totalExp;
  let plRows = [['Profit & Loss'], ['Revenue', revenue], ['COGS', cogs], ['Gross Profit', gross], ['Expenses', totalExp], ['Net Profit', net]];
  let wsPL = XLSX.utils.aoa_to_sheet(plRows);
  XLSX.utils.book_append_sheet(wb, wsPL, 'ProfitLoss');

  let biz = (DB.settings.bizName || 'shop').replace(/[^a-z0-9]/gi,'_');
  XLSX.writeFile(wb, `VendoraPRO_Export_${biz}_${new Date().toISOString().slice(0,10)}.xlsx`);
  alert('Excel exported! 5 sheets: Sales, Products, Customers, Expenses, ProfitLoss.');
}

// ---------- QUICKBOOKS EXPORT ----------
function exportQuickBooks(){
  // QuickBooks Online accepts CSV: Date, Type, Num, Customer, Item, Qty, Price, Total
  // We export sales as Invoices + customers
  let rows = [['Date','Type','Num','Customer','Item','Qty','Unit Price','Amount','Payment Method']];
  DB.sales.filter(s => s.payMethod !== 'Debt Payment').forEach(s => {
    (s.items||[]).forEach(it => {
      rows.push([
        new Date(s.date).toLocaleDateString(),
        'Invoice',
        s.no,
        s.customer,
        `${it.name} - ${it.variantName||''}`,
        it.qty,
        it.price,
        Number(it.price)*Number(it.qty),
        s.payMethod
      ]);
    });
  });
  let csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  downloadFile(`VendoraPRO_QuickBooks_${new Date().toISOString().slice(0,10)}.csv`, csv, 'text/csv');
  alert('QuickBooks CSV exported! In QuickBooks: Gear → Import Data → Invoices → Upload this CSV.');
        }
