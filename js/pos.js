// ============================================
// VENDORA PRO - pos.js
// POS - Search, Cart, Checkout, Receipt Print
// Depends on: app.js (DB, saveDB, fmt, money, uid, genSaleNo)
// ============================================

function setPay(method){
  payMethod = method;
  // Update button styles
  document.querySelectorAll('.pay-btn').forEach(b => {
    b.classList.remove('bg-indigo-600','text-white');
    b.classList.add('bg-slate-200');
  });
  let map = { 'Cash':'payCash', 'Mobile Money':'payMobileMoney', 'Card':'payCard' };
  let id = map[method];
  if(id){
    let btn = document.getElementById(id);
    if(btn){ btn.classList.add('bg-indigo-600','text-white'); btn.classList.remove('bg-slate-200'); }
  }
  renderCart();
}

// ---------- PRODUCT GRID ----------
function renderPOSProducts(){
  let el = document.getElementById('posProducts');
  if(!el) return;
  let q = (document.getElementById('posSearch')?.value || '').toLowerCase().trim();

  let cards = [];
  DB.products.forEach(p => {
    (p.variants||[]).forEach(v => {
      let hay = (p.name + ' ' + v.name + ' ' + (v.barcode||'') + ' ' + (p.category||'')).toLowerCase();
      if(q && !hay.includes(q)) return;
      cards.push({ p, v });
    });
  });

  if(cards.length === 0){
    el.innerHTML = '<p class="col-span-full text-slate-400 text-sm bg-white p-4 rounded-2xl">No products found. Add products first in Products page.</p>';
    return;
  }

  el.innerHTML = cards.map(({p,v}) => {
    let out = Number(v.stock||0) <= 0;
    return `
    <div onclick="addToCart('${p.id}','${v.id}')" class="bg-white p-3 rounded-2xl shadow-sm cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition ${out ? 'opacity-60' : ''}">
      <p class="font-bold text-sm leading-tight">${p.name}</p>
      <p class="text-[11px] text-slate-500">${v.name} • ${p.category||''}</p>
      <div class="flex justify-between items-center mt-2">
        <b class="text-indigo-600">${money(v.price)}</b>
        <span class="text-[10px] px-2 py-0.5 rounded-full ${Number(v.stock||0) <= Number(v.lowAlert||5) ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}">Stock: ${v.stock}</span>
      </div>
      ${out ? '<p class="text-[10px] text-red-600 font-bold mt-1">OUT OF STOCK</p>' : ''}
      ${v.barcode ? `<p class="text-[10px] text-slate-400">Barcode: ${v.barcode}</p>` : ''}
    </div>`;
  }).join('');
}

// ---------- CART ----------
function addToCart(productId, variantId){
  let found = findVariant(productId, variantId);
  if(!found){ alert('Product not found'); return; }
  let { product, variant } = found;
  if(Number(variant.stock||0) <= 0){ alert(product.name + ' - ' + variant.name + ' is OUT OF STOCK'); return; }

  let existing = cart.find(c => c.productId === productId && c.variantId === variantId);
  if(existing){
    if(existing.qty + 1 > Number(variant.stock||0)){ alert('Not enough stock. Only ' + variant.stock + ' left.'); return; }
    existing.qty++;
  } else {
    cart.push({
      productId, variantId,
      name: product.name,
      variantName: variant.name,
      price: Number(variant.price||0),
      cost: Number(variant.cost||0),
      qty: 1
    });
  }
  renderCart();
}

function changeQty(index, delta){
  let item = cart[index];
  if(!item) return;
  let found = findVariant(item.productId, item.variantId);
  let max = found ? Number(found.variant.stock||0) : 999;
  let newQty = item.qty + delta;
  if(newQty <= 0){ cart.splice(index,1); }
  else if(newQty > max){ alert('Only ' + max + ' in stock'); return; }
  else item.qty = newQty;
  renderCart();
}

function removeFromCart(index){
  cart.splice(index,1);
  renderCart();
}

function clearCart(){
  cart = [];
  document.getElementById('amountPaid').value = '';
  document.getElementById('cartDisc').value = 0;
  renderCart();
}

function cartTotals(){
  let sub = cart.reduce((a,c)=>a + c.price*c.qty, 0);
  let disc = Number(document.getElementById('cartDisc')?.value || 0);
  if(disc < 0) disc = 0;
  if(disc > sub) disc = sub;
  let vatRate = Number(DB.settings.vatRate || 18);
  let taxable = sub - disc;
  let vat = Math.round(taxable * vatRate / 100);
  let total = taxable + vat;
  return { sub, disc, vat, total, vatRate };
}

function renderCart(){
  let listEl = document.getElementById('cartList');
  if(!listEl) return;

  if(cart.length === 0){
    listEl.innerHTML = '<p class="text-slate-400 text-xs text-center py-4">Cart is empty.<br>Click a product to add.</p>';
  } else {
    listEl.innerHTML = cart.map((c,i) => `
      <div class="flex justify-between items-center bg-slate-50 p-2 rounded-lg text-xs">
        <div class="flex-1"><b>${c.name}</b> <span class="text-slate-500">- ${c.variantName}</span><br><span class="text-slate-500">${money(c.price)} each</span></div>
        <div class="flex items-center gap-1">
          <button onclick="changeQty(${i},-1)" class="w-6 h-6 bg-white border rounded font-bold">-</button>
          <b class="w-5 text-center">${c.qty}</b>
          <button onclick="changeQty(${i},1)" class="w-6 h-6 bg-white border rounded font-bold">+</button>
        </div>
        <b class="w-20 text-right">${money(c.price*c.qty)}</b>
        <button onclick="removeFromCart(${i})" class="text-red-500 font-bold ml-1">×</button>
      </div>
    `).join('');
  }

  let t = cartTotals();
  document.getElementById('cartSub').innerText = money(t.sub);
  document.getElementById('cartVat').innerText = money(t.vat);
  document.getElementById('cartTotal').innerText = money(t.total);
  let vl = document.getElementById('vatLabel'); if(vl) vl.innerText = t.vatRate;

  // Change
  let paid = Number(document.getElementById('amountPaid')?.value || 0);
  let change = paid - t.total;
  let chEl = document.getElementById('changeAmt');
  if(chEl) chEl.innerText = money(change > 0 ? change : 0);

  // Sale No
  let sn = document.getElementById('saleNo'); if(sn) sn.innerText = genSaleNo();
}

// Update change live when typing amount paid
document.addEventListener('input', (e)=>{
  if(e.target && e.target.id === 'amountPaid'){ renderCart(); }
});

// ---------- CHECKOUT ----------
function checkout(){
  if(cart.length === 0){ alert('Cart is empty'); return; }
  let t = cartTotals();
  let custSelect = document.getElementById('posCustomer');
  let custId = custSelect ? custSelect.value : '';
  let custName = 'Walk-in';
  let customer = null;
  if(custId && custId !== 'walkin'){
    customer = DB.customers.find(c => c.id === custId);
    if(customer) custName = customer.name;
  }
  let paid = Number(document.getElementById('amountPaid')?.value || 0);

  // Credit / Debt logic
  if(payMethod === 'Credit'){
    if(!customer){ alert('For Credit, you MUST select a customer first.'); return; }
    // Credit = customer owes full total, paid = 0 for now
    paid = 0;
  } else {
    if(paid < t.total){
      if(!confirm('Amount Paid (' + money(paid) + ') is less than Total (' + money(t.total) + '). Continue as partial payment?')){
        return;
      }
    }
  }

  let sale = {
    id: uid(),
    no: genSaleNo(),
    date: new Date().toISOString(),
    customer: custName,
    customerId: customer ? customer.id : null,
    items: cart.map(c => ({ ...c })),
    subtotal: t.sub,
    discount: t.disc,
    vat: t.vat,
    total: t.total,
    payMethod,
    amountPaid: payMethod === 'Credit' ? 0 : paid,
    change: payMethod === 'Credit' ? 0 : Math.max(0, paid - t.total),
    balance: payMethod === 'Credit' ? t.total : Math.max(0, t.total - paid)
  };

  // 1. Reduce stock
  cart.forEach(c => {
    let f = findVariant(c.productId, c.variantId);
    if(f) f.variant.stock = Number(f.variant.stock||0) - c.qty;
  });

  // 2. If Credit or partial, add to customer balance (debt)
  if(sale.balance > 0 && customer){
    customer.balance = Number(customer.balance||0) + sale.balance;
  }

  // 3. Save sale
  DB.sales.push(sale);
  saveDB();

  // 4. Print receipt
  printReceipt(sale);

  // 5. Reset
  clearCart();
  renderDashboard();
  if(typeof renderPOSProducts === 'function') renderPOSProducts();
  if(typeof fillCustomerDropdown === 'function') fillCustomerDropdown();
  alert('Sale ' + sale.no + ' completed! Total: ' + money(sale.total));
}

// ---------- RECEIPT ----------
function printReceipt(sale){
  let w = window.open('', '_blank', 'width=320,height=600');
  if(!w) return;
  let itemsHtml = sale.items.map(it => `
    <div style="display:flex;justify-content:space-between;font-size:12px;">
      <span>${it.name} - ${it.variantName} x${it.qty}</span><span>${fmt(it.price*it.qty)}</span>
    </div>
  `).join('');
  w.document.write(`
    <html><head><title>Receipt ${sale.no}</title><style>body{font-family:monospace;padding:10px} .c{text-align:center} hr{border-top:1px dashed #000}</style></head>
    <body>
      <div class="c"><b>${DB.settings.bizName}</b><br>${DB.settings.bizPhone||''}<br>Receipt: ${sale.no}</div><hr>
      <div style="font-size:12px;">Date: ${new Date(sale.date).toLocaleString()}<br>Customer: ${sale.customer}<br>Payment: ${sale.payMethod}</div><hr>
      ${itemsHtml}<hr>
      <div style="font-size:12px;display:flex;justify-content:space-between;"><span>Subtotal</span><span>${fmt(sale.subtotal)}</span></div>
      <div style="font-size:12px;display:flex;justify-content:space-between;"><span>Discount</span><span>${fmt(sale.discount)}</span></div>
      <div style="font-size:12px;display:flex;justify-content:space-between;"><span>VAT (${DB.settings.vatRate}%)</span><span>${fmt(sale.vat)}</span></div>
      <div style="font-size:14px;display:flex;justify-content:space-between;"><b>TOTAL</b><b>${fmt(sale.total)}</b></div>
      <div style="font-size:12px;display:flex;justify-content:space-between;"><span>Paid</span><span>${fmt(sale.amountPaid)}</span></div>
      <div style="font-size:12px;display:flex;justify-content:space-between;"><span>Change</span><span>${fmt(sale.change)}</span></div>
      ${sale.balance>0 ? `<div style="font-size:12px;color:red;">Balance Owed: ${fmt(sale.balance)}</div>` : ''}
      <hr><div class="c" style="font-size:11px;">Thank you! Come again.<br>Powered by Vendora PRO</div>
      <script>window.print(); setTimeout(()=>window.close(), 500);<\/script>
    </body></html>
  `);
  w.document.close();
}
