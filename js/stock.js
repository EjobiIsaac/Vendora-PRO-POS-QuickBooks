// ============================================
// VENDORA PRO - FILE 7: js/stock.js
// Stock Management - Per Variant
// ============================================

function updateStockVariantSel() {
  let pid = Number($('stockProd').value);
  let p = DB.products.find(x => x.id == pid) || DB.products[0];
  if(p) $('stockVariant').innerHTML = p.variants.map(v => `<option value="${v.id}">${v.label} - Stock: ${v.stock}</option>`).join('');
}

if($('stockProd')) $('stockProd').addEventListener('change', updateStockVariantSel);

function adjustStock() {
  let pid = Number($('stockProd').value);
  let vid = Number($('stockVariant').value);
  let qty = Number($('stockQty').value);
  if(!qty){ alert('Enter qty. Use -5 to remove, +10 to add'); return; }
  let p = DB.products.find(x => x.id == pid);
  let v = p.variants.find(x => x.id == vid);
  v.stock += qty;
  DB.ledger.push({date: new Date().toISOString(), type: 'Stock Adjustment', desc: `${p.name} - ${v.label} : ${qty>0?'+':''}${qty}`, amount: 0});
  $('stockQty').value = '';
  save();
  alert('✅ Stock updated: ' + p.name + ' - ' + v.label + ' = ' + v.stock);
}

function renderStock() {
  let rows = '';
  DB.products.forEach(p => p.variants.forEach(v => {
    rows += `<tr class="border-b"><td class="py-2">${p.name}</td><td>${v.label}</td><td>${v.barcode}</td><td>${fmt(v.price)}</td><td class="${v.stock<=5?'text-red-600 font-bold':''}">${v.stock}</td><td>${fmt(v.stock*v.cost)}</td></tr>`;
  }));
  $('stockList').innerHTML = `<table class="w-full text-left"><thead><tr class="border-b font-bold"><th>Product</th><th>Variant</th><th>Barcode</th><th>Price</th><th>Stock</th><th>Value</th></tr></thead><tbody>${rows}</tbody></table>`;
    }
