import { Product, Order, StockHistory, Transaction, Karyawan } from "./types";

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: "p-hana",
    sku: "GMS-CRM-0001",
    name: "Gamis Hana Crinkle Premium",
    category: "Gamis",
    normalPrice: 225000,
    promoPrice: 195000,
    imageUrl: "https://images.unsplash.com/photo-1608748010899-18f300247112?w=1200&auto=format&fit=crop&q=90",
    rackLocation: "GDG1-A-01-B-002",
    description: "Gamis Hana Crinkle Airflow dengan serat rapat, tidak menerawang, sangat adem dan flowy. Memiliki risleting depan (busui-friendly) dengan karet pergelangan tangan wudhu-friendly.",
    variants: [
      { sku: "GMS-CRM-S-0001", size: "S", color: "Cream", stock: 12, physicalStock: 15, availableStock: 12, reservedStock: 3, damagedStock: 0, transitStock: 0, qcHold: 0 },
      { sku: "GMS-CRM-M-0001", size: "M", color: "Cream", stock: 25, physicalStock: 30, availableStock: 25, reservedStock: 5, damagedStock: 1, transitStock: 0, qcHold: 0 },
      { sku: "GMS-CRM-L-0001", size: "L", color: "Cream", stock: 18, physicalStock: 20, availableStock: 18, reservedStock: 2, damagedStock: 0, transitStock: 0, qcHold: 0 },
      { sku: "GMS-CRM-XL-0001", size: "XL", color: "Cream", stock: 5, physicalStock: 8, availableStock: 5, reservedStock: 3, damagedStock: 0, transitStock: 0, qcHold: 1 },
      { sku: "GMS-CRM-XXL-0001", size: "XXL", color: "Cream", stock: 4, physicalStock: 4, availableStock: 4, reservedStock: 0, damagedStock: 0, transitStock: 0, qcHold: 0 },
      { sku: "GMS-CRM-JMB-0001", size: "Jumbo", color: "Cream", stock: 8, physicalStock: 10, availableStock: 8, reservedStock: 2, damagedStock: 0, transitStock: 1, qcHold: 0 },
      { sku: "GMS-CRM-AS-0001", size: "All Size", color: "Cream", stock: 35, physicalStock: 40, availableStock: 35, reservedStock: 5, damagedStock: 0, transitStock: 0, qcHold: 0 },
      { 
        sku: "GMS-CRM-OS-0001", 
        size: "One Size", 
        color: "Cream", 
        stock: 50, 
        physicalStock: 52, 
        availableStock: 50, 
        reservedStock: 2, 
        damagedStock: 0, 
        transitStock: 0, 
        qcHold: 0,
        lingkarDada: 110,
        lingkarPinggang: 95,
        lingkarPaha: 0
      }
    ]
  },
  {
    id: "p-olivia",
    sku: "CLN-WHT-0002",
    name: "Celana Kulot Linen Olivia Office",
    category: "Celana",
    normalPrice: 165000,
    promoPrice: 139000,
    imageUrl: "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=1200&auto=format&fit=crop&q=90",
    rackLocation: "GDG1-C-02-D-014",
    description: "Kulot Linen Olivia dengan potongan celana kerja lebar beraliran tinggi (high waist), memberikan impresi jenjang dan elegan untuk perkantoran maupun busana kasual harian.",
    variants: [
      { sku: "CLN-WHT-S-0002", size: "S", color: "Chalk White", stock: 15, physicalStock: 15, availableStock: 15, reservedStock: 0, damagedStock: 0, transitStock: 0, qcHold: 0 },
      { sku: "CLN-WHT-M-0002", size: "M", color: "Chalk White", stock: 8, physicalStock: 10, availableStock: 8, reservedStock: 2, damagedStock: 0, transitStock: 0, qcHold: 0 },
      { sku: "CLN-WHT-L-0002", size: "L", color: "Chalk White", stock: 22, physicalStock: 25, availableStock: 22, reservedStock: 3, damagedStock: 0, transitStock: 0, qcHold: 0 },
      { sku: "CLN-WHT-XL-0002", size: "XL", color: "Chalk White", stock: 4, physicalStock: 5, availableStock: 4, reservedStock: 1, damagedStock: 1, transitStock: 0, qcHold: 0 },
      { sku: "CLN-WHT-XXL-0002", size: "XXL", color: "Chalk White", stock: 2, physicalStock: 2, availableStock: 2, reservedStock: 0, damagedStock: 0, transitStock: 0, qcHold: 0 },
      { sku: "CLN-WHT-JMB-0002", size: "Jumbo", color: "Chalk White", stock: 1, physicalStock: 1, availableStock: 1, reservedStock: 0, damagedStock: 0, transitStock: 0, qcHold: 0 },
      { sku: "CLN-WHT-AS-0002", size: "All Size", color: "Chalk White", stock: 15, physicalStock: 18, availableStock: 15, reservedStock: 3, damagedStock: 0, transitStock: 0, qcHold: 0 },
      { 
        sku: "CLN-WHT-OS-0002", 
        size: "One Size", 
        color: "Chalk White", 
        stock: 20, 
        physicalStock: 20, 
        availableStock: 20, 
        reservedStock: 0, 
        damagedStock: 0, 
        transitStock: 0, 
        qcHold: 0,
        lingkarDada: 0,
        lingkarPinggang: 90,
        lingkarPaha: 65
      }
    ]
  },
  {
    id: "p-bianca",
    sku: "DRS-NVY-0003",
    name: "Dress Velvet Bianca Luxury Edition",
    category: "Dress",
    normalPrice: 350000,
    promoPrice: 295000,
    imageUrl: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=1200&auto=format&fit=crop&q=90",
    rackLocation: "GDG1-B-05-A-001",
    description: "Dress pesta super premium berbalut bahan sutra beludru (velvet silk) yang berkilau mewah. Dipersenjatai aksen mutiara jahit tangan di bagian dada dan pergelangan tangan balon.",
    variants: [
      { sku: "DRS-NVY-S-0003", size: "S", color: "Navy", stock: 6, physicalStock: 6, availableStock: 6, reservedStock: 0, damagedStock: 0, transitStock: 0, qcHold: 0 },
      { sku: "DRS-NVY-M-0003", size: "M", color: "Navy", stock: 18, physicalStock: 20, availableStock: 18, reservedStock: 2, damagedStock: 0, transitStock: 0, qcHold: 0 },
      { sku: "DRS-NVY-L-0003", size: "L", color: "Navy", stock: 14, physicalStock: 15, availableStock: 14, reservedStock: 1, damagedStock: 0, transitStock: 2, qcHold: 0 },
      { sku: "DRS-NVY-XL-0003", size: "XL", color: "Navy", stock: 2, physicalStock: 4, availableStock: 2, reservedStock: 2, damagedStock: 0, transitStock: 0, qcHold: 0 },
      { sku: "DRS-NVY-XXL-0003", size: "XXL", color: "Navy", stock: 0, physicalStock: 0, availableStock: 0, reservedStock: 0, damagedStock: 0, transitStock: 0, qcHold: 0 },
      { sku: "DRS-NVY-JMB-0003", size: "Jumbo", color: "Navy", stock: 3, physicalStock: 3, availableStock: 3, reservedStock: 0, damagedStock: 0, transitStock: 0, qcHold: 0 },
      { sku: "DRS-NVY-AS-0003", size: "All Size", color: "Navy", stock: 10, physicalStock: 11, availableStock: 10, reservedStock: 1, damagedStock: 0, transitStock: 0, qcHold: 0 },
      { 
        sku: "DRS-NVY-OS-0003", 
        size: "One Size", 
        color: "Navy", 
        stock: 25, 
        physicalStock: 25, 
        availableStock: 25, 
        reservedStock: 0, 
        damagedStock: 0, 
        transitStock: 0, 
        qcHold: 0,
        lingkarDada: 105,
        lingkarPinggang: 0,
        lingkarPaha: 0
      }
    ]
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: "ORD-1001",
    date: new Date(Date.now() - 4 * 3600000).toISOString(), // 4 jam lalu
    customerName: "Siti Rahmawati",
    customerPhone: "081298765432",
    items: [
      { productSku: "GMS-CRM-0001", productName: "Gamis Hana Crinkle Premium", qty: 2, price: 195000, size: "M", color: "Cream" }
    ],
    total: 390000,
    status: "Proses",
    platform: "Shopee",
    trackingCode: "JP-TRK-900112345",
    shippingAddress: "Jl. Margonda Raya No. 45, Kecamatan Beji, Kota Depok, Jawa Barat 16424",
    paymentMethod: "Marketplace"
  },
  {
    id: "ORD-1002",
    date: new Date(Date.now() - 10 * 3600000).toISOString(), // 10 jam lalu
    customerName: "Diana Lestari",
    customerPhone: "085211223344",
    items: [
      { productSku: "CLN-WHT-0002", productName: "Celana Kulot Linen Olivia Office", qty: 1, price: 139000, size: "M", color: "Chalk White" },
      { productSku: "GMS-CRM-0001", productName: "Gamis Hana Crinkle Premium", qty: 1, price: 195000, size: "M", color: "Cream" }
    ],
    total: 334000,
    status: "Tunda",
    platform: "WhatsApp",
    trackingCode: "",
    shippingAddress: "Komp. Gading Serpong Cluster Florence No. E12, Tangerang, Banten 15810",
    paymentMethod: "Transfer"
  },
  {
    id: "ORD-1003",
    date: new Date(Date.now() - 24 * 3600000).toISOString(), // 1 hari lalu
    customerName: "Wulan Dari",
    customerPhone: "087755667788",
    items: [
      { productSku: "DRS-NVY-0003", productName: "Dress Velvet Bianca Luxury Edition", qty: 1, price: 295000, size: "L", color: "Navy" }
    ],
    total: 295000,
    status: "Kirim",
    platform: "Tokopedia",
    trackingCode: "JP-TRK-100492150",
    shippingAddress: "Jl. Dago Asri No. 18, Kecamatan Coblong, Kota Bandung, Jawa Barat 40135",
    paymentMethod: "Marketplace"
  },
  {
    id: "ORD-1004",
    date: new Date(Date.now() - 48 * 3600000).toISOString(), // 2 hari lalu
    customerName: "Rani Handayani",
    customerPhone: "081122334455",
    items: [
      { productSku: "GMS-CRM-0001", productName: "Gamis Hana Crinkle Premium", qty: 1, price: 195000, size: "S", color: "Cream" }
    ],
    total: 195000,
    status: "Selesai",
    platform: "Offline",
    trackingCode: "",
    shippingAddress: "Ambil langsung di Counter Jassinta Atelier Butik Depok",
    paymentMethod: "Tunai"
  }
];

export const INITIAL_STOCK_HISTORY: StockHistory[] = [
  {
    id: "st-init-1",
    productSku: "GMS-CRM-0001",
    productName: "Gamis Hana Crinkle Premium",
    variantSize: "M",
    variantColor: "Cream",
    date: new Date(Date.now() - 72 * 3600000).toISOString(),
    changeQty: 30,
    type: "Stock In",
    notes: "Restok Awal Musim Baru Gudang Utama Jassinta",
    operator: "Ahmad Faisal (Gudang)",
    stockTypeAffected: "Physical",
    beforeQty: 0,
    afterQty: 30
  },
  {
    id: "st-init-2",
    productSku: "CLN-WHT-0002",
    productName: "Celana Kulot Linen Olivia Office",
    variantSize: "M",
    variantColor: "Chalk White",
    date: new Date(Date.now() - 72 * 3600000).toISOString(),
    changeQty: 10,
    type: "Stock In",
    notes: "Restok Awal Supplier Garmen Pekalongan",
    operator: "Ahmad Faisal (Gudang)",
    stockTypeAffected: "Physical",
    beforeQty: 0,
    afterQty: 10
  },
  {
    id: "st-rsv-1001",
    productSku: "GMS-CRM-0001",
    productName: "Gamis Hana Crinkle Premium",
    variantSize: "M",
    variantColor: "Cream",
    date: new Date(Date.now() - 4 * 3600000).toISOString(),
    changeQty: 2,
    type: "Reservation",
    notes: "Reservasi otomatis Order ORD-1001 via Shopee Engine",
    operator: "Shopee API Middleware",
    stockTypeAffected: "Reserved",
    beforeQty: 3,
    afterQty: 5
  },
  {
    id: "st-rsv-1002",
    productSku: "GMS-CRM-0001",
    productName: "Gamis Hana Crinkle Premium",
    variantSize: "M",
    variantColor: "Cream",
    date: new Date(Date.now() - 10 * 3600000).toISOString(),
    changeQty: 1,
    type: "Reservation",
    notes: "Reservasi Checkout Admin CS untuk Order WA-1002",
    operator: "Laras Kirana (CS)",
    stockTypeAffected: "Reserved",
    beforeQty: 2,
    afterQty: 3
  }
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: "TX-0001",
    date: new Date(Date.now() - 48 * 3600000).toISOString(),
    type: "Masuk",
    category: "Penjualan",
    amount: 195000,
    notes: "Penjualan offline ORD-1004 di Butik Jassinta"
  },
  {
    id: "TX-0002",
    date: new Date(Date.now() - 72 * 3600000).toISOString(),
    type: "Keluar",
    category: "Restok",
    amount: 5000000,
    notes: "Pembayaran Supplier Garmen konveksi Gamis Hana batch baru"
  },
  {
    id: "TX-0003",
    date: new Date(Date.now() - 24 * 3600000).toISOString(),
    type: "Masuk",
    category: "Penjualan",
    amount: 295000,
    notes: "Pencairan dana penjualan Tokopedia ORD-1003"
  }
];

export const INITIAL_KARYAWAN: Karyawan[] = [
  {
    id: "emp1",
    name: "Laras Kirana",
    role: "CS",
    phone: "08191234567",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=60",
    completedTasks: 142, // chats resolved
    commissionRate: 0.015,
    commissionEarned: 225000,
    attendances: [
      { date: "2026-05-26", checkInTime: "08:15", status: "Hadir" },
      { date: "2026-05-27", checkInTime: "07:55", status: "Hadir" }
    ]
  },
  {
    id: "emp2",
    name: "Ahmad Faisal",
    role: "Gudang",
    phone: "08571234567",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=60",
    completedTasks: 89, // orders packed
    commissionRate: 0.005,
    commissionEarned: 95000,
    attendances: [
      { date: "2026-05-26", checkInTime: "07:30", status: "Hadir" },
      { date: "2026-05-27", checkInTime: "07:42", status: "Hadir" }
    ]
  }
];
