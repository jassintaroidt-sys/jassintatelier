import React, { useState } from "react";
import { 
  Eye, Check, Printer, MapPin, Truck, RotateCcw, XCircle, Search, 
  HelpCircle, User, Phone, Clipboard, ArrowRight, CornerDownRight, PlusCircle, ShoppingBag
} from "lucide-react";
import { Order, Product, StockHistory, Transaction } from "../types";

interface PesananViewProps {
  orders: Order[];
  setOrders: (val: Order[] | ((prev: Order[]) => Order[])) => void;
  products: Product[];
  setProducts: (val: Product[] | ((prev: Product[]) => Product[])) => void;
  upsertProduct: (product: Product) => Promise<void>;
  setStockHistory: (val: StockHistory[] | ((prev: StockHistory[]) => StockHistory[])) => void;
  transactions: Transaction[];
  setTransactions: (val: Transaction[] | ((prev: Transaction[]) => Transaction[])) => void;
  brandSettings: any;
}

export default function PesananView({ 
  orders, 
  setOrders, 
  products, 
  setProducts, 
  upsertProduct,
  setStockHistory, 
  transactions, 
  setTransactions, 
  brandSettings 
}: PesananViewProps) {
  const [search, setSearch] = useState<string>("");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("Semua");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showMobileDetail, setShowMobileDetail] = useState<boolean>(false);
  
  // Return options
  const [returnRestock, setReturnRestock] = useState<boolean>(true);
  const [returnRefund, setReturnRefund] = useState<boolean>(true);
  const [returnCondition, setReturnCondition] = useState<"Sellable" | "Unsellable" | "Damaged" | "Repack needed">("Sellable");
  const [returnResolution, setReturnResolution] = useState<"Refund" | "Exchange size" | "Restock">("Restock");
  
  // Printing slip state
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);
  const [printingInvoice, setPrintingInvoice] = useState<Order | null>(null);
  // Tracking delivery state
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);
  const [showAddOrder, setShowAddOrder] = useState<boolean>(false);
  const [newOfflineOrder, setNewOfflineOrder] = useState({
    customerName: "",
    productSku: "",
    qty: 1,
    paymentMethod: "Debit",
    size: "M",
    platform: "Kasir" as const
  });

  const handleKasirSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const product = products.find(p => p.sku === newOfflineOrder.productSku);
    if (!product) {
      alert("Produk tidak ditemukan berdasarkan SKU!");
      return;
    }

    const orderTotal = product.promoPrice * newOfflineOrder.qty;
    const newOrderId = `ORD-OFF-${Math.floor(10000 + Math.random() * 90000)}`;

    const newOrder: Order = {
      id: newOrderId,
      date: new Date().toISOString(),
      customerName: newOfflineOrder.customerName || "Pelanggan Offline",
      customerPhone: "-",
      items: [{
        productSku: product.sku,
        productName: product.name,
        qty: Number(newOfflineOrder.qty),
        price: product.promoPrice,
        size: newOfflineOrder.size as any,
        color: product.variants[0]?.color || "Default"
      }],
      total: orderTotal,
      status: "Selesai", // Offline is completed immediately
      platform: newOfflineOrder.platform,
      trackingCode: newOfflineOrder.platform === "Kasir" || newOfflineOrder.platform === "Offline" ? "Bawa Pulang Secara Langsung" : "Pending Kurir",
      shippingAddress: newOfflineOrder.platform === "Kasir" || newOfflineOrder.platform === "Offline" ? "Kasir Toko (Direct)" : "Alamat sesuai Marketplace",
      paymentMethod: newOfflineOrder.paymentMethod as any
    };

    setOrders(prev => [newOrder, ...prev]);

    // Update Stock View under strict WMS rules
    const targetProduct = products.find(p => p.id === product.id);
    if (targetProduct) {
      const updatedProduct = {
        ...targetProduct,
        variants: targetProduct.variants.map(v => {
          if (v.size === newOfflineOrder.size) {
            const currentPhysical = v.physicalStock !== undefined ? v.physicalStock : v.stock;
            const currentReserved = v.reservedStock || 0;
            const newPhysical = Math.max(0, currentPhysical - newOfflineOrder.qty);
            const newAvailable = Math.max(0, newPhysical - currentReserved);
            return {
              ...v,
              physicalStock: newPhysical,
              availableStock: newAvailable,
              stock: newAvailable // sync for backward compatibility
            };
          }
          return v;
        })
      };
      upsertProduct(updatedProduct);
    }

    // Stock History
    setStockHistory(prev => [{
      id: "STK-" + Date.now(),
      productSku: product.sku,
      productName: product.name,
      variantSize: newOfflineOrder.size as any,
      variantColor: product.variants[0]?.color || "Default",
      date: new Date().toISOString(),
      changeQty: -newOfflineOrder.qty,
      type: "Stock Out",
      notes: `Pesanan Kasir (Offline)`,
      operator: "Kasir (Admin)",
      stockTypeAffected: "Physical",
      beforeQty: product.variants.find(v => v.size === newOfflineOrder.size)?.physicalStock ?? product.variants.find(v => v.size === newOfflineOrder.size)?.stock,
      afterQty: Math.max(0, (product.variants.find(v => v.size === newOfflineOrder.size)?.physicalStock ?? product.variants.find(v => v.size === newOfflineOrder.size)?.stock ?? 0) - newOfflineOrder.qty)
    }, ...prev]);

    // Core functionality requested by user
    if (newOfflineOrder.paymentMethod === "Debit") {
      setTransactions(prev => [{
        id: "TX-DEBIT-" + Date.now(),
        date: new Date().toISOString(),
        type: "Masuk",
        category: "Penjualan",
        amount: orderTotal,
        platform: newOfflineOrder.platform,
        notes: `Pembayaran ${newOfflineOrder.platform} (Pesanan ${newOrderId}) via Debit Card.`
      }, ...prev]);
      alert(`Pesanan berhasil. Pembayaran Rp ${orderTotal.toLocaleString('id-ID')} otomatis masuk ke M-Banking Owner.`);
    } else {
      setTransactions(prev => [{
        id: "TX-CASH-" + Date.now(),
        date: new Date().toISOString(),
        type: "Masuk",
        category: "Penjualan",
        amount: orderTotal,
        platform: newOfflineOrder.platform,
        notes: `Kas Tunai ${newOfflineOrder.platform} (Pesanan ${newOrderId}).`
      }, ...prev]);
      alert("Pesanan 100% Selesai dicatat kas tunai.");
    }

    setShowAddOrder(false);
    setNewOfflineOrder({
      customerName: "",
      productSku: "",
      qty: 1,
      paymentMethod: "Debit",
      size: "M",
      platform: "Kasir"
    });
  };

  const platforms = ["Semua", "Shopee", "Tokopedia", "WhatsApp", "Offline", "Kasir"];

  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.customerName.toLowerCase().includes(search.toLowerCase()) || o.id.toLowerCase().includes(search.toLowerCase());
    const matchesPlatform = selectedPlatform === "Semua" || o.platform === selectedPlatform;
    return matchesSearch && matchesPlatform;
  });

  // Confirm payment in 1 click
  const handleConfirmPayment = (orderId: string) => {
    const updated = orders.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          status: "Proses" as const
        };
      }
      return o;
    });
    setOrders(updated);
    if (selectedOrder?.id === orderId) {
      setSelectedOrder(prev => prev ? { ...prev, status: "Proses" } : null);
    }
  };

  // Change shipment status to "Kirim" with automatic cargo receipt generation
  const handleShipOrder = (orderId: string) => {
    const trackingCode = "JP-TRK-" + Math.floor(100000000 + Math.random() * 900000000);
    const targetOrder = orders.find(o => o.id === orderId);

    const updated = orders.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          status: "Kirim" as const,
          trackingCode: trackingCode
        };
      }
      return o;
    });
    setOrders(updated);
    if (selectedOrder?.id === orderId) {
      setSelectedOrder(prev => prev ? { ...prev, status: "Kirim", trackingCode } : null);
    }

    // STRICT WMS RULE: When order is SHIPPED (KIRIM) -> Physical Stock DECREASES, Reserved Stock DECREASES
    if (targetOrder) {
      let loggedEntries: StockHistory[] = [];

      targetOrder.items.forEach(item => {
        const productToUpdate = products.find(p => p.sku === item.productSku);
        if (productToUpdate) {
          const updatedProduct = {
            ...productToUpdate,
            variants: productToUpdate.variants.map(v => {
              if (v.size === item.size && v.color === item.color) {
                const currentPhysical = v.physicalStock !== undefined ? v.physicalStock : v.stock;
                const currentReserved = v.reservedStock || 0;
                const newPhysical = Math.max(0, currentPhysical - item.qty);
                const newReserved = Math.max(0, currentReserved - item.qty);
                const newAvailable = Math.max(0, newPhysical - newReserved);

                // Create audit log entries
                loggedEntries.push({
                  id: "st-out-" + Date.now() + Math.random().toString(36).substr(2, 5),
                  productSku: productToUpdate.sku,
                  productName: productToUpdate.name,
                  variantSize: v.size,
                  variantColor: v.color,
                  date: new Date().toISOString(),
                  changeQty: -item.qty,
                  type: "Stock Out",
                  notes: `Pengeluaran barang fisik dikirim via kurir (ORD: ${targetOrder.id})`,
                  operator: "Ahmad Gudang",
                  stockTypeAffected: "Physical",
                  beforeQty: currentPhysical,
                  afterQty: newPhysical
                });

                loggedEntries.push({
                  id: "st-rel-" + Date.now() + Math.random().toString(36).substr(2, 5),
                  productSku: productToUpdate.sku,
                  productName: productToUpdate.name,
                  variantSize: v.size,
                  variantColor: v.color,
                  date: new Date().toISOString(),
                  changeQty: -item.qty,
                  type: "Reservation",
                  notes: `Pelepasan reservasi barang terkirim (ORD: ${targetOrder.id})`,
                  operator: "Ahmad Gudang",
                  stockTypeAffected: "Reserved",
                  beforeQty: currentReserved,
                  afterQty: newReserved
                });

                return {
                  ...v,
                  physicalStock: newPhysical,
                  reservedStock: newReserved,
                  availableStock: newAvailable,
                  stock: newAvailable
                };
              }
              return v;
            })
          };
          upsertProduct(updatedProduct);
        }
      });

      if (loggedEntries.length > 0) {
        setStockHistory(prev => [...loggedEntries, ...prev]);
      }
    }
  };

  // Complete Order
  const handleCompleteOrder = (orderId: string) => {
    const updated = orders.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          status: "Selesai" as const
        };
      }
      return o;
    });
    setOrders(updated);
    if (selectedOrder?.id === orderId) {
      setSelectedOrder(prev => prev ? { ...prev, status: "Selesai" } : null);
    }
  };

  // Accept Return / Retur
  const handleAcceptReturn = (orderId: string) => {
    const targetOrder = orders.find(o => o.id === orderId);
    if (!targetOrder) return;

    const updated = orders.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          returnStatus: "Disetujui" as const
        };
      }
      return o;
    });

    if (returnRestock) {
      // Add back return item to catalog stock based on condition and resolution
      // Categories: Sellable, Unsellable, Damaged, Repack needed
      targetOrder.items.forEach(item => {
        const targetProd = products.find(p => p.sku === item.productSku);
        if (targetProd) {
          const updatedProduct = {
            ...targetProd,
            variants: targetProd.variants.map(v => {
              if (v.size === item.size && v.color === item.color) {
                const currentPhysical = v.physicalStock !== undefined ? v.physicalStock : v.stock;
                const currentReserved = v.reservedStock || 0;
                const currentDamaged = v.damagedStock || 0;
                const currentQcHold = v.qcHold || 0;

                let addedPhysical = item.qty;
                let addedAvailable = 0;
                let addedDamaged = 0;
                let addedQcHold = 0;

                // Routing depending on Condition: Sellable, Unsellable, Damaged, Repack needed
                if (returnCondition === "Sellable") {
                  addedAvailable = item.qty;
                } else if (returnCondition === "Damaged") {
                  addedDamaged = item.qty;
                } else if (returnCondition === "Unsellable" || returnCondition === "Repack needed") {
                  addedQcHold = item.qty;
                }

                const newPhysical = currentPhysical + addedPhysical;
                const newDamaged = currentDamaged + addedDamaged;
                const newQcHold = currentQcHold + addedQcHold;
                const newAvailable = Math.max(0, newPhysical - currentReserved - newDamaged - newQcHold);

                return {
                  ...v,
                  physicalStock: newPhysical,
                  availableStock: newAvailable,
                  damagedStock: newDamaged,
                  qcHold: newQcHold,
                  stock: newAvailable
                };
              }
              return v;
            })
          };

          upsertProduct(updatedProduct);

          // Record to stock logs under strict WMS immutable standards
          const determinedStockType = 
            returnCondition === "Damaged" ? "Damaged" :
            (returnCondition === "Unsellable" || returnCondition === "Repack needed") ? "QC Hold" : "Physical";

          const logEntry: StockHistory = {
            id: "st-retur-" + Date.now() + Math.random().toString(36).substr(2, 5),
            productSku: item.productSku,
            productName: item.productName,
            variantSize: item.size,
            variantColor: item.color,
            date: new Date().toISOString(),
            changeQty: item.qty,
            type: "Return",
            notes: `Retur disetujui [QC: ${returnCondition}, Resolusi: ${returnResolution}] (ORD: ${targetOrder.id}, Alasan: ${targetOrder.returnReason})`,
            operator: "Ahmad Gudang (QC Spec)",
            stockTypeAffected: determinedStockType,
            beforeQty: targetProd.variants.find(v => v.size === item.size && v.color === item.color)?.[determinedStockType === "Damaged" ? "damagedStock" : determinedStockType === "QC Hold" ? "qcHold" : "physicalStock"] ?? 0,
            afterQty: (targetProd.variants.find(v => v.size === item.size && v.color === item.color)?.[determinedStockType === "Damaged" ? "damagedStock" : determinedStockType === "QC Hold" ? "qcHold" : "physicalStock"] ?? 0) + item.qty
          };
          setStockHistory(prev => [logEntry, ...prev]);
        }
      });
    }

    if (returnRefund) {
      // Deduct cash automatically
      const txEntry: Transaction = {
        id: "tx-retur-" + Date.now(),
        date: new Date().toISOString(),
        type: "Keluar",
        category: "Refund",
        amount: targetOrder.total,
        notes: `Refund pengembalian dana retur pesanan ${targetOrder.id}`
      };
      setTransactions(prev => [txEntry, ...prev]);
    }

    setOrders(updated);
    if (selectedOrder?.id === orderId) {
      setSelectedOrder(prev => prev ? { ...prev, returnStatus: "Disetujui" } : null);
    }

    let alertMsg = "Retur berhasil disetujui.";
    if (returnRestock) alertMsg += ` Stok masuk ke kategori [${returnCondition}].`;
    if (returnRefund) alertMsg += " Dana dikembalikan, kas berkurang.";

    alert(alertMsg);
  };

  // Reject Return
  const handleRejectReturn = (orderId: string) => {
    const updated = orders.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          returnStatus: "Ditolak" as const
        };
      }
      return o;
    });
    setOrders(updated);
    if (selectedOrder?.id === orderId) {
      setSelectedOrder(prev => prev ? { ...prev, returnStatus: "Ditolak" } : null);
    }
  };

  return (
    <div id="pesanan-view" className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 bg-white p-3 sm:p-4 rounded-xl border border-pink-100 shadow-2xs">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </span>
          <input
            type="text"
            placeholder="Cari ID Pesanan atau nama pembeli..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:border-pink-500 shadow-sm"
          />
        </div>

        {/* Platform tag selection */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 w-full lg:w-auto scrollbar-hide">
          <div className="flex bg-slate-50 p-1 rounded-lg w-full sm:w-auto overflow-x-auto scrollbar-hide">
            {platforms.map(plat => (
              <button
                key={plat}
                onClick={() => setSelectedPlatform(plat)}
                className={`text-[10px] sm:text-xs px-3 sm:px-4 py-1.5 rounded-md font-bold transition-all cursor-pointer whitespace-nowrap ${selectedPlatform === plat ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
              >
                {plat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Orders List Pipeline */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-pink-100 shadow-xs">
          <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 text-base">Daftar Semua Pesanan</h3>
            <button
              onClick={() => setShowAddOrder(true)}
              className="bg-pink-600 hover:bg-pink-700 text-white font-medium text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <PlusCircle className="h-4 w-4" />
              Buat Pesanan Manual / Kasir
            </button>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {filteredOrders.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center italic">Tidak ada transaksi ditemukan.</p>
            ) : (
              filteredOrders.map(order => (
                <div 
                  key={order.id}
                  onClick={() => {
                    setSelectedOrder(order);
                    if (window.innerWidth < 1024) {
                      setShowMobileDetail(true);
                    }
                  }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${selectedOrder?.id === order.id ? "bg-pink-50/50 border-pink-400 shadow-3xs" : "bg-white border-slate-100 hover:border-pink-200"}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-800 text-sm">{order.id}</span>
                        <span className={`px-2 py-0.5 rounded-sm text-[9px] font-bold ${
                          order.platform === "Shopee" ? "bg-orange-50 text-orange-600" :
                          order.platform === "Tokopedia" ? "bg-emerald-50 text-emerald-600" :
                          order.platform === "WhatsApp" ? "bg-green-50 text-green-600" :
                          order.platform === "Kasir" ? "bg-pink-50 text-pink-600" :
                          order.platform === "Offline" ? "bg-slate-200 text-slate-700 font-mono" :
                          "bg-slate-100 text-slate-600"
                        }`}>
                          {order.platform}
                        </span>
                        {order.returnStatus && order.returnStatus !== "None" && (
                          <span className="bg-rose-100 text-rose-800 text-[9px] font-bold px-2 py-0.5 rounded-sm">
                            Klaim Retur
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-medium">{order.customerName} &bull; {new Date(order.date).toLocaleDateString("id-ID")}</p>
                    </div>

                    <div className="text-right space-y-1">
                      <span className="text-xs font-bold font-mono text-slate-800 block">
                        IDR {order.total.toLocaleString("id-ID")}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold inline-block ${
                        order.status === "Selesai" ? "bg-emerald-100 text-emerald-800" :
                        order.status === "Kirim" ? "bg-blue-100 text-blue-800" :
                        order.status === "Proses" ? "bg-amber-100 text-amber-800" :
                        "bg-slate-100 text-slate-500"
                      }`}>
                        {order.status === "Tunda" ? "Menunggu Konfirmasi" : order.status}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-400">
                    <span className="truncate max-w-[250px]">🛒 {order.items.map(item => `${item.productName} (${item.size})`).join(", ")}</span>
                    <span className="text-pink-600 font-bold flex items-center gap-1">
                      Detail Order &rarr;
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Dynamic Detail & Operations Sidebar */}
        <div className={`
          ${showMobileDetail ? "fixed inset-0 z-50 bg-white p-6" : "hidden lg:flex flex-col"}
          bg-white lg:p-6 lg:rounded-2xl lg:border lg:border-pink-100 lg:shadow-xs h-full lg:h-[650px]
        `}>
          {showMobileDetail && (
            <div className="flex items-center justify-between mb-6 lg:hidden">
              <button 
                onClick={() => setShowMobileDetail(false)}
                className="text-xs font-bold text-slate-500 flex items-center gap-1"
              >
                &larr; Kembali ke List
              </button>
              <h3 className="font-bold text-slate-800 text-sm">Detail Pesanan</h3>
            </div>
          )}
          {selectedOrder ? (
            <div className="space-y-4 flex-1 overflow-y-auto pr-1">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-800 text-base">Detail Pesanan</h3>
                <p className="text-xs font-mono font-bold text-pink-600 mt-1">{selectedOrder.id}</p>
              </div>

              {/* Customer section */}
              <div className="space-y-2 text-xs">
                <h4 className="font-bold text-slate-500 tracking-wide uppercase text-[10px]">Data Pelanggan</h4>
                <div className="flex gap-2.5 items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <User className="h-4.5 w-4.5 text-slate-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-bold text-slate-700">{selectedOrder.customerName}</p>
                    <p className="text-slate-500 font-mono text-[11px]">{selectedOrder.customerPhone}</p>
                  </div>
                </div>
                <div className="flex gap-2.5 items-start bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <MapPin className="h-4.5 w-4.5 text-slate-400 shrink-0 mt-0.5" />
                  <p className="text-slate-600 text-[11px] leading-relaxed">{selectedOrder.shippingAddress}</p>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2 text-xs">
                <h4 className="font-bold text-slate-500 tracking-wide uppercase text-[10px]">Daftar Item Belanja ({selectedOrder.items.length})</h4>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={`${item.productSku}-${idx}`} className="flex justify-between items-center bg-pink-50/20 p-2.5 rounded-lg border border-pink-100/40">
                      <div>
                        <p className="font-bold text-slate-800">{item.productName}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                          SKU: {item.productSku} &bull; Varian: {item.color} ({item.size})
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-800 font-mono">x{item.qty}</p>
                        <p className="text-[10px] text-slate-400 font-mono">@IDR {item.price.toLocaleString("id-ID")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Return request section if applicable */}
              {selectedOrder.returnStatus && selectedOrder.returnStatus !== "None" && (
                <div className="bg-rose-50 p-3.5 rounded-xl border border-rose-100 text-xs space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-rose-800 text-[11px]">
                    <RotateCcw className="h-4 w-4" />
                    KLAIM PENGEMBALIAN BARANG (RETUR)
                  </div>
                  <p className="text-slate-700 italic text-[11px]">
                    " {selectedOrder.returnReason} "
                  </p>
                  <div className="pt-2 border-t border-rose-100 flex flex-col gap-2">
                    {selectedOrder.returnStatus === "Diajukan" ? (
                      <>
                        <div className="flex flex-col gap-2 mb-2 bg-white/70 p-2.5 rounded-lg border border-rose-100">
                          <label className="flex items-center gap-2 text-[10px] text-slate-700 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={returnRestock} 
                              onChange={(e) => setReturnRestock(e.target.checked)} 
                              className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                            <strong>Kembalikan / Putar Stok:</strong> Kembalikan barang ke inventori.
                          </label>

                          {returnRestock && (
                            <div className="grid grid-cols-2 gap-2 mt-1 p-2 bg-slate-50 rounded-md border border-slate-200/60 text-[9px]">
                              <div>
                                <label className="block text-slate-500 font-semibold mb-0.5 uppercase tracking-wider">Kondisi Barang (QC):</label>
                                <select 
                                  value={returnCondition} 
                                  onChange={(e: any) => setReturnCondition(e.target.value)}
                                  className="w-full text-[10px] py-1 px-1.5 rounded border border-slate-300 bg-white font-semibold focus:outline-none focus:border-rose-500 font-sans"
                                >
                                  <option value="Sellable">Layak Jual (Sellable) &rarr; Available</option>
                                  <option value="Unsellable">Tidak Layak &rarr; QC Hold</option>
                                  <option value="Damaged">Rijek / Rusak (Damaged)</option>
                                  <option value="Repack needed">Butuh Repacking &rarr; QC Hold</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-slate-500 font-semibold mb-0.5 uppercase tracking-wider">Metode Resolusi:</label>
                                <select 
                                  value={returnResolution} 
                                  onChange={(e: any) => setReturnResolution(e.target.value)}
                                  className="w-full text-[10px] py-1 px-1.5 rounded border border-slate-300 bg-white font-semibold focus:outline-none focus:border-rose-500 font-sans"
                                >
                                  <option value="Restock">Kembalikan ke Stok Dasar</option>
                                  <option value="Refund">Refund Dana</option>
                                  <option value="Exchange size">Tukar Ukuran (Exchange)</option>
                                </select>
                              </div>
                            </div>
                          )}

                          <label className="flex items-center gap-2 text-[10px] text-slate-700 cursor-pointer pt-1 border-t border-dotted border-slate-200">
                            <input 
                              type="checkbox" 
                              checked={returnRefund} 
                              onChange={(e) => setReturnRefund(e.target.checked)} 
                              className="rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                            />
                            <strong>Refund Dana Kasir:</strong> Kurangi kas sebesar <strong>IDR {selectedOrder.total.toLocaleString("id-ID")}</strong>.
                          </label>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAcceptReturn(selectedOrder.id)}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-2 rounded-lg text-[10px] transition-colors cursor-pointer flex items-center justify-center gap-1"
                          >
                            <Check className="h-3 w-3" /> Setujui
                          </button>
                          <button
                            onClick={() => handleRejectReturn(selectedOrder.id)}
                            className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-1.5 px-2 rounded-lg text-[10px] transition-colors cursor-pointer flex items-center justify-center gap-1"
                          >
                            <XCircle className="h-3 w-3" /> Tolak
                          </button>
                        </div>
                      </>
                    ) : (
                      <span className={`text-xs font-bold ${selectedOrder.returnStatus === "Disetujui" ? "text-emerald-700" : "text-rose-700"}`}>
                        Status Klaim: {selectedOrder.returnStatus}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Payment Proof Slip */}
              {selectedOrder.status === "Tunda" && selectedOrder.paymentProofUrl && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-2">
                  <h4 className="font-bold text-slate-600 flex items-center gap-1">
                    <Clipboard className="h-4 w-4 text-pink-600" />
                    Bukti Transfer Pembayaran WA
                  </h4>
                  <img
                    src={selectedOrder.paymentProofUrl}
                    alt="Bukti Transfer"
                    className="w-full h-36 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-90"
                    onClick={() => window.open(selectedOrder.paymentProofUrl)}
                  />
                  <button
                    onClick={() => handleConfirmPayment(selectedOrder.id)}
                    className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 rounded-lg text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Check className="h-4 w-4" />
                    Konfirmasi Bukti & Setujui
                  </button>
                </div>
              )}

              {/* Operations Action Area */}
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <div className="flex gap-2">
                  {selectedOrder.status === "Proses" && (
                    <button
                      onClick={() => handleShipOrder(selectedOrder.id)}
                      className="flex-1 bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 rounded-lg text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Truck className="h-4 w-4" />
                      Kirim & Buat Resi Kurir
                    </button>
                  )}
                  {selectedOrder.platform !== "Kasir" && selectedOrder.status === "Proses" && (
                    <button
                      onClick={() => {
                        const updated = orders.map(o => {
                          if (o.id === selectedOrder.id) {
                            return { ...o, platform: "Kasir" as const, status: "Selesai" as const };
                          }
                          return o;
                        });
                        setOrders(updated);
                        alert(`Pesanan ${selectedOrder.id} telah diproses via Kasir (Selesai).`);
                      }}
                      className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 rounded-lg text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <ShoppingBag className="h-4 w-4" />
                      Proses via Kasir
                    </button>
                  )}
                  {selectedOrder.status === "Kirim" && (
                    <button
                      onClick={() => handleCompleteOrder(selectedOrder.id)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Check className="h-4 w-4" />
                      Konfirmasi Tiba & Selesai
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPrintingOrder(selectedOrder)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-lg text-xs transition-colors border border-slate-200 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Printer className="h-4 w-4 text-pink-600" />
                    Cetak Label
                  </button>
                  
                  <button
                    onClick={() => setPrintingInvoice(selectedOrder)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-lg text-xs transition-colors border border-slate-200 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Clipboard className="h-4 w-4 text-orange-600" />
                    Cetak Invoice
                  </button>

                  <button
                    onClick={() => setTrackingOrder(selectedOrder)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-lg text-xs transition-colors border border-slate-200 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Truck className="h-4 w-4 text-blue-600" />
                    Lacak Paket
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-3">
              <Clipboard className="h-12 w-12 text-slate-300 animate-pulse" />
              <div>
                <p className="text-xs font-bold text-slate-700">Pilih Pesanan</p>
                <p className="text-[11px] text-slate-400 mt-1">Pilih salah satu nomor pesanan untuk memicu verifikasi transfer, mencetak manifes label, melacak pos kurir J&T, atau menyetujui klaim barang retur.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Printing Modal */}
      {printingOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 border border-slate-100 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-base">Cetak Label Pengiriman Otomatis</h3>
              <button onClick={() => setPrintingOrder(null)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            {/* Simulated thermal shipping label tag */}
            <div className="border border-dashed border-slate-400 p-4 rounded-lg bg-slate-50 font-mono text-[11px] text-slate-800 space-y-3.5">
              <div className="flex justify-between items-center justify-items-center border-b border-dashed border-slate-300 pb-2">
                <div className="flex items-center gap-1.5">
                  {brandSettings.logo_img_base64 ? (
                    <img src={brandSettings.logo_img_base64} className="h-6 w-auto object-contain" alt="Logo" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-sm">{brandSettings.logo_symbol || "🌸"}</span>
                  )}
                  <span className="font-bold text-[11px] tracking-tight text-slate-900">{brandSettings.company_name}</span>
                </div>
                <span className="font-extrabold text-xs tracking-wider text-slate-900 bg-slate-200 px-1 py-0.5 rounded">J&T REGULAR</span>
              </div>

              {/* Realistic Barcode */}
              <div className="border border-slate-300 bg-white py-4 flex flex-col items-center justify-center rounded-sm">
                <div className="w-4/5 h-10 flex border-l border-r border-slate-800">
                  {Array.from({ length: 42 }).map((_, i) => (
                    <div 
                      key={i} 
                      className="h-full flex-1" 
                      style={{ 
                        background: i % 3 === 0 || i % 7 === 0 || i % 11 === 0 ? "#1e293b" : "transparent"
                      }} 
                    />
                  ))}
                </div>
                <p className="font-bold mt-1 text-[11px] tracking-widest">*{printingOrder.id}*</p>
              </div>

              <div className="grid grid-cols-2 divide-x divide-slate-300 text-[10px] leading-relaxed">
                <div className="pr-2 space-y-1">
                  <p className="font-extrabold text-slate-500 uppercase text-[9px]">PENGIRIM:</p>
                  <p className="font-bold text-slate-900">{brandSettings.company_name}</p>
                  <p className="text-slate-600 line-clamp-2">{brandSettings.address || "Depok, Jawa Barat"}</p>
                  <p className="font-semibold text-slate-600">{brandSettings.whatsapp || "081122334455"}</p>
                </div>
                <div className="pl-2 space-y-1">
                  <p className="font-extrabold text-slate-500 uppercase text-[9px]">PENERIMA / RECIPIENT:</p>
                  <p className="font-bold text-slate-900">{printingOrder.customerName}</p>
                  <p className="line-clamp-2">{printingOrder.shippingAddress}</p>
                  <p className="font-bold">{printingOrder.customerPhone}</p>
                </div>
              </div>

              <div className="border-t border-slate-300 pt-3 text-[10px]">
                <p className="font-extrabold uppercase text-[9px] mb-1">Manifes Item Belanja:</p>
                {printingOrder.items.map((item, idx) => (
                  <p key={idx} className="font-semibold leading-relaxed text-slate-700">
                    - {item.productName} [{item.color}/{item.size}] x{item.qty}
                  </p>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button
                onClick={() => setPrintingOrder(null)}
                className="text-xs font-semibold px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  alert("Label Pengiriman berhasil dikirim ke Antrean Printer Thermal Gudang!");
                  setPrintingOrder(null);
                }}
                className="text-xs bg-pink-600 hover:bg-pink-700 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Printer className="h-4 w-4" /> Cetak Sekarang (1-Klik)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {printingInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 border border-slate-100 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-base">Cetak Dokumen Invoice & Nota</h3>
              <button onClick={() => setPrintingInvoice(null)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="border border-slate-200 p-6 rounded-lg bg-white space-y-4 shadow-sm text-sm">
              <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    {brandSettings.logo_img_base64 ? (
                      <img src={brandSettings.logo_img_base64} className="h-8 w-auto object-contain" alt="Logo" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-xl">{brandSettings.logo_symbol || "🌸"}</span>
                    )}
                    <h2 className="font-black tracking-tighter text-xl text-slate-900 uppercase">{brandSettings.company_name}</h2>
                  </div>
                  <p className="text-[10px] text-slate-500 max-w-[280px] leading-tight">{brandSettings.address || "Fashion Management Warehouse System"}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-800 uppercase tracking-wide">INVOICE</p>
                  <p className="text-xs font-mono text-slate-500 mt-0.5">INV-{new Date().toISOString().replace(/-/g, '').slice(0, 8)}-{printingInvoice.id.substring(4, 8)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <p className="font-bold text-slate-500 uppercase text-[10px]">INFO CUSTOMER</p>
                  <p className="font-semibold text-slate-800">{printingInvoice.customerName}</p>
                  <p className="text-slate-600">{printingInvoice.customerPhone}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="font-bold text-slate-500 uppercase text-[10px]">TRANSAKSI</p>
                  <p className="text-slate-600">Terbayar via {printingInvoice.paymentMethod}</p>
                  <p className="text-slate-600">{printingInvoice.date} • {printingInvoice.time}</p>
                </div>
              </div>

              <div className="border border-slate-200 rounded overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="p-2 font-semibold">Produk</th>
                      <th className="p-2 font-semibold text-center">Qty</th>
                      <th className="p-2 font-semibold text-right">Harga</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {printingInvoice.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-2 leading-tight">
                          <p className="font-medium text-slate-800">{item.productName}</p>
                          <p className="text-[10px] text-slate-500">{item.variantCode} - {item.color}/{item.size}</p>
                        </td>
                        <td className="p-2 text-center text-slate-700">{item.qty}</td>
                        <td className="p-2 text-right text-slate-700">Rp {(item.price * item.qty).toLocaleString("id-ID")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-1.5 flex flex-col items-end text-xs pt-2">
                <div className="flex justify-between w-1/2">
                  <span className="text-slate-500">Subtotal:</span>
                  <span className="font-medium">Rp {(printingInvoice.total || 0).toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between w-1/2 text-green-600">
                  <span>Diskon:</span>
                  <span>- Rp 0</span>
                </div>
                <div className="flex justify-between w-1/2">
                  <span className="text-slate-500">Ongkos Kirim:</span>
                  <span>Rp 15.000</span>
                </div>
                <div className="flex justify-between w-1/2 border-t border-slate-200 pt-1.5 mt-1.5">
                  <span className="font-bold text-slate-800">Total Pembayaran:</span>
                  <span className="font-black text-slate-900 text-sm">Rp {((printingInvoice.total || 0) + 15000).toLocaleString("id-ID")}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button
                onClick={() => setPrintingInvoice(null)}
                className="text-xs font-semibold px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  alert("Invoice PDF Berhasil di Generate!");
                  setPrintingInvoice(null);
                }}
                className="text-xs bg-orange-600 hover:bg-orange-700 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Clipboard className="h-4 w-4" /> Download PDF A4
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tracking Modal */}
      {trackingOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 border border-slate-100 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-base">Lacak Pengiriman Real-time (J&T Regular)</h3>
              <button onClick={() => setTrackingOrder(null)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">No. Resi Pelacakan:</p>
                <p className="text-sm font-mono font-bold text-pink-600 mt-1">
                  {trackingOrder.trackingCode || "BELUM ADA RESI (PESANAN BARU)"}
                </p>
                <p className="text-xs text-slate-500 mt-1">Estimasi Tiba: 2-3 Hari Kerja</p>
              </div>

              {/* Stepper Tracking timeline */}
              <div className="space-y-4 text-xs font-sans pl-2">
                <div className="relative pl-6">
                  <div className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
                  <div className="absolute left-3 top-4 w-[1px] h-10 bg-slate-200" />
                  <h4 className="font-bold text-slate-800">Paket Diterima Kurir (Dalam Perjalanan)</h4>
                  <p className="text-slate-500 text-[11px] mt-0.5">Manifested Depok DC - Courier J&T Express</p>
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">2026-05-23 09:12 AM</p>
                </div>

                <div className="relative pl-6">
                  <div className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full bg-slate-300" />
                  <div className="absolute left-3 top-4 w-[1px] h-10 bg-slate-200" />
                  <h4 className="font-bold text-slate-700">Packing Manifes Sukses</h4>
                  <p className="text-slate-500 text-[11px] mt-0.5">Diserahkan ke tim kurir dari Gudang Utama</p>
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">2026-05-23 08:30 AM</p>
                </div>

                <div className="relative pl-6">
                  <div className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full bg-slate-300" />
                  <h4 className="font-bold text-slate-700">Pesanan Diproses</h4>
                  <p className="text-slate-500 text-[11px] mt-0.5">Pembayaran diverifikasi otomatis oleh sistem</p>
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">2026-05-23 08:12 AM</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setTrackingOrder(null)}
                className="text-xs font-bold bg-pink-600 hover:bg-pink-700 text-white px-5 py-2 rounded-lg cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
{showAddOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col items-center p-6 text-center">
            <h3 className="font-bold text-slate-800 text-lg mb-4">Buat Pesanan Baru (Manual & Kasir)</h3>
            <form onSubmit={handleKasirSubmit} className="w-full text-left space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Platform Pemesanan:</label>
                <div className="grid grid-cols-4 gap-2">
                  {["Shopee", "Tokopedia", "WhatsApp", "Kasir"].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setNewOfflineOrder({ ...newOfflineOrder, platform: p as any })}
                      className={`text-[10px] py-1.5 border rounded-md font-bold transition-all ${
                        newOfflineOrder.platform === p 
                          ? "bg-slate-900 text-white border-slate-900" 
                          : "bg-white text-slate-500 border-slate-200 hover:border-pink-300"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Pembeli:</label>
                <input
                  type="text"
                  placeholder="Misal: Bapak Andre"
                  value={newOfflineOrder.customerName}
                  onChange={e => setNewOfflineOrder({ ...newOfflineOrder, customerName: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-pink-500"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">SKU Barang:</label>
                  <input
                    type="text"
                    placeholder="Misal: GMS-PLM-01"
                    value={newOfflineOrder.productSku}
                    onChange={e => setNewOfflineOrder({ ...newOfflineOrder, productSku: e.target.value.toUpperCase() })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-pink-500 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Ukuran:</label>
                  <select
                    value={newOfflineOrder.size}
                    onChange={e => setNewOfflineOrder({ ...newOfflineOrder, size: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-pink-500"
                  >
                    <option value="S">S</option>
                    <option value="M">M</option>
                    <option value="L">L</option>
                    <option value="XL">XL</option>
                    <option value="XXL">XXL</option>
                    <option value="Jumbo">Jumbo</option>
                    <option value="All Size">All Size</option>
                    <option value="One Size">One Size</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Kuantitas:</label>
                  <input
                    type="number"
                    min="1"
                    value={newOfflineOrder.qty}
                    onChange={e => setNewOfflineOrder({ ...newOfflineOrder, qty: parseInt(e.target.value) || 1 })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-pink-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Metode Pembayaran:</label>
                  <select
                    value={newOfflineOrder.paymentMethod}
                    onChange={e => setNewOfflineOrder({ ...newOfflineOrder, paymentMethod: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-pink-500"
                  >
                    <option value="Tunai">Tunai Kas Kecil</option>
                    <option value="Debit">Debit (M-Banking Owner)</option>
                  </select>
                </div>
              </div>

              {newOfflineOrder.paymentMethod === "Debit" && (
                <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg text-blue-700 text-xs">
                  <strong>ℹ️ Info:</strong> Setoran transaksi Debit akan otomatis dilacak dan dicatat ke dalam buku kas dan <b>M-Banking Owner</b>.
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-2">
                <button
                  type="button"
                  onClick={() => setShowAddOrder(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold px-5 py-2 rounded-lg cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="h-4 w-4" /> Proses Pembayaran & Pesanan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
