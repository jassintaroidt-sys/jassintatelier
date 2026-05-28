export interface ProductVariant {
  sku?: string;
  size: "S" | "M" | "L" | "XL" | "XXL" | "Jumbo" | "All Size" | "One Size";
  color: string;
  stock: number; // Kept for backward compatibility, mapped to availableStock
  physicalStock?: number;
  availableStock?: number;
  reservedStock?: number;
  damagedStock?: number;
  transitStock?: number;
  qcHold?: number;
  lingkarDada?: number;      // Specific to "One Size" (and optionally "All Size")
  lingkarPinggang?: number;  // Specific to "One Size" (and optionally "All Size")
  lingkarPaha?: number;      // Specific to "One Size" (and optionally "All Size")
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: "Gamis" | "Blouse" | "Tunik" | "Kulot" | "Hijab" | "Aksesori" | "Cardigan" | "Rompi" | "Celana" | "One Set" | "Dress" | "Outer";
  normalPrice: number;
  promoPrice: number; // Harga Coret
  variants: ProductVariant[];
  imageUrl: string;
  rackLocation: string; // e.g. "Rak A-12", "Rak B-04"
  description: string;
}

export interface StockHistory {
  id: string;
  productSku: string;
  productName: string;
  variantSize: "S" | "M" | "L" | "XL" | "XXL" | "Jumbo" | "All Size" | "One Size";
  variantColor: string;
  date: string;
  changeQty: number; // + or - change quantity
  type: "Restok" | "Penjualan" | "Opname" | "Retur" | "Rijek" | "Stock In" | "Stock Out" | "Transfer" | "Adjustment" | "Return" | "Reservation";
  notes: string;
  operator: string;
  stockTypeAffected?: "Physical" | "Available" | "Reserved" | "Damaged" | "Transit" | "QC Hold";
  beforeQty?: number;
  afterQty?: number;
}

export interface OrderItem {
  productSku: string;
  productName: string;
  qty: number;
  price: number;
  size: "S" | "M" | "L" | "XL" | "XXL" | "Jumbo" | "All Size" | "One Size";
  color: string;
}

export interface Order {
  id: string;
  date: string;
  customerName: string;
  customerPhone: string;
  items: OrderItem[];
  total: number;
  status: "Tunda" | "Proses" | "Kirim" | "Selesai";
  platform: "Shopee" | "Tokopedia" | "WhatsApp" | "Offline" | "Kasir";
  trackingCode: string;
  shippingAddress: string;
  paymentProofUrl?: string;
  paymentMethod?: "Tunai" | "Debit" | "Transfer" | "QRIS" | "Marketplace";
  returnStatus?: "None" | "Diajukan" | "Disetujui" | "Ditolak";
  returnReason?: string;
}

export interface Transaction {
  id: string;
  date: string;
  type: "Masuk" | "Keluar";
  category: "Penjualan" | "Restok" | "Operasional" | "Gaji" | "Iklan" | "Refund";
  amount: number;
  notes: string;
  platform?: "Shopee" | "Tokopedia" | "WhatsApp" | "Offline" | "Kasir";
}

export interface Attendance {
  date: string;
  checkInTime: string;
  status: "Hadir" | "Sakit" | "Izin" | "Alpa";
}

export interface Karyawan {
  id: string;
  name: string;
  role: "CS" | "Gudang" | "Keuangan" | "Admin";
  phone: string;
  avatar: string;
  attendances: Attendance[];
  completedTasks: number; // number of orders packed (Gudang) or chats solved (CS)
  commissionRate: number; // percentage of sales
  commissionEarned: number; // calculated IDR
}
