// ============================================
// VENDORA PRO - FILE 10: js/backup.js
// BACKUP / RESTORE / QuickBooks Export / Excel
// Backup includes: Products, Variants, Stock,
// Sales, Customers, Expenses, Ledger, Settings
// ============================================

function backupAll() {
  let data = JSON.stringify(DB, null, 2);
  let blob = new Blob([data], {type: 'application/json'});
  let a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'vendora-backup-' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
  alert('✅ BACKUP Downloaded! Keep this file safe. It has ALL products, variants, sales, customers, expenses.');
}

function restoreAll(e) {
  let f = e.target.files[0];
  if(!f) return;
  let r = new FileReader();
  r.onload = () => {
    try {
      DB = JSON.parse(r.result);
      save();
      alert('✅ RESTORE Successful! All data brought back - Products, Variants, Sales, Customers.');
    } catch(err) { alert('❌ Invalid backup file. Use a Vendora backup .json file'); }
  };
  r.readAsText(f);
}

function exportQuickBooks() {
  let rows = [['Date','Invoice','Customer','Item','Variant','Qty','Price','Total','VAT','Payment']];
  DB.sales.forEach(s => {
    s.items.forEach(it => {
      rows.push([new Date(s.date).toLocaleDateString(), 'INV-' + s.id, s.customer, it.name, '', it.qty, it.price, it.qty * it.price, s.vat, s.pay]);
    });
  });
  let ws = XLSX.utils.aoa_to_sheet(rows);
  let wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'QuickBooks Import');
  XLSX.writeFile(wb, 'Vendora-QuickBooks-Export.xlsx');
}

function exportExcel() {
  let rows = [['Vendora PRO Report', DB.settings.biz],[],['Sales'],['ID','Date','Total','Profit','Payment']];
  DB.sales.forEach(s => rows.push([s.id, new Date(s.date).toLocaleString(), s.total, s.profit, s.pay]));
  rows.push([],['Products - Variants'],['Product','Variant','Barcode','Price','Stock']);
  DB.products.forEach(p => p.variants.forEach(v => rows.push([p.name, v.label, v.barcode, v.price, v.stock])));
  let ws = XLSX.utils.aoa_to_sheet(rows);
  let wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  XLSX.writeFile(wb, 'Vendora-Report.xlsx');
}

function printReport() { window.print(); }
