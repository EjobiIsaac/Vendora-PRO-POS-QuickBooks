// ============================================
// VENDORA PRO - FILE 5: js/products.js
// Products + VARIANTS - Add, Edit, Delete
// ============================================

function addVariantRow() {
  $('variantRows').innerHTML += `<div class="variant-row grid grid-cols-2 md:grid-cols-4 gap-1 bg-slate-50 p-2 rounded-lg"><input placeholder="Variant e.g. 500ml / Size 42" class="v-label border p-2 rounded text-xs"><input placeholder="Barcode / SKU" class="v-barcode border p-2 rounded text-xs"><input type="number" placeholder="Price" class="v-price border p-2 rounded text-xs"><input type="number" placeholder="Cost" class="v-cost border p-2 rounded text-xs"><input type="number" placeholder="Stock Qty" class="v-stock border p-2 rounded text-xs col-span-2"><button onclick="this.parentElement.remove()" class="bg-red-100 text-red-600 rounded text-xs">Remove</button></div>`;
}

function openProductModal() {
  editingId = null;
  $('pName').value = ''; $('pCat').value = '';
  $('variantRows').innerHTML = '';
  addVariantRow(); addVariantRow();
  $('prodModal').classList.remove('hidden'); $('prodModal').classList.add('flex');
}
function closeProductModal() { $('prodModal').classList.add('hidden'); $('prodModal').classList.remove('flex'); }

function saveProduct() {
  let name = $('pName').value.trim();
  if(!name){ alert('Enter product name'); return; }
  let variants = [];
  document.querySelectorAll('.variant-row').forEach(r => {
    let label = r.querySelector('.v-label').value.trim() || 'Standard';
    let barcode = r.querySelector('.v-barcode').value.trim() || ('SKU' + Date.now());
    let price = Number(r.querySelector('.v-price').value || 0);
    let cost = Number(r.querySelector('.v-cost').value || 0);
    let stock = Number(r.querySelector('.v-stock').value || 0);
    variants.push({id: Date.now() + Math.floor(Math.random()*9999), label, barcode, price, cost, stock});
  });
  if(editingId){
    let p = DB.products.find(x => x.id == editingId);
    p.name = name; p.cat = $('pCat').value; p.variants = variants;
  } else {
    DB.products.push({id: Date.now(), name, cat: $('pCat').value || 'General', variants});
  }
  save(); closeProductModal();
}

function renderProducts() {
  let q = ($('prodSearch').value || '').toLowerCase();
  $('productList').innerHTML = DB.products.filter(p => p.name.toLowerCase().includes(q)).map(p => `<div class="bg-white p-4 rounded-2xl shadow-sm"><div class="flex justify-between"><div><b>${p.name}</b> <span class="text-[11px] bg-slate-100 px-2 py-0.5 rounded-full">${p.cat}</span></div><div class="flex gap-1"><button onclick="editProduct(${p.id})" class="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-[11px] font-bold">Edit</button><button onclick="if(confirm('Delete product?')){DB.products=DB.products.filter(x=>x.id!=${p.id});save()}" class="bg-red-100 text-red-600 px-2 py-1 rounded text-[11px] font-bold">Delete</button></div></div><div class="grid md:grid-cols-3 gap-2 mt-2">${p.variants.map(v => `<div class="border rounded-xl p-2 text-xs ${v.stock<=5?'border-red-300 bg-red-50':''}"><b>${v.label}</b><br>Barcode: ${v.barcode}<br>Price: ${fmt(v.price)} | Cost: ${fmt(v.cost)}<br>Stock: <b>${v.stock}</b> • Value: ${fmt(v.stock*v.cost)}</div>`).join('')}</div></div>`).join('') || '<p class="text-slate-400">No products</p>';
}

function editProduct(id) {
  let p = DB.products.find(x => x.id == id);
  editingId = id;
  $('pName').value = p.name; $('pCat').value = p.cat;
  $('variantRows').innerHTML = '';
  p.variants.forEach(v => {
    addVariantRow();
    let r = $('variantRows').lastElementChild;
    r.querySelector('.v-label').value = v.label;
    r.querySelector('.v-barcode').value = v.barcode;
    r.querySelector('.v-price').value = v.price;
    r.querySelector('.v-cost').value = v.cost;
    r.querySelector('.v-stock').value = v.stock;
  });
  $('prodModal').classList.remove('hidden'); $('prodModal').classList.add('flex');
}
