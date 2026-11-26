// ============================================
// VENDORA PRO - products.js
// Products + Variants - Add / Edit / Delete
// Depends on: app.js (DB, saveDB, fmt, money, uid)
// ============================================

let editingProductId = null;
let variantRowCount = 0;

// ---------- MODAL ----------
function openProductModal(productId = null){
  editingProductId = productId;
  let modal = document.getElementById('prodModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  document.getElementById('variantRows').innerHTML = '';
  variantRowCount = 0;

  if(productId){
    let p = DB.products.find(x => x.id === productId);
    if(!p) return;
    document.getElementById('pName').value = p.name;
    document.getElementById('pCat').value = p.category || '';
    (p.variants || []).forEach(v => addVariantRow(v));
  } else {
    document.getElementById('pName').value = '';
    document.getElementById('pCat').value = '';
    addVariantRow(); // Start with 1 empty variant
  }
}

function closeProductModal(){
  let modal = document.getElementById('prodModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  editingProductId = null;
}

// ---------- VARIANT ROWS ----------
function addVariantRow(existing = null){
  variantRowCount++;
  let container = document.getElementById('variantRows');
  let div = document.createElement('div');
  div.className = 'variant-row bg-slate-50 p-3 rounded-xl grid grid-cols-2 gap-2 relative';
  div.innerHTML = `
    <input class="v-name border p-2 rounded-lg text-xs col-span-2" placeholder="Variant e.g. 500ml, 1L, Red, Size 42" value="${existing ? existing.name : ''}">
    <input class="v-price border p-2 rounded-lg text-xs" type="number" placeholder="Selling Price" value="${existing ? existing.price : ''}">
    <input class="v-cost border p-2 rounded-lg text-xs" type="number" placeholder="Cost Price (for profit)" value="${existing ? (existing.cost||'') : ''}">
    <input class="v-barcode border p-2 rounded-lg text-xs" placeholder="Barcode (optional)" value="${existing ? (existing.barcode||'') : ''}">
    <input class="v-stock border p-2 rounded-lg text-xs" type="number" placeholder="Opening Stock" value="${existing ? existing.stock : ''}">
    <input class="v-low border p-2 rounded-lg text-xs" type="number" placeholder="Low Alert e.g. 5" value="${existing ? (existing.lowAlert||5) : 5}">
    <button onclick="this.parentElement.remove()" class="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full text-xs font-bold">×</button>
  `;
  container.appendChild(div);
}

// ---------- SAVE ----------
function saveProduct(){
  let name = document.getElementById('pName').value.trim();
  let cat = document.getElementById('pCat').value.trim() || 'General';
  if(!name){ alert('Please enter Product Name'); return; }

  let rows = document.querySelectorAll('.variant-row');
  if(rows.length === 0){ alert('Add at least 1 variant'); return; }

  let variants = [];
  let ok = true;
  rows.forEach(r => {
    let vName = r.querySelector('.v-name').value.trim();
    let price = Number(r.querySelector('.v-price').value || 0);
    let cost = Number(r.querySelector('.v-cost').value || 0);
    let barcode = r.querySelector('.v-barcode').value.trim();
    let stock = Number(r.querySelector('.v-stock').value || 0);
    let low = Number(r.querySelector('.v-low').value || 5);
    if(!vName || price <= 0){ ok = false; }
    variants.push({ id: uid(), name: vName, price, cost, barcode, stock, lowAlert: low });
  });
  if(!ok){ alert('Each variant needs a Name and Price > 0'); return; }

  if(editingProductId){
    let p = DB.products.find(x => x.id === editingProductId);
    if(p){
      // Keep old variant IDs + stock if name matches, to preserve history
      // Simple: replace variants but keep stock if same name existed
      p.name = name;
      p.category = cat;
      p.variants = variants;
    }
  } else {
    DB.products.push({ id: uid(), name, category: cat, variants });
  }

  saveDB();
  closeProductModal();
  renderProducts();
  renderDashboard();
  if(typeof renderPOSProducts === 'function') renderPOSProducts();
  if(typeof fillStockDropdowns === 'function') fillStockDropdowns();
}

// ---------- RENDER LIST ----------
function renderProducts(){
  let el = document.getElementById('productList');
  if(!el) return;
  let q = (document.getElementById('prodSearch')?.value || '').toLowerCase();
  let list = DB.products.filter(p => 
    p.name.toLowerCase().includes(q) || 
    (p.category||'').toLowerCase().includes(q) ||
    (p.variants||[]).some(v => (v.name||'').toLowerCase().includes(q) || (v.barcode||'').includes(q))
  );

  if(list.length === 0){
    el.innerHTML = '<p class="text-slate-400 text-sm bg-white p-4 rounded-2xl">No products found. Click "+ Add Product" to add your first product.</p>';
    return;
  }

  el.innerHTML = list.map(p => `
    <div class="bg-white p-4 rounded-2xl shadow-sm">
      <div class="flex justify-between items-start">
        <div>
          <b class="text-sm">${p.name}</b>
          <span class="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full ml-2">${p.category}</span>
          <p class="text-[11px] text-slate-400">${p.variants.length} variant(s)</p>
        </div>
        <div class="flex gap-1">
          <button onclick="openProductModal('${p.id}')" class="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-lg text-xs font-bold">Edit</button>
          <button onclick="deleteProduct('${p.id}')" class="bg-red-100 text-red-600 px-3 py-1 rounded-lg text-xs font-bold">Delete</button>
        </div>
      </div>
      <div class="grid md:grid-cols-3 gap-2 mt-3">
        ${(p.variants||[]).map(v => `
          <div class="border rounded-xl p-2 text-xs ${Number(v.stock||0) <= Number(v.lowAlert||5) ? 'border-red-300 bg-red-50' : 'bg-slate-50'}">
            <div class="flex justify-between"><b>${v.name}</b><span>${money(v.price)}</span></div>
            <div class="flex justify-between text-slate-500 mt-1"><span>Cost: ${money(v.cost||0)}</span><span>Stock: <b class="${Number(v.stock||0) <= Number(v.lowAlert||5) ? 'text-red-600' : ''}">${v.stock}</b></span></div>
            <div class="text-slate-400">Barcode: ${v.barcode || '—'} • Profit: ${money((v.price||0)-(v.cost||0))}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

function deleteProduct(id){
  if(!confirm('Delete this product and all its variants?')) return;
  DB.products = DB.products.filter(p => p.id !== id);
  saveDB();
  renderProducts();
  renderDashboard();
  if(typeof renderPOSProducts === 'function') renderPOSProducts();
  if(typeof fillStockDropdowns === 'function') fillStockDropdowns();
}

// ---------- FIND VARIANT (used by POS + Stock) ----------
function findVariant(productId, variantId){
  let p = DB.products.find(x => x.id === productId);
  if(!p) return null;
  let v = (p.variants||[]).find(x => x.id === variantId);
  return v ? { product: p, variant: v } : null;
      }
