// ============================================
// VENDORA PRO - seed.js
// Sample Data - Runs ONLY on first run when DB is empty
// Depends on: app.js (DB, saveDB)
// ============================================

function seedData(){
  // If already has data, do nothing
  if(DB.products.length > 0 || DB.sales.length > 0) return;

  // --- SETTINGS ---
  DB.settings = {
    bizName: 'Demo Shop',
    bizPhone: '0770 000 000',
    currency: 'UGX',
    vatRate: 18
  };

  // --- PRODUCTS (with Variants) ---
  DB.products = [
    {
      id: 'seed_p1',
      name: 'Coca-Cola',
      category: 'Drinks',
      variants: [
        { id: 'seed_v1', name: '300ml Bottle', price: 2000, cost: 1300, barcode: 'COKE300', stock: 48, lowAlert: 10 },
        { id: 'seed_v2', name: '500ml Bottle', price: 3000, cost: 2000, barcode: 'COKE500', stock: 36, lowAlert: 10 },
        { id: 'seed_v3', name: '1L Bottle', price: 5000, cost: 3400, barcode: 'COKE1000', stock: 12, lowAlert: 5 }
      ]
    },
    {
      id: 'seed_p2',
      name: 'Bread',
      category: 'Bakery',
      variants: [
        { id: 'seed_v4', name: 'White Bread', price: 5000, cost: 3500, barcode: 'BREAD-W', stock: 20, lowAlert: 5 },
        { id: 'seed_v5', name: 'Brown Bread', price: 6000, cost: 4200, barcode: 'BREAD-B', stock: 8, lowAlert: 5 }
      ]
    },
    {
      id: 'seed_p3',
      name: 'Cooking Oil',
      category: 'Groceries',
      variants: [
        { id: 'seed_v6', name: '1L', price: 12000, cost: 9500, barcode: 'OIL1L', stock: 15, lowAlert: 3 },
        { id: 'seed_v7', name: '3L', price: 32000, cost: 26000, barcode: 'OIL3L', stock: 6, lowAlert: 2 }
      ]
    },
    {
      id: 'seed_p4',
      name: 'Sugar',
      category: 'Groceries',
      variants: [
        { id: 'seed_v8', name: '1kg', price: 6000, cost: 4800, barcode: 'SUGAR1', stock: 25, lowAlert: 5 },
        { id: 'seed_v9', name: '2kg', price: 11500, cost: 9200, barcode: 'SUGAR2', stock: 10, lowAlert: 3 }
      ]
    },
    {
      id: 'seed_p5',
      name: 'Airtime',
      category: 'Services',
      variants: [
        { id: 'seed_v10', name: 'MTN 5000', price: 5000, cost: 4850, barcode: 'MTN5000', stock: 100, lowAlert: 10 },
        { id: 'seed_v11', name: 'Airtel 10000', price: 10000, cost: 9700, barcode: 'AIR10000', stock: 50, lowAlert: 5 }
      ]
    }
  ];

  // --- CUSTOMERS ---
  DB.customers = [
    { id: 'seed_c1', name: 'Mama Naki', phone: '0771 111 111', balance: 0 },
    { id: 'seed_c2', name: 'John Kafeero', phone: '0700 222 222', balance: 0 }
  ];

  // --- EXPENSES (example) ---
  DB.expenses = [
    { id: 'seed_e1', title: 'Shop Rent - This Month', amount: 300000, category: 'Rent', date: new Date().toISOString() },
    { id: 'seed_e2', title: 'Transport - Stock Pickup', amount: 20000, category: 'Transport', date: new Date().toISOString() }
  ];

  // --- SALES (example - so dashboard is not empty) ---
  DB.sales = [
    {
      id: 'seed_s1',
      no: 'INV-0001',
      date: new Date().toISOString(),
      customer: 'Walk-in',
      customerId: null,
      items: [
        { productId: 'seed_p1', variantId: 'seed_v2', name: 'Coca-Cola', variantName: '500ml Bottle', price: 3000, cost: 2000, qty: 2 },
        { productId: 'seed_p2', variantId: 'seed_v4', name: 'Bread', variantName: 'White Bread', price: 5000, cost: 3500, qty: 1 }
      ],
      subtotal: 11000, discount: 0, vat: 1980, total: 12980,
      payMethod: 'Cash', amountPaid: 13000, change: 20, balance: 0
    }
  ];

  // Save
  localStorage.setItem('vendora_products', JSON.stringify(DB.products));
  localStorage.setItem('vendora_sales', JSON.stringify(DB.sales));
  localStorage.setItem('vendora_customers', JSON.stringify(DB.customers));
  localStorage.setItem('vendora_expenses', JSON.stringify(DB.expenses));
  localStorage.setItem('vendora_settings', JSON.stringify(DB.settings));

  console.log('VendoraPRO seed data loaded');
}

function clearSeedData(){
  // For testing: wipe everything and reload fresh
  // Call from browser console: clearSeedData()
  if(!confirm('Delete ALL data and reload demo data?')) return;
  localStorage.clear();
  location.reload();
    }
