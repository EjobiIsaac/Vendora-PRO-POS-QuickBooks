// ============================================
// VENDORA PRO - stock.js
// Stock Management - Per Variant
// Depends on: app.js (DB, saveDB, fmt, money, uid, findVariant)
// ============================================

function fillStockDropdowns(){
  let prodSel = document.getElementById('stockProd');
  let varSel = document.getElementById('stockVariant');
  if(!prodSel || !varSel) return;

  prodSel.innerHTML = DB.products.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  if(DB.products.length === 0){
    varSel.innerHTML = '<option value="">No products yet</option>';
    return;
  }
  fillStockVariants();
}

function fillStockVariants(){
  let prodSel = document.getElementById('stockProd');
  let varSel = document.getElementById('stockVariant');
  if(!prodSel || !varSel) return;
  let p = DB.products.find(x => x.id === prodSel.value);
  if(!p){
    varSel.innerHTML = '';
    return;
  }
  varSel.innerHTML = (p.variants||[]).map(v => `<option value="${v.id}">${v.name} - Stock: ${v.stock} - ${money(v.price)}</option>`).join('');
}

// When product changes in dropdown, update variants
document.addEventListener('change', (e)=>{
  if(e.target && e.target.id === 'stockProd'){ fillStockVariants(); }
});

function adjustStock(){
  let prodId = document.getElementById('stockProd')?.value;
  let varId = document.getElementById('stockVariant')?.value;
  let qty = Number(document.getElementById('stockQty')?.value || 0);

  if(!prodId || !varId){ alert('Select Product and Variant first'); return; }
  if(qty === 0){ alert('Enter Qty. Use negative number to remove e.g. -5'); return; }

  let found = findVariant(prodId, varId);
  if(!found){ alert('Variant not found'); return; }

  let newStock = Number(found.variant.stock||0) + qty;
  if(newStock < 0){
    if(!confirm('This will make stock negative (' + newStock + '). Continue?')) return;
  }

  found.variant.stock = newStock;
  saveDB();
  document.getElementById('stockQty').value = '';
  renderStock();
  fillStockVariants();
  if(typeof renderPOSProducts === 'function') renderPOSProducts();
  if(typeof renderDashboard === 'function') renderDashboard();
  alert(found.product.name + ' - ' + found.variant.name + ' stock updated to ' + newStock);
}

function renderStock(){
  let el = document.getElementById('stockList');
  if(!el) return;
  fillStockDropdowns();

  if(DB.products.length === 0){
    el.innerHTML = '<p class="text-slate-400">No products yet. Add products first.</p>';
    return;
  }

  let html = '';
  DB.products.forEach(p => {
    html += `<div class="mb-4"><b class="text-sm">${p.name}</b> <span class="text-[10px] text-slate-400">${p.category||''}</span><div class="mt-1 space-y-1">`;
    (p.variants||[]).forEach(v => {
      let low = Number(v.stock||0) <= Number(v.lowAlert||5);
      let val = Number(v.stock||0) * Number(v.price||0);
      html += `
        <div class="flex justify-between items-center p-2 rounded-lg ${low ? 'bg-red-50 border border-red-200' : 'bg-slate-50'}">
          <span>${v.name} ${v.barcode ? `<span class="text-slate-400">(${v.barcode})</span>` : ''}</span>
          <span class="flex gap-3 items-center">
            <span>Price: ${money(v.price)}</span>
            <span>Stock: <b class="${low ? 'text-red-600' : ''}">${v.stock}</b></span>
            <span class="text-slate-500">Value: ${money(val)}</span>
            ${low ? '<span class="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full">LOW</span>' : ''}
            <button onclick="quickStock('${p.id}','${v.id}',1)" class="bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-bold">+1</button>
            <button onclick="quickStock('${p.id}','${v.id}',-1)" class="bg-red-100 text-red-600 px-2 py-1 rounded font-bold">-1</button>
          </span>
        </div>`;
    });
    html += `</div></div>`;
  });
  el.innerHTML = html;
}

function quickStock(prodId, varId, delta){
  let found = findVariant(prodId, varId);
  if(!found) return;
  let newStock = Number(found.variant.stock||0) + delta;
  if(newStock < 0){ alert('Stock cannot go below 0'); return; }
  found.variant.stock = newStock;
  saveDB();
  renderStock();
  if(typeof renderPOSProducts === 'function') renderPOSProducts();
  if(typeof renderDashboard === 'function') renderDashboard();
    }
