// ============================================
// VENDORA PRO - FILE 6: js/pos.js
// POS - Search, Variant Picker, Cart, Checkout
// ============================================

function renderPOSProducts() {
  let q = ($('posSearch').value || '').toLowerCase();
  let html = '';
  DB.products.forEach(p => {
    p.variants.forEach(v => {
      if(q && !(p.name.toLowerCase().includes(q) || v.label.toLowerCase().includes(q) || String(v.barcode).toLowerCase().includes(q))) return;
      html += `<div class="bg-white p-3 rounded-2xl shadow-sm cursor-pointer hover:ring-2 ring-indigo-500" onclick="openVariantPicker(${p.id})"><p class="font-bold text-sm">${p.name}</p><p class="text-[11px] text-slate-500">${v.label} • ${v.barcode}</p><p class="text-indigo-600 font-black mt-1">${fmt(v.price)}</p><p class="text-[11px] ${v.stock<=5?'text-red-500 font-bold':'text-slate-400'}">Stock: ${v.stock}</p></div>`;
    });
  });
  $('posProducts').innerHTML = html || '<p class="text-slate-400 col-span-3 p-4">No products found. Add product with variants.</p>';
}

function openVariantPicker(pid) {
  let p = DB.products.find(x => x.id == pid);
  $('varModalTitle').innerText = p.name + ' - Choose Variant';
  $('varOptions').innerHTML = p.variants.map(v => `<button onclick="addToCart(${p.id},${v.id});closeVarModal()" class="w-full flex justify-between items-center border p-3 rounded-xl hover:bg-indigo-50"><span class="text-left"><b class="text-sm">${v.label}</b><br><span class="text-[11px] text-slate-500">Barcode: ${v.barcode} • Stock: ${v.stock}</span></span><b class="text-indigo-600">${fmt(v.price)}</b></button>`).join('');
  $('varModal').classList.remove('hidden'); $('varModal').classList.add('flex');
}
function closeVarModal() { $('varModal').classList.add('hidden'); $('varModal').classList.remove('flex'); }

function addToCart(pid, vid) {
  let p = DB.products.find(x => x.id == pid);
  let v = p.variants.find(x => x.id == vid);
  if(v.stock <= 0){ alert('Out of stock: ' + p.name + ' - ' + v.label); return; }
  let ex = cart.find(c => c.pid == pid && c.vid == vid);
  if(ex) ex.qty++; else cart.push({pid, vid, name: p.name + ' - ' + v.label, price: v.price, cost: v.cost, qty: 1});
  renderCart();
}

function renderCart() {
  let sub = cart.reduce((a,c) => a + c.price * c.qty, 0);
  let disc = Number($('cartDisc').value || 0);
  let vat = Math.max(0, (sub - disc)) * (DB.settings.vat || 18) / 100;
  let total = sub - disc + vat;
  $('cartSub').innerText = fmt(sub);
  $('cartVat').innerText = fmt(vat);
  $('cartTotal').innerText = fmt(total);
  let paid = Number($('amountPaid').value || 0);
  $('changeAmt').innerText = fmt(Math.max(0, paid - total));
  $('cartList').innerHTML = cart.map((c,i) => `<div class="flex justify-between items-center bg-slate-50 p-2 rounded-lg"><div><p class="text-xs font-bold">${c.name}</p><p class="text-[11px]">${fmt(c.price)} x ${c.qty}</p></div><div class="flex items-center gap-1"><button onclick="cart[${i}].qty--;if(cart[${i}].qty<=0)cart.splice(${i},1);renderCart()" class="w-6 h-6 bg-white border rounded">-</button><b class="text-xs">${c.qty}</b><button onclick="cart[${i}].qty++;renderCart()" class="w-6 h-6 bg-white border rounded">+</button><button onclick="cart.splice(${i},1);renderCart()" class="text-red-500 text-xs ml-1">✕</button></div></div>`).join('') || '<p class="text-xs text-slate-400 text-center py-4">Cart empty - Click product to add</p>';
}

function setPay(m) {
  payMethod = m;
  document.querySelectorAll('.pay-btn').forEach(b => b.className = 'pay-btn bg-slate-200 py-2 rounded-lg text-xs font-bold');
  let el = $('pay' + m.replace(' ',''));
  if(el) el.className = 'pay-btn bg-indigo-600 text-white py-2 rounded-lg text-xs font-bold';
}
function clearCart() { cart = []; $('cartDisc').value = 0; $('amountPaid').value = ''; renderCart(); }

function checkout() {
  if(!cart.length){ alert('Cart empty'); return; }
  let sub = cart.reduce((a,c) => a + c.price * c.qty, 0);
  let disc = Number($('cartDisc').value || 0);
  let vat = Math.max(0, (sub - disc)) * (DB.settings.vat || 18) / 100;
  let total = sub - disc + vat;
  let profit = cart.reduce((a,c) => a + (c.price - c.cost) * c.qty, 0) - disc;
  for(let c of cart){
    let p = DB.products.find(x => x.id == c.pid);
    let v = p.variants.find(x => x.id == c.vid);
    if(v.stock < c.qty){ alert('Not enough stock for ' + c.name); return; }
    v.stock -= c.qty;
  }
  let custId = Number($('posCustomer').value);
  let sale = {id: DB.sales.length + 1, date: new Date().toISOString(), items: [...cart], subtotal: sub, discount: disc, vat, total, profit, pay: payMethod, customer: custId};
  DB.sales.push(sale);
  DB.ledger.push({date: sale.date, type: 'Income - Sale', desc: `Sale #${sale.id} - ${payMethod} - ${cart.length} items`, amount: total});
  if(payMethod == 'Credit'){
    let cust = DB.customers.find(c => c.id == custId);
    if(cust) cust.balance += total;
  }
  save();
  let receipt = `${DB.settings.biz}\n${DB.settings.phone}\nSale #${sale.id} - ${new Date().toLocaleString()}\n----------------\n` + cart.map(c => `${c.name}\n ${c.qty} x ${fmt(c.price)} = ${fmt(c.qty*c.price)}`).join('\n') + `\n----------------\nSub: ${fmt(sub)} Disc: ${fmt(disc)} VAT: ${fmt(vat)}\nTOTAL: ${fmt(total)} Paid: ${payMethod}\nThank you! Vendora PRO`;
  alert(receipt);
  if(confirm('Print receipt?')){
    let w = window.open('','_blank'); w.document.write(`<pre style="font-family:monospace">${receipt}</pre>`); w.print();
  }
  clearCart(); showPage('pos');
}

// Change calculation live
if($('amountPaid')) $('amountPaid').addEventListener('input', renderCart);
