import React, { useState } from "react";
import { 
  RefreshCw, MessageSquare, Send, CheckCircle2, ShoppingBag, Globe, AlertCircle, Copy, Check, Sparkles, Link2, Store, PlusCircle, ArrowUpRight, ShieldCheck, Zap,
  Sliders, Rocket, HelpCircle, Settings, ShieldAlert, BarChart3, CheckCircle, Play, Pause, Eye
} from "lucide-react";
import { Product, Order, Transaction, StockHistory } from "../types";

interface MarketplaceWAViewProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  upsertProduct: (product: Product) => Promise<void>;
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  setStockHistory: React.Dispatch<React.SetStateAction<StockHistory[]>>;
}

export default function MarketplaceWAView({
  products,
  setProducts,
  upsertProduct,
  orders,
  setOrders,
  transactions,
  setTransactions,
  setStockHistory
}: MarketplaceWAViewProps) {
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncLog, setSyncLog] = useState<string[]>([]);
  
  // SUB TAB CONTROLLER
  const [activeMarketTab, setActiveMarketTab] = useState<"integrasi" | "iklan">("integrasi");
  
  // Custom Account Connection Credentials
  const [shopeePartnerId, setShopeePartnerId] = useState<string>("849204");
  const [shopeeSecretKey, setShopeeSecretKey] = useState<string>("xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
  const [tokopediaClientId, setTokopediaClientId] = useState<string>("cl_tok_738491");
  const [tokopediaClientSecret, setTokopediaClientSecret] = useState<string>("xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
  const [tiktokShopIdValue, setTiktokShopIdValue] = useState<string>("TK-928471-ID");
  const [tiktokAppKey, setTiktokAppKey] = useState<string>("tt_app_842a781ce");
  
  const [isShopeeConnected, setIsShopeeConnected] = useState<boolean>(true);
  const [isTokopediaConnected, setIsTokopediaConnected] = useState<boolean>(true);
  const [isTiktokConnected, setIsTiktokConnected] = useState<boolean>(true);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);

  // Automatic Ads States
  const [isAiPilotActive, setIsAiPilotActive] = useState<boolean>(true);
  const [adBudget, setAdBudget] = useState<number>(250000);
  const [adPerformancePeriod, setAdPerformancePeriod] = useState<"HariIni" | "7Hari">("HariIni");
  const [savingAdConfig, setSavingAdConfig] = useState<boolean>(false);
  
  // Mock Ad status list
  const [adCampaigns, setAdCampaigns] = useState([
    { id: "c1", name: "Shopee Auto-Bid: Gamis Premium Plum", platform: "Shopee", budget: 100000, state: "Running", clicks: 342, spent: 85000, convs: 14, roas: 5.4, keywords: ["gamis silk", "gamis syari", "gamis mewah"] },
    { id: "c2", name: "TikTok Video Promo: Blouse Linen Sage", platform: "TikTok", budget: 75000, state: "Running", clicks: 512, spent: 63000, convs: 18, roas: 4.8, keywords: ["blouse linen", "blouse oversized", "sage green"] },
    { id: "c3", name: "Tokopedia Smart-Ad: Palazzo Crepe", platform: "Tokopedia", budget: 50000, state: "Running", clicks: 198, spent: 42000, convs: 8, roas: 5.2, keywords: ["celana palazzo", "palazzo crepe", "celana lebar"] },
    { id: "c4", name: "TikTok Promo: Cardigan Oatmeal", platform: "TikTok", budget: 25000, state: "Paused", clicks: 88, spent: 21000, convs: 2, roas: 2.1, keywords: ["cardigan rajut", "cardigan korean", "cardigan tebal"] },
  ]);

  // Account Information States
  const [shopeeShop, setShopeeShop] = useState<string>("Jassinta Atelier Shopee");
  const [tokopediaShop, setTokopediaShop] = useState<string>("Jassinta Official Toko");
  const [tiktokShop, setTiktokShop] = useState<string>("Jassinta_Atelier_TikTok");
  const [tiktokShopId, setTiktokShopId] = useState<string>("TK-928471-ID");
  const [isEditingShop, setIsEditingShop] = useState<boolean>(false);

  // WA Broadcast State
  const [broadcastTarget, setBroadcastTarget] = useState<string>("Pelanggan Setia (Belanja > 3x)");
  const [broadcastMessage, setBroadcastMessage] = useState<string>(
    "Halo Kak {nama}! ✨ Jassinta Atelier punya kejutan manis khusus di weekend ini! Dapatkan promo diskon gila-gilaan Gamis Syari Premium Silk kami diskon hingga Rp 60.000,- loh! 😍\n\nHanya sampai besok malam ya Sist. Jangan sampai kehabisan warna favoritmu! Hubungi CS kami untuk Keep sekarang juga 💖"
  );
  const [broadcasting, setBroadcasting] = useState<boolean>(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState<boolean>(false);

  // Live Toast Simulation Notification
  const [toastMessage, setToastMessage] = useState<{ text: string; subText?: string; icon: string } | null>(null);

  // Quick message templates
  const [copiedTemplateIdx, setCopiedTemplateIdx] = useState<number | null>(null);
  
  const quickTemplates = [
    { 
      title: "1. Panduan Ukuran (Sizing Guide)", 
      body: "Halo Sis! Ini ya detail panduan ukuran kita:\n- S: LD 90-94cm, PB 135cm\n- M: LD 96-100cm, PB 138cm\n- L: LD 102-106cm, PB 140cm\n- XL: LD 108-112cm, PB 142cm\n\nBahan Silk Premium melar halus adem pol ya Sis! Mumpung ready langsung keep ya Sis. ❤️" 
    },
    { 
      title: "2. Estimasi Ongkir & Ekspedisi", 
      body: "Estimasinya dikirim dari DEPOK ya Kak. Kurir reguler J&T/Sicepat:\n- JABODETABEK: 1-2 Hari Kerja (Rp 9.000)\n- Jawa Barat/Tengah: 2-3 Hari Kerja (Rp 15.000)\n- Luar Jawa: 3-5 Hari Kerja (Rp 25.000-Rp 39.000)\n\nBisa COD Bayar di Tempat kok Kak! 🥰" 
    },
    { 
      title: "3. Kebijakan Retur / Tukar Ukuran", 
      body: "Halo Kakak sapaan hangat, Jassinta Atelier menjamin garansi retur tukar size 3 hari sejak barang tiba ya Kak.\nSyaratnya: Label barcode baju tidak terpotong, baju belum dicuci, dan menyertakan rekaman unboxing paket ya Sis. Ongkir retur ditanggung pembeli kecuali jika kami salah kirim warna. 🙏" 
    }
  ];

  const triggerGlobalSync = () => {
    setSyncing(true);
    setSyncLog([]);
    
    const logs = [
      "Mengontak API Hub Shopee Indonesia...",
      "Mengontak API Hub Tokopedia Seller API...",
      "Mengontak API Hub TikTok Shop Seller Center API...",
      `Sinkronisasi toko: Shopee (${shopeeShop}), Tokopedia (${tokopediaShop}), TikTok Shop (${tiktokShop} - ${tiktokShopId})...`,
      "Menyamakan stok Gudang 'GMS-SLK-PLM' (Gamis Plum) sebanyak: S:12 M:18 L:8 XL:3...",
      "Sinkronisasi harga coret produk baru sukses disebarluaskan...",
      "Selesai! 125 SKU berhasil diselaraskan di Shopee, Tokopedia, & TikTok Seller secara live!"
    ];

    logs.forEach((log, index) => {
      setTimeout(() => {
        setSyncLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${log}`]);
        if (index === logs.length - 1) {
          setSyncing(false);
          triggerToast("Sinkronisasi Selesai", "Katalog & stok di 3 Channel (Shopee, Tokopedia, TikTok Shop) sinkron sempurna!", "🔄");
        }
      }, (index + 1) * 600);
    });
  };

  const triggerToast = (text: string, subText: string, icon: string) => {
    setToastMessage({ text, subText, icon });
    setTimeout(() => {
      setToastMessage(null);
    }, 5000);
  };

  // WEBHOOK SIMULATION EVENTS
  const simulateShopeeSale = () => {
    // Check if the gamis plum exists to manipulate stock
    const targetSku = "GMS-SLK-PLM";
    const gamis = products.find(p => p.sku === targetSku);
    if (!gamis) {
      alert("Produk Gamis Plum tidak terdeteksi di database.");
      return;
    }

    // Find first variant with stock > 0 to decrease
    const variantIndex = gamis.variants.findIndex(v => v.stock > 0);
    if (variantIndex === -1) {
      alert("Gamis Plum habis total di semua varian!");
      return;
    }
    const sizeSelected = gamis.variants[variantIndex].size;
    const colorSelected = gamis.variants[variantIndex].color;
    
    // 1. Mutate Product under strict WMS reservation rules
    const targetProduct = products.find(p => p.sku === targetSku);
    if (targetProduct) {
      const updatedProduct = {
        ...targetProduct,
        variants: targetProduct.variants.map((v, idx) => {
          if (idx === variantIndex) {
            const prevPhysical = v.physicalStock !== undefined ? v.physicalStock : v.stock;
            const prevReserved = v.reservedStock || 0;
            const newReserved = prevReserved + 1;
            const newAvailable = Math.max(0, prevPhysical - newReserved);

            return {
              ...v,
              reservedStock: newReserved,
              availableStock: newAvailable,
              stock: newAvailable,
              physicalStock: prevPhysical
            };
          }
          return v;
        })
      };
      upsertProduct(updatedProduct);
    }

    // 2. Add as dynamic Order
    const newOrderId = `ORD-SHP-${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrder: Order = {
      id: newOrderId,
      date: new Date().toISOString(),
      customerName: "Santi Shopee Buyer",
      customerPhone: "081992847551",
      shippingAddress: "Perumahan Dago Asri Blok E-19, Coblong, Kota Bandung, Jawa Barat 40135",
      total: gamis.promoPrice || gamis.normalPrice,
      status: "Proses",
      platform: "Shopee",
      trackingCode: `SPX-ID-${Math.floor(8812739 + Math.random() * 929482)}`,
      items: [
        {
          productSku: targetSku,
          productName: gamis.name,
          qty: 1,
          price: gamis.promoPrice || gamis.normalPrice,
          size: sizeSelected,
          color: colorSelected
        }
      ]
    };
    setOrders(prev => [newOrder, ...prev]);

    // 3. Register transaction ledger
    const newTx: Transaction = {
      id: `TX-IN-${Math.floor(8000 + Math.random() * 1999)}`,
      date: new Date().toISOString().split("T")[0],
      type: "Masuk",
      category: "Penjualan",
      amount: gamis.promoPrice || gamis.normalPrice,
      notes: `Pembayaran masuk Shopee Order: ${newOrderId}`
    };
    setTransactions(prev => [newTx, ...prev]);

    // 4. Update Stock log with strict WMS immutable Reservation transaction
    const initialReserved = gamis.variants[variantIndex].reservedStock || 0;
    const finalReserved = initialReserved + 1;
    const stockLog: StockHistory = {
      id: `STK-${Math.floor(10000 + Math.random() * 9999)}`,
      productSku: targetSku,
      productName: gamis.name,
      variantSize: sizeSelected,
      variantColor: colorSelected,
      date: new Date().toISOString(),
      changeQty: 1,
      type: "Reservation",
      notes: `Reservasi stok aman otomatis via Shopee Webhook (${newOrderId})`,
      operator: "Shopee API Engine",
      stockTypeAffected: "Reserved",
      beforeQty: initialReserved,
      afterQty: finalReserved
    };
    setStockHistory(prev => [stockLog, ...prev]);

    triggerToast(
      "📦 Webhook Shopee: Order Masuk!",
      `Pelanggan Santi membeli 1x Gamis Plum (${sizeSelected}). Stok website otomatis berkurang!`,
      "🧡"
    );
  };

  const simulateTokopediaPriceUpdate = () => {
    // Simulated price modification coming from Tokopedia API Hub
    const tunik = products.find(p => p.sku === "TNK-BRK-CRM");
    if (!tunik) return;

    // Decrease or Toggle price
    const currentPrice = tunik.promoPrice;
    const newPromoPrice = currentPrice === 249050 ? 219000 : 249050; // Add extra unique digit

    const updatedProduct = {
      ...tunik,
      promoPrice: newPromoPrice,
      description: tunik.description + " (Promo Flash Sale Tokopedia Live)"
    };
    upsertProduct(updatedProduct);

    triggerToast(
      "💚 Webhook Tokopedia: Harga Berubah!",
      `Tunik Brokat Premium harga coret berganti dari Rp ${currentPrice.toLocaleString("id-ID")} menjadi Rp ${newPromoPrice.toLocaleString("id-ID")}!`,
      "💚"
    );
  };

  const simulateTiktokProductUpload = () => {
    const dasterSku = "DST-ARAB-SILK";
    // Check if product already exists to avoid duplication
    if (products.some(p => p.sku === dasterSku)) {
      triggerToast(
        "🖤 TikTok Seller Webhook",
        "Produk Kaftan Arab Silk sudah terdaftar sebelumnya di katalog website Anda.",
        "📱"
      );
      return;
    }

    const newProduct: Product = {
      id: `p-${Math.floor(100 + Math.random() * 900)}`,
      sku: dasterSku,
      name: "Daster Arab Kaftan Silk Premium",
      category: "Gamis",
      normalPrice: 199000,
      promoPrice: 169000,
      imageUrl: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500&auto=format&fit=crop&q=60",
      rackLocation: "Rak D-05",
      description: "Daster kaftan impor bertekstur sutra satin murni. Sangat dingin dipakai sehari-hari, berhiaskan renda emas renda payet eksklusif di dada busui friendly.",
      variants: [
        { size: "S", color: "Bronze Gold", stock: 10 },
        { size: "M", color: "Bronze Gold", stock: 15 },
        { size: "L", color: "Bronze Gold", stock: 15 },
        { size: "XL", color: "Bronze Gold", stock: 12 }
      ]
    };

    upsertProduct(newProduct);

    // Update Stock log
    const stockLog: StockHistory = {
      id: `STK-${Math.floor(10000 + Math.random() * 9999)}`,
      productSku: dasterSku,
      productName: newProduct.name,
      variantSize: "M",
      variantColor: "Bronze Gold",
      date: new Date().toISOString(),
      changeQty: 52,
      type: "Restok",
      notes: "Sinkronisasi Webhook Awal Produk Baru dari TikTok Shop",
      operator: "TikTok API Webhook"
    };
    setStockHistory(prev => [stockLog, ...prev]);

    triggerToast(
      "🖤 Webhook TikTok: Produk Baru Masuk!",
      "Produk 'Daster Arab Kaftan Silk' otomatis diunggah ke website dengan silsilah ukuran!",
      "📱"
    );
  };

  const [selectedSyncWiz, setSelectedSyncWiz] = useState<"shopee" | "tokopedia" | "tiktok">("shopee");

  const handleConnectOfficialAccount = (platformName: string) => {
    setConnectingPlatform(platformName);
    setTimeout(() => {
      setConnectingPlatform(null);
      if (platformName === "Shopee") setIsShopeeConnected(true);
      if (platformName === "Tokopedia") setIsTokopediaConnected(true);
      if (platformName === "TikTok") setIsTiktokConnected(true);
      
      triggerToast(
        `Koneksi ${platformName} Berhasil!`, 
        `Token API resmi untuk ${platformName} telah diperbarui & terhubung sempurna ke system ERP Jassinta Atelier.`, 
        "✅"
      );
    }, 1500);
  };

  const toggleCampaignState = (campaignId: string) => {
    setAdCampaigns(prev => prev.map(camp => {
      if (camp.id === campaignId) {
        const nextState = camp.state === "Running" ? "Paused" : "Running";
        triggerToast(
          `Kampanye ${nextState === "Running" ? "Aktif" : "Ditunda"}`,
          `Iklan "${camp.name}" telah ${nextState === "Running" ? "dijalankan" : "dihentikan sementara"} di marketplace.`,
          nextState === "Running" ? "▶️" : "⏸️"
        );
        return { ...camp, state: nextState };
      }
      return camp;
    }));
  };

  const handleApplyAdConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAdConfig(true);
    setTimeout(() => {
      setSavingAdConfig(false);
      triggerToast(
        "Konfigurasi AI Pilot Sukses",
        `Parameter Iklan Otomatis diperbarui! Anggaran harian maksimal Rp ${adBudget.toLocaleString("id-ID")} diproporsikan rata ke 3 marketplace.`,
        "🚀"
      );
    }, 1200);
  };

  const handleBroadcastBlast = (e: React.FormEvent) => {
    e.preventDefault();
    setBroadcasting(true);
    setTimeout(() => {
      setBroadcasting(false);
      setBroadcastSuccess(true);
      setTimeout(() => setBroadcastSuccess(false), 4000);
    }, 2000);
  };

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedTemplateIdx(idx);
    setTimeout(() => setCopiedTemplateIdx(null), 2000);
  };

  return (
    <div id="marketplace-wa-view" className="space-y-6 relative">
      
      {/* Floating High-End Real-Time Notification Notification toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-slate-900 border border-slate-700/80 p-4.5 rounded-2xl shadow-xl w-80 md:w-96 z-50 text-white animate-fade-in-up flex items-start gap-4 backdrop-blur-md bg-opacity-95">
          <div className="h-10 w-10 shrink-0 bg-gradient-to-tr from-pink-500 to-rose-600 rounded-xl flex items-center justify-center text-lg shadow-sm">
            {toastMessage.icon}
          </div>
          <div className="flex-1 space-y-1">
            <h5 className="font-extrabold text-xs text-pink-100 tracking-wide flex items-center gap-1.5 uppercase">
              <Zap className="h-3.5 w-3.5 text-yellow-400 animate-pulse" />
              Real-time Sycned!
            </h5>
            <p className="font-bold text-[12px] text-white leading-snug">{toastMessage.text}</p>
            {toastMessage.subText && (
              <p className="text-[10.5px] text-slate-300 leading-relaxed font-sans">{toastMessage.subText}</p>
            )}
          </div>
          <button 
            onClick={() => setToastMessage(null)} 
            className="text-slate-400 hover:text-white font-extrabold text-xs px-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tab Navigation for Marketplace view */}
      <div className="flex flex-col sm:flex-row bg-white p-2 rounded-2xl border border-pink-100 shadow-3xs items-center justify-between gap-3">
        <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setActiveMarketTab("integrasi")}
            className={`text-xs px-4 py-2.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 flex-1 sm:flex-none justify-center ${activeMarketTab === "integrasi" ? "bg-white text-slate-800 shadow-3xs" : "text-slate-500 hover:text-slate-800"}`}
          >
            <Store className="h-4 w-4 text-pink-600" />
            🔌 Sinkronisasi Akun ERP
          </button>
          <button
            onClick={() => setActiveMarketTab("iklan")}
            className={`text-xs px-4 py-2.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 flex-1 sm:flex-none justify-center ${activeMarketTab === "iklan" ? "bg-white text-slate-800 shadow-3xs" : "text-slate-500 hover:text-slate-800"}`}
          >
            <Sliders className="h-4 w-4 text-pink-600 animate-pulse" />
            📈 Manajemen Iklan Otomatis
          </button>
        </div>
        
        <div className="flex items-center gap-2 px-3 py-1.5 bg-pink-50/50 rounded-xl border border-pink-105">
          <Sparkles className="h-4 w-4 text-pink-500 animate-pulse" />
          <span className="text-[10px] text-pink-700 font-bold tracking-wider font-mono">INTEGRATION CONDUIT v2.4</span>
        </div>
      </div>

      {activeMarketTab === "integrasi" ? (
        <>
          {/* Connection Panel and Syncer */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* API Settings Section */}
            <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-pink-100 shadow-xs flex flex-col justify-between">
              <div className="space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Store className="h-5 w-5 text-pink-600" />
                    <h3 className="font-bold text-slate-800 text-xs md:text-sm border-0 bg-transparent">
                      Integrasi Multi-Marketplace Hub (Shopee, Tokopedia, TikTok Seller)
                    </h3>
                  </div>
                  <span className="text-[9px] font-mono tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-250 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3 animate-pulse" /> API SECURED
                  </span>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed font-sans">
                  Kami menyelaraskan katalog produk, harga diskon coret, dan stok gudang Anda ke 3 platform marketplace teramai di Indonesia. Kapan pun ada update stok, promo baru, atau order eksternal masuk, website akan sinkron secara instan.
                </p>

                {/* Credential settings */}
                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-150 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-700">Kredensial Toko Terbungkus</h4>
                    <button
                      onClick={() => setIsEditingShop(!isEditingShop)}
                      className="text-[10px] text-pink-600 font-extrabold cursor-pointer hover:underline"
                    >
                      {isEditingShop ? "Batal / Simpan" : "✏️ Atur Username Toko"}
                    </button>
                  </div>

                  {isEditingShop ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      <div>
                        <label className="block text-[10px] text-slate-500 font-semibold mb-1">Shopee Shop Name:</label>
                        <input 
                          type="text" 
                          value={shopeeShop} 
                          onChange={e => setShopeeShop(e.target.value)}
                          className="w-full text-xs p-2 rounded border border-slate-200 focus:border-pink-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 font-semibold mb-1">Tokopedia Shop Name:</label>
                        <input 
                          type="text" 
                          value={tokopediaShop} 
                          onChange={e => setTokopediaShop(e.target.value)}
                          className="w-full text-xs p-2 rounded border border-slate-200 focus:border-pink-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 font-semibold mb-1">TikTok Shop ID:</label>
                        <input 
                          type="text" 
                          value={tiktokShopId} 
                          onChange={e => setTiktokShopId(e.target.value)}
                          className="w-full text-xs p-2 rounded border border-slate-200 focus:border-pink-500 outline-none font-mono"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="p-3.5 bg-orange-50/40 rounded-xl border border-orange-100 relative overflow-hidden group">
                        <div className="absolute top-2 right-2 text-xl font-bold text-orange-600/10 font-serif">S</div>
                        <p className="font-extrabold text-orange-850 text-[11px] uppercase tracking-wider">Shopee Indonesia</p>
                        <p className="text-slate-600 text-xs mt-1 font-semibold">{shopeeShop}</p>
                        <p className={`text-[9.5px] font-medium mt-1 ${isShopeeConnected ? "text-emerald-600 font-bold" : "text-slate-400"}`}>
                          Status: {isShopeeConnected ? "Terhubung Aktif" : "Belum Tertaut"}
                        </p>
                        <p className="text-slate-400 text-[9px] font-mono mt-0.5">Last Sync: 2 mnt lalu</p>
                      </div>

                      <div className="p-3.5 bg-emerald-50/40 rounded-xl border border-emerald-100 relative overflow-hidden group">
                        <div className="absolute top-2 right-2 text-xl font-bold text-emerald-600/10 font-serif">T</div>
                        <p className="font-extrabold text-emerald-800 text-[11px] uppercase tracking-wider">Tokopedia Seller</p>
                        <p className="text-slate-600 text-xs mt-1 font-semibold">{tokopediaShop}</p>
                        <p className={`text-[9.5px] font-medium mt-1 ${isTokopediaConnected ? "text-emerald-600 font-bold" : "text-slate-400"}`}>
                          Status: {isTokopediaConnected ? "Terhubung Aktif" : "Belum Tertaut"}
                        </p>
                        <p className="text-slate-400 text-[9px] font-mono mt-0.5">Last Sync: 2 mnt lalu</p>
                      </div>

                      <div className="p-3.5 bg-rose-50/40 rounded-xl border border-rose-100 relative overflow-hidden group">
                        <div className="absolute top-2 right-2 text-xl font-bold text-rose-600/10 font-serif">TT</div>
                        <p className="font-extrabold text-rose-800 text-[11px] uppercase tracking-wider">TikTok Seller</p>
                        <p className="text-slate-600 text-xs mt-1 font-semibold">{tiktokShop}</p>
                        <p className={`text-[9.5px] font-medium mt-1 ${isTiktokConnected ? "text-emerald-600 font-bold" : "text-slate-400"}`}>
                          Seller ID: <span className="font-mono text-pink-600 font-bold">{tiktokShopId}</span>
                        </p>
                        <p className={`text-[9.5px] font-medium mt-1 ${isTiktokConnected ? "text-emerald-600 font-bold" : "text-slate-400"}`}>Status: {isTiktokConnected ? "Terhubung Aktif" : "Belum Tertaut"}</p>
                      </div>
                    </div>
                  )}
                </div>

                {syncLog.length > 0 && (
                  <div className="bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-[10.5px] max-h-[160px] overflow-y-auto space-y-1 shadow-inner">
                    {syncLog.map((log, idx) => (
                      <p key={idx} className="leading-relaxed border-l-2 border-pink-500 pl-2 text-slate-300">{log}</p>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 mt-6 flex justify-end">
                <button
                  onClick={triggerGlobalSync}
                  disabled={syncing}
                  className="bg-slate-900 border border-slate-900 hover:bg-slate-800 text-pink-100 font-bold text-xs py-2.5 px-5 rounded-lg flex items-center gap-2 cursor-pointer disabled:bg-slate-150 transition-all shadow-sm"
                >
                  <RefreshCw className={`h-3.5 w-3.5 text-pink-500 ${syncing ? "animate-spin" : ""}`} />
                  {syncing ? "Menjalankan penyelarasan API..." : "Sinkronisasi Stok Global (3 Channel)"}
                </button>
              </div>
            </div>

            {/* Live Simulator Panel - "Agar bisa langsung muncul di website" */}
            <div id="live-sync-simulator" className="lg:col-span-4 bg-gradient-to-b from-slate-900 to-slate-950 p-6 rounded-2xl border border-pink-950 text-white flex flex-col justify-between shadow-md relative overflow-hidden">
              {/* Neon accent */}
              <div className="absolute top-0 right-0 h-40 w-40 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="space-y-4 z-10">
                <div className="flex items-center gap-2 border-b border-pink-900/40 pb-3">
                  <Zap className="h-4.5 w-4.5 text-pink-500 animate-bounce" />
                  <div>
                    <h4 className="font-extrabold text-xs text-pink-300 uppercase tracking-widest leading-tight">Webhook Simulator</h4>
                    <p className="text-[10px] text-slate-400 font-medium">Test Real-time Update</p>
                  </div>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                  Tekan tombol-tombol pemicu di bawah untuk mensimulasikan kejadian di luar market (pesanan masuk, revisi harga, produk baru) and saksikan bagaimana sistem **langsung mengubah data real** di website ini secara otomatis!
                </p>

                <div className="space-y-3 pt-2">
                  {/* Button 1: Shopee Sale */}
                  <button
                    onClick={simulateShopeeSale}
                    className="w-full text-left p-3 rounded-xl bg-orange-950/40 hover:bg-orange-900/40 border border-orange-800/40 hover:border-orange-500 transition-all text-xs flex flex-col justify-between gap-1 cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-extrabold text-orange-400 text-[10px] tracking-wider uppercase">Shopee Indonesia</span>
                      <span className="text-[9px] bg-orange-900/50 px-1.5 py-0.5 rounded font-mono text-orange-300 font-bold">SALE EVENT</span>
                    </div>
                    <p className="font-semibold text-white text-[11.5px]">Simulasikan Pembeli di Shopee</p>
                    <p className="text-[10.5px] text-orange-200/70 font-sans mt-0.5">Kurangi stok Gamis Plum (-1) & tambah order ORD-SHP baru secara langsung.</p>
                  </button>

                  {/* Button 2: Tokopedia Price Update */}
                  <button
                    onClick={simulateTokopediaPriceUpdate}
                    className="w-full text-left p-3 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/40 border border-emerald-800/40 hover:border-emerald-500 transition-all text-xs flex flex-col justify-between gap-1 cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-extrabold text-emerald-400 text-[10px] tracking-wider uppercase">Tokopedia Seller</span>
                      <span className="text-[9px] bg-emerald-900/50 px-1.5 py-0.5 rounded font-mono text-emerald-300 font-bold">PRICE EVENT</span>
                    </div>
                    <p className="font-semibold text-white text-[11.5px]">Simulasikan Ubah Harga Tokopedia</p>
                    <p className="text-[10.5px] text-emerald-200/70 font-sans mt-0.5">Ubah harga coret Tunik Brokat secara sekejap, instan teraplikasi di website.</p>
                  </button>

                  {/* Button 3: TikTok Seller product upload */}
                  <button
                    onClick={simulateTiktokProductUpload}
                    className="w-full text-left p-3 rounded-xl bg-pink-950/40 hover:bg-pink-900/40 border border-pink-900/40 hover:border-pink-500 transition-all text-xs flex flex-col justify-between gap-1 cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-extrabold text-pink-400 text-[10px] tracking-wider uppercase">TikTok Shop Seller</span>
                      <span className="text-[9px] bg-pink-950/50 px-1.5 py-0.5 rounded font-mono text-pink-300 font-bold">UPLOAD EVENT</span>
                    </div>
                    <p className="font-semibold text-white text-[11.5px]">Simulasikan Upload Produk Baru</p>
                    <p className="text-[10.5px] text-pink-200/70 font-sans mt-0.5">Upload baru 'Daster Arab Kaftan' di TikTok, langsung muncul di Katalog website!</p>
                  </button>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/60 pb-0 text-[9.5px] text-slate-400 text-center font-mono">
                🔄 REAL-TIME CLIENT-SERVER SIMULATION DATA ACTIVE
              </div>
            </div>
          </div>

          {/* New Account Sync wizard panel */}
          <div className="bg-white p-6 rounded-2xl border border-pink-100 shadow-xs mt-6">
            <div className="border-b border-pink-50 pb-3 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="font-bold text-slate-800 text-xs md:text-sm flex items-center gap-1.5">
                  <Link2 className="h-4.5 w-4.5 text-pink-600 animate-pulse" />
                  Konfigurasi & Langkah Menghubungkan Akun Seller Resmi ke Website ERP
                </h4>
                <p className="text-xs text-slate-400 font-medium">Langkah-langkah menyambungkan akun toko Shopee, Tokopedia, & TikTok Seller Anda yang asli ke system ERP ini.</p>
              </div>
              <div className="flex items-center gap-2 border border-slate-200 rounded-lg p-1 bg-slate-50 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedSyncWiz("shopee")}
                  className={`text-[10px] font-bold px-3 py-1.5 rounded-md transition-all cursor-pointer ${selectedSyncWiz === "shopee" ? "bg-orange-500 text-white shadow-3xs" : "text-slate-600 hover:text-slate-800"}`}
                >
                  Shopee
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSyncWiz("tokopedia")}
                  className={`text-[10px] font-bold px-3 py-1.5 rounded-md transition-all cursor-pointer ${selectedSyncWiz === "tokopedia" ? "bg-emerald-600 text-white shadow-3xs" : "text-slate-600 hover:text-slate-800"}`}
                >
                  Tokopedia
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSyncWiz("tiktok")}
                  className={`text-[10px] font-bold px-3 py-1.5 rounded-md transition-all cursor-pointer ${selectedSyncWiz === "tiktok" ? "bg-slate-950 text-white shadow-3xs" : "text-slate-600 hover:text-slate-800"}`}
                >
                  TikTok Shop
                </button>
              </div>
            </div>

            {selectedSyncWiz === "shopee" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs leading-relaxed">
                  <div className="md:col-span-2 space-y-3 font-sans text-slate-600">
                    <p className="font-bold text-slate-800 mb-1">Panduan Koneksi API Merchant Shopee:</p>
                    <div className="flex gap-2.5 items-start">
                      <span className="h-5 w-5 rounded-full bg-orange-100 text-orange-600 font-bold font-mono text-[11px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                      <p>Kunjungi portal pengembang resmi Shopee di <a href="https://open.shopee.com" target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline font-bold">open.shopee.com</a> dan masuk menggunakan akun merchant seller Anda.</p>
                    </div>
                    <div className="flex gap-2.5 items-start">
                      <span className="h-5 w-5 rounded-full bg-orange-100 text-orange-600 font-bold font-mono text-[11px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                      <p>Buat profil Console App baru dan dapatkan parameter rahasia <span className="font-mono bg-slate-100 p-0.5 rounded text-orange-700 font-bold">Partner ID</span> serta <span className="font-mono bg-slate-100 p-0.5 rounded text-orange-700 font-bold">Partner Secret Key</span> dari dashboard aplikasi Anda.</p>
                    </div>
                    <div className="flex gap-2.5 items-start">
                      <span className="h-5 w-5 rounded-full bg-orange-100 text-orange-600 font-bold font-mono text-[11px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                      <p>Ketikkan detail kredensial Anda di sisi kanan. Setelah klik <strong>Hubungkan Akun Resmi</strong>, sistem ERP akan mengalihkan Anda secara aman ke halaman otorisasi Shopee Indonesia PIN / OTP untuk sinkronisasi pesanan.</p>
                    </div>
                  </div>

                  <div className="p-4 bg-orange-50/20 rounded-xl border border-orange-100/60 space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      <h5 className="font-bold text-orange-950 text-xs">Shopee Developer Credentials</h5>
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold mb-1 uppercase">Partner ID (Numeric):</label>
                        <input
                          type="text"
                          value={shopeePartnerId}
                          onChange={e => setShopeePartnerId(e.target.value)}
                          className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none bg-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold mb-1 uppercase">Partner App Key / Secret:</label>
                        <input
                          type="password"
                          value={shopeeSecretKey}
                          onChange={e => setShopeeSecretKey(e.target.value)}
                          className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none bg-white font-mono"
                        />
                      </div>
                    </div>

                    <div className="pt-3.5 border-t border-orange-100 mt-2 flex items-center justify-between">
                      <span className={`text-[10px] font-bold ${isShopeeConnected ? "text-emerald-650" : "text-amber-500"}`}>
                        {isShopeeConnected ? "● Terhubung Aktif" : "○ Belum Tertaut"}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleConnectOfficialAccount("Shopee")}
                        disabled={connectingPlatform === "Shopee"}
                        className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-[10px] px-3.5 py-2 rounded-lg cursor-pointer transition-colors shadow-sm disabled:bg-slate-300 flex items-center gap-1"
                      >
                        {connectingPlatform === "Shopee" ? <RefreshCw className="h-3 w-3 animate-spin" /> : null}
                        {isShopeeConnected ? "Segarkan Token" : "Hubungkan Akun Resmi"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedSyncWiz === "tokopedia" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs leading-relaxed">
                  <div className="md:col-span-2 space-y-3 font-sans text-slate-600">
                    <p className="font-bold text-slate-800 mb-1">Panduan Koneksi API Partner Tokopedia:</p>
                    <div className="flex gap-2.5 items-start">
                      <span className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-600 font-bold font-mono text-[11px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                      <p>Kirim permohonan pendaftaran aplikasi di portal <a href="https://developer.tokopedia.com" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline font-bold">developer.tokopedia.com</a>.</p>
                    </div>
                    <div className="flex gap-2.5 items-start">
                      <span className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-600 font-bold font-mono text-[11px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                      <p>Setelah disetujui, masuk ke menu Console Apps untuk menyalin <span className="font-mono bg-slate-100 p-0.5 rounded text-emerald-700 font-bold">Client ID</span> and <span className="font-mono bg-slate-100 p-0.5 rounded text-emerald-700 font-bold">Client Secret</span> toko Anda.</p>
                    </div>
                    <div className="flex gap-2.5 items-start">
                      <span className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-600 font-bold font-mono text-[11px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                      <p>Input parameter pada formulir di kanan. Seluruh event log seperti pembatalan pesanan dan refund dari Tokopedia akan tersinkronisasi asinkronus ke ERP.</p>
                    </div>
                  </div>

                  <div className="p-4 bg-emerald-50/20 rounded-xl border border-emerald-100/60 space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      <h5 className="font-bold text-emerald-950 text-xs">Tokopedia Seller Credentials</h5>
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold mb-1 uppercase">Tokopedia Client ID:</label>
                        <input
                          type="text"
                          value={tokopediaClientId}
                          onChange={e => setTokopediaClientId(e.target.value)}
                          className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none bg-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold mb-1 uppercase">Client Secret Key:</label>
                        <input
                          type="password"
                          value={tokopediaClientSecret}
                          onChange={e => setTokopediaClientSecret(e.target.value)}
                          className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none bg-white font-mono"
                        />
                      </div>
                    </div>

                    <div className="pt-3.5 border-t border-emerald-100 mt-2 flex items-center justify-between">
                      <span className={`text-[10px] font-bold ${isTokopediaConnected ? "text-emerald-650" : "text-amber-500"}`}>
                        {isTokopediaConnected ? "● Terhubung Aktif" : "○ Belum Tertaut"}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleConnectOfficialAccount("Tokopedia")}
                        disabled={connectingPlatform === "Tokopedia"}
                        className="bg-emerald-650 hover:bg-emerald-705 text-white font-bold text-[10px] px-3.5 py-2 rounded-lg cursor-pointer transition-colors shadow-sm disabled:bg-slate-300 flex items-center gap-1"
                      >
                        {connectingPlatform === "Tokopedia" ? <RefreshCw className="h-3 w-3 animate-spin" /> : null}
                        {isTokopediaConnected ? "Segarkan Token" : "Hubungkan Akun Resmi"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedSyncWiz === "tiktok" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs leading-relaxed">
                  <div className="md:col-span-2 space-y-3 font-sans text-slate-600">
                    <p className="font-bold text-slate-800 mb-1">Panduan Koneksi API TikTok Shop:</p>
                    <div className="flex gap-2.5 items-start">
                      <span className="h-5 w-5 rounded-full bg-slate-100 text-slate-800 font-bold font-mono text-[11px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                      <p>Buka TikTok Shop Seller Center App Store, lalu cari aplikasi ERP tersertifikasi kami: <strong>"Jassinta ERP MultiChannel Web"</strong>.</p>
                    </div>
                    <div className="flex gap-2.5 items-start">
                      <span className="h-5 w-5 rounded-full bg-slate-100 text-slate-800 font-bold font-mono text-[11px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                      <p>Kumpulkan TikTok Seller ID toko dari sudut kanan atas layar merchant center Anda.</p>
                    </div>
                    <div className="flex gap-2.5 items-start">
                      <span className="h-5 w-5 rounded-full bg-slate-100 text-slate-800 font-bold font-mono text-[11px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                      <p>Isikan parameter ID ke kotak otorisasi yang terletak di sebelah kanan secara utuh. Sistem akan meminta ijin akses baca detail pesanan & write sisa unit stok.</p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      <h5 className="font-bold text-slate-800 text-xs">TikTok Shop Credentials</h5>
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold mb-1 uppercase">TikTok Seller ID:</label>
                        <input
                          type="text"
                          value={tiktokShopIdValue}
                          onChange={e => setTiktokShopIdValue(e.target.value)}
                          className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:border-slate-850 focus:ring-1 focus:ring-slate-850 outline-none bg-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold mb-1 uppercase">TikTok App Key:</label>
                        <input
                          type="text"
                          value={tiktokAppKey}
                          onChange={e => setTiktokAppKey(e.target.value)}
                          className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:border-slate-850 focus:ring-1 focus:ring-slate-850 outline-none bg-white font-mono"
                        />
                      </div>
                    </div>

                    <div className="pt-3.5 border-t border-slate-200 mt-2 flex items-center justify-between">
                      <span className={`text-[10px] font-bold ${isTiktokConnected ? "text-emerald-650" : "text-amber-500"}`}>
                        {isTiktokConnected ? "● Terhubung Aktif" : "○ Belum Tertaut"}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleConnectOfficialAccount("TikTok")}
                        disabled={connectingPlatform === "TikTok"}
                        className="bg-slate-900 hover:bg-slate-850 text-white font-bold text-[10px] px-3.5 py-2 rounded-lg cursor-pointer transition-colors shadow-sm disabled:bg-slate-300 flex items-center gap-1"
                      >
                        {connectingPlatform === "TikTok" ? <RefreshCw className="h-3 w-3 animate-spin" /> : null}
                        {isTiktokConnected ? "Segarkan Token" : "Hubungkan Akun Resmi"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        /* ADVERTISING AUTOMATION TAB PANE */
        <div id="automatic-ads-management-view" className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-pink-100 shadow-xs">
            <div className="border-b border-pink-50 pb-4.5 mb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-100/50">
                  <Sliders className="h-6 w-6 text-pink-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-xs md:text-sm">
                    Manajemen Iklan Otomatis (Marketplace Ads Auto-Pilot Hub)
                  </h3>
                  <p className="text-xs text-slate-500 font-medium font-sans">Membantu menangani iklan marketplace Anda secara menyeluruh sehingga lebih hemat waktu & mengurangi pemborosan budget.</p>
                </div>
              </div>

              {/* Pilot Toggle Switch */}
              <div className="flex items-center gap-3 bg-slate-50 p-2.5 px-4 rounded-xl border border-slate-150 shadow-3xs shrink-0">
                <span className="text-xs font-bold text-slate-700">Status Pilot AI:</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsAiPilotActive(!isAiPilotActive);
                    triggerToast(
                      isAiPilotActive ? "AI Auto-Pilot Dimatikan" : "AI Auto-Pilot Aktif",
                      isAiPilotActive 
                        ? "Bidding iklan sekarang ditangani secara manual." 
                        : "Sistem cerdas mengambil alih penyesuaian keywords & bids di marketplace.",
                      isAiPilotActive ? "🔒" : "🚀"
                    );
                  }}
                  className="focus:outline-none cursor-pointer"
                >
                  <div className={`w-12 h-6.5 rounded-full p-0.5 transition-colors duration-300 ${isAiPilotActive ? "bg-rose-600" : "bg-slate-300"}`}>
                    <div className={`w-5.5 h-5.5 rounded-full bg-white shadow-xs transform duration-300 ${isAiPilotActive ? "translate-x-5.5" : "translate-x-0"}`} />
                  </div>
                </button>
                <span className={`text-xs font-extrabold font-mono tracking-wider ${isAiPilotActive ? "text-rose-600" : "text-slate-500"}`}>
                  {isAiPilotActive ? "ON (AUTO-PILOT)" : "OFF (MANUAL)"}
                </span>
              </div>
            </div>

            {/* Campaign Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              <div className="p-4 rounded-xl bg-pink-50/20 border border-pink-100/60 shadow-3xs">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Ad Spend Hari Ini</p>
                <div className="flex items-baseline gap-1 mt-1.5">
                  <h4 className="text-lg font-bold text-slate-800">
                    IDR {(adCampaigns.filter(c => c.state === "Running").reduce((sum, c) => sum + c.spent, 0)).toLocaleString("id-ID")}
                  </h4>
                  <span className="text-[10px] text-slate-400">/ Max Rp {adBudget.toLocaleString("id-ID")}</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div 
                    className="bg-rose-500 h-full transition-all" 
                    style={{ width: `${Math.min(100, (adCampaigns.filter(c => c.state === "Running").reduce((sum, c) => sum + c.spent, 0) / adBudget) * 100)}%` }} 
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-orange-50/20 border border-orange-100/60 shadow-3xs">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-sans">Tayangan (Impressions)</p>
                <h4 className="text-lg font-bold text-slate-800 mt-1.5 font-sans">38,140 Tayang</h4>
                <p className="text-[10.5px] text-emerald-600 font-bold flex items-center gap-0.5 mt-1 font-sans">
                  <span>▲ 18.2%</span> <span className="text-slate-400 font-normal">vs kemarin</span>
                </p>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/20 border border-emerald-100/60 shadow-3xs">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">ROAS Kampanye Rerata</p>
                <h4 className="text-lg font-bold text-slate-800 mt-1.5 font-sans">5.13x Lipat</h4>
                <p className="text-[10.5px] text-rose-500 font-bold font-sans">Sangat Sehat (&gt; 3.0x threshold)</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 shadow-3xs">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Klik Iklan &amp; CTR</p>
                <h4 className="text-lg font-bold text-slate-800 mt-1.5 font-sans">1,140 Clicks</h4>
                <p className="text-[10.5px] text-slate-600 font-mono mt-1 font-bold">Rerata CTR: 6.08%</p>
              </div>
            </div>

            {/* AI Budget Tuning Slider */}
            <form onSubmit={handleApplyAdConfig} className="mt-6 p-4.5 bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h5 className="font-bold text-xs text-rose-400 uppercase tracking-widest flex items-center gap-1.5 font-sans">
                    <Rocket className="h-4 w-4 animate-bounce text-orange-400" /> Setting Alokasi Budget AI Pilot iklan
                  </h5>
                  <p className="text-[11px] text-slate-350 leading-relaxed font-sans">Tentukan batas maksimal pengeluaran iklan harian global. AI akan menyelaraskan dan membagi ke keyword dengan konversi tertinggi secara dinamis.</p>
                </div>
                <div className="flex items-center gap-2 bg-slate-950 border border-slate-850 rounded-lg p-2.5 shrink-0 self-start md:self-center">
                  <span className="text-xs text-slate-400 font-mono">Batas Harian:</span>
                  <span className="text-xs font-bold font-mono text-white">IDR {adBudget.toLocaleString("id-ID")}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono font-bold">
                    <span>Rp 50K</span>
                    <span>Rp 500K</span>
                    <span>Rp 1.0M</span>
                  </div>
                  <input
                    type="range"
                    min="50000"
                    max="1000000"
                    step="50000"
                    value={adBudget}
                    onChange={e => setAdBudget(Number(e.target.value))}
                    className="w-full accent-rose-500 cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none"
                  />
                  <p className="text-[10.1px] text-slate-400 font-sans italic">**Rekomendasi**: Semakin tinggi anggaran harian, sistem memiliki lebih banyak data untuk optimasi kata kunci bernilai penjualan tinggi.</p>
                </div>

                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-850 text-xs text-slate-300 space-y-1.5 leading-relaxed font-sans">
                  <p className="font-bold text-slate-250 flex items-center gap-1">🤖 Strategi Otomasi Yang Aktif:</p>
                  <p className="text-[10.5px] text-slate-400 leading-normal font-sans">&#8226; Auto-bid saat live streaming TikTok &amp; Shopee Live untuk meningkatkan eksposur penonton.</p>
                  <p className="text-[10.5px] text-slate-400 leading-normal font-sans">&#8226; Mengurangi budget kampanye CTR rendah di bawah 2% demi menghemat dana Anda.</p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end">
                <button
                  type="submit"
                  disabled={savingAdConfig}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg cursor-pointer transition-colors shadow-sm disabled:bg-slate-500 flex items-center gap-1.5"
                >
                  {savingAdConfig ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Settings className="h-3.5 w-3.5" />}
                  {savingAdConfig ? "Menyimpan ke server..." : "Terapkan Konfigurasi Baru"}
                </button>
              </div>
            </form>
          </div>

          {/* Ad Campaign Table */}
          <div className="bg-white p-6 rounded-2xl border border-pink-100 shadow-xs">
            <div className="flex items-center justify-between border-b border-pink-50 pb-3 mb-4">
              <h4 className="font-extrabold text-slate-850 text-xs uppercase tracking-widest flex items-center gap-1 bg-pink-50/50 py-1.5 px-3 rounded-xl border border-pink-100/50">
                <BarChart3 className="h-4 w-4 text-pink-500" /> Daftar Kampanye Iklan Sedang Berjalan
              </h4>
              <span className="text-[11px] text-slate-450 font-medium">Bidding Optimal Aktif</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                    <th className="p-3 font-sans">NAMA KAMPANYE</th>
                    <th className="p-3 font-sans">PLATFORM</th>
                    <th className="p-3 font-sans">BUDGET HARIAN</th>
                    <th className="p-3 font-sans">TERPAKAI HARI INI</th>
                    <th className="p-3 font-sans">KLIK &amp; ESTIMASI CTR</th>
                    <th className="p-3 font-sans">KONVERSI (ROAS)</th>
                    <th className="p-3 font-sans text-center">TINDAKAN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {adCampaigns.map((camp) => (
                    <tr key={camp.id} className="hover:bg-slate-50/50 transition-all">
                      <td className="p-3 font-sans">
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-800">{camp.name}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {camp.keywords.map((kw, i) => (
                              <span key={i} className="text-[9px] bg-pink-50 text-pink-600 px-1.5 py-0.5 rounded border border-pink-100 font-mono font-medium">#{kw}</span>
                            ))}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5.5 rounded-md text-[10px] font-bold ${
                          camp.platform === "Shopee" ? "bg-orange-50 text-orange-650 border border-orange-100" :
                          camp.platform === "TikTok" ? "bg-slate-100 text-slate-900 border border-slate-200" :
                          "bg-emerald-50 text-emerald-600 border border-emerald-100"
                        }`}>
                          {camp.platform}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-semibold text-slate-700">IDR {camp.budget.toLocaleString("id-ID")}</td>
                      <td className="p-3 font-mono font-semibold text-slate-800">
                        IDR {camp.spent.toLocaleString("id-ID")}
                        <span className="text-[9px] text-slate-400 block mt-0.5">({Math.round((camp.spent / camp.budget) * 100)}% Terpakai)</span>
                      </td>
                      <td className="p-3 font-sans">
                        <span className="font-bold text-slate-850 block">{camp.clicks} Klik</span>
                        <span className="text-[10px] text-slate-400">CTR {camp.platform === "Shopee" ? "7.2%" : camp.platform === "TikTok" ? "8.4%" : "5.1%"}</span>
                      </td>
                      <td className="p-3 font-sans">
                        <span className="font-bold text-emerald-600 block">{camp.convs} checkout</span>
                        <span className="text-[10px] text-[#E11D48] bg-rose-50 px-1.5 py-0.5 rounded font-mono font-bold mt-1 inline-block border border-rose-100">ROAS {camp.roas}x</span>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => toggleCampaignState(camp.id)}
                          className={`p-1.5 rounded-lg cursor-pointer transition-colors shadow-3xs inline-flex items-center justify-center ${
                            camp.state === "Running" 
                              ? "bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-205" 
                              : "bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-250"
                          }`}
                          title={camp.state === "Running" ? "Hentikan Iklan" : "Jalankan Iklan"}
                        >
                          {camp.state === "Running" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp CRM Broadcast */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-pink-100 shadow-xs">
          <form onSubmit={handleBroadcastBlast} className="space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <Globe className="h-4.5 w-4.5 text-green-500" />
                Live Chat & WhatsApp Broadcast Promosi Target Pasaran
              </h3>
              <span className="text-[10px] bg-green-100 text-green-800 font-bold px-2 py-0.5 rounded-full">WA CLOUD API ACTIVE</span>
            </div>

            <p className="text-xs text-slate-500">Kirim blast promosi tertarget ke ribuan database nomor telepon pelanggan Jassinta Atelier dengan biaya nyaris nol.</p>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Target Segmentasi Pelanggan:</label>
                  <select
                    value={broadcastTarget}
                    onChange={e => setBroadcastTarget(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-pink-500 bg-white"
                  >
                    <option value="Pelanggan Setia (Belanja > 3x)">Pelanggan Setia (Belanja &gt; 3x) &bull; 142 Kontak</option>
                    <option value="Pelanggan Keranjang Kosong (Belum Checkout)">Pelanggan Keranjang Kosong (Belum Checkout) &bull; 89 Kontak</option>
                    <option value="Semua Kontak Database CRM">Semua Kontak Database CRM &bull; 512 Kontak</option>
                  </select>
                </div>
                <div className="text-[10px] text-slate-400 flex items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span>💡 **Personalization** dapat menggunakan tag {`{nama}`} untuk memicu sapaan nama individu otomatis dari kontak database kami. Biaya kirim per pesan diestimasi Rp 0,- (tanpa biaya meta ads blast).</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">Template Pesan Promosi:</label>
                <textarea
                  value={broadcastMessage}
                  onChange={e => setBroadcastMessage(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-pink-500 h-28 resize-none leading-relaxed"
                  required
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <span className="text-[10px] text-slate-400">Teknologi: WhatsApp Cloud API Fonnte/Twilio Gateway</span>
              <button
                type="submit"
                disabled={broadcasting}
                className="bg-pink-600 hover:bg-pink-700 hover:scale-[1.02] text-white font-bold py-2 p-2 px-6 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer disabled:bg-slate-200 transition-all"
              >
                {broadcasting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Sedang membroadcast...
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    Kirim Broadcast Massal (Fonnte)
                  </>
                )}
              </button>
            </div>
          </form>

          {broadcastSuccess && (
            <div className="mt-4 p-3.5 bg-emerald-50 border border-emerald-100 rounded-lg text-xs text-emerald-800 flex items-center gap-2 animate-fade-in-up">
              <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
              <span>Broadcast Berhasil Blasted! Telah dikirimkan pesan promosi ke segmentasi {broadcastTarget}.</span>
            </div>
          )}
        </div>
      </div>

      {/* Canned Quick Message CS Desk */}
      <div className="bg-white p-6 rounded-2xl border border-pink-100 shadow-xs">
        <div className="border-b pb-3 mb-4 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <MessageSquare className="h-4.5 w-4.5 text-pink-600" />
              Template Pesan Cepat (Shortcut Canned CS Desk)
            </h3>
            <p className="text-xs text-slate-400">Tim admin / CS Anda cukup melakukan klik copy di bawah ini untuk merespons pertanyaan berulang para pembeli fashion.</p>
          </div>
          <span className="text-[10px] text-slate-400">Tersedia: 3 Template Utama</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickTemplates.map((item, idx) => (
            <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-xs text-slate-800 border-b pb-2 mb-2.5">{item.title}</h4>
                <p className="text-[11.5px] text-slate-600 leading-relaxed font-sans whitespace-pre-line h-40 overflow-y-auto pr-1">
                  {item.body}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200 mt-4 flex justify-end">
                <button
                  onClick={() => copyToClipboard(item.body, idx)}
                  className="bg-white border border-slate-300 hover:border-pink-300 hover:text-pink-600 transition-colors text-slate-600 text-[10px] font-bold p-1.5 px-3.5 rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  {copiedTemplateIdx === idx ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      Salin Template
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
