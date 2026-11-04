// Vendora PRO - Default seed data with VARIANTS
// THIS IS WHERE ITEM NAME, PRICE, STOCK LIVE!
const SEED_DATA = {
  products: [
    {id:1,name:'Coca-Cola',cat:'Drinks',variants:[
      {id:101,label:'300ml Bottle',barcode:'3001',price:2500,cost:1800,stock:48},
      {id:102,label:'500ml Bottle',barcode:'5001',price:3500,cost:2500,stock:36},
      {id:103,label:'1 Litre',barcode:'1001',price:5000,cost:3800,stock:24}
    ]},
    {id:2,name:'Running Shoes - Nike Air',cat:'Shoes',variants:[
      {id:201,label:'Size 40 - Black',barcode:'SH40',price:85000,cost:60000,stock:5},
      {id:202,label:'Size 41 - Black',barcode:'SH41',price:85000,cost:60000,stock:3},
      {id:203,label:'Size 42 - White',barcode:'SH42W',price:90000,cost:62000,stock:4}
    ]},
    {id:3,name:'Rice - Kiboko',cat:'Food',variants:[
      {id:301,label:'1kg Pack',barcode:'R1',price:6000,cost:4500,stock:20},
      {id:302,label:'5kg Pack',barcode:'R5',price:28000,cost:22000,stock:12},
      {id:303,label:'25kg Bag',barcode:'R25',price:125000,cost:100000,stock:6}
    ]}
  ],
  sales: [],
  customers: [{id:1,name:'Walk-in Customer',phone:'-',balance:0}],
  expenses: [],
  ledger: [],
  settings: {biz:'Vendora Demo Shop',phone:'0700 000 000',currency:'UGX',vat:18}
};
