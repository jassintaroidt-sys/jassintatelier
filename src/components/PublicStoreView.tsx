import React, { useState, useMemo } from "react";
import { 
  ShoppingBag, Search, Filter, Sparkles, Phone, ShieldCheck, 
  ChevronRight, X, Layers, ArrowRight, Lock, HelpCircle, ArrowUpRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Product, ProductVariant } from "../types";

interface PublicStoreViewProps {
  products: Product[];
  brandSettings: {
    company_name: string;
    logo_symbol: string;
    bgColorPreset: string;
    logo_img_base64?: string;
  };
  onEnterWms: () => void;
}

export default function PublicStoreView({ products, brandSettings, onEnterWms }: PublicStoreViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [secretClickCount, setSecretClickCount] = useState(0);

  // Quiet sequence trigger for administrative login
  const handleSecretPortalTrigger = () => {
    const nextVal = secretClickCount + 1;
    if (nextVal >= 5) {
      setSecretClickCount(0);
      onEnterWms();
    } else {
      setSecretClickCount(nextVal);
    }
  };

  // Get dynamic category list based on live products
  const categories = useMemo(() => {
    const list = new Set(products.map(p => p.category));
    return ["Semua", ...Array.from(list)];
  }, [products]);

  // Handle branding theme preset
  const theme = useMemo(() => {
    switch (brandSettings.bgColorPreset) {
      case "gold":
        return {
          primary: "bg-amber-600 hover:bg-amber-700 text-white",
          accentText: "text-amber-700",
          accentBg: "bg-amber-50 border-amber-200",
          badge: "bg-amber-100 text-amber-800 border-amber-200",
          ring: "focus:ring-amber-500",
          heroGrad: "from-amber-50/80 via-stone-50 to-amber-50/40 text-stone-900",
          btnOutline: "border-amber-200 text-amber-800 hover:bg-amber-50",
          accentColor: "#d97706",
          pillActive: "bg-amber-700 text-white",
          footerBg: "bg-stone-50 border-t border-stone-100",
          priceText: "text-amber-700",
          selectedBg: "bg-amber-600 border-amber-600 text-white",
        };
      case "emerald":
        return {
          primary: "bg-emerald-600 hover:bg-emerald-700 text-white",
          accentText: "text-emerald-700",
          accentBg: "bg-emerald-50 border-emerald-200",
          badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
          ring: "focus:ring-emerald-500",
          heroGrad: "from-emerald-50/80 via-stone-50 to-emerald-50/40 text-emerald-900",
          btnOutline: "border-emerald-200 text-emerald-800 hover:bg-emerald-50",
          accentColor: "#059669",
          pillActive: "bg-emerald-700 text-white",
          footerBg: "bg-slate-50 border-t border-slate-100",
          priceText: "text-emerald-700",
          selectedBg: "bg-emerald-600 border-emerald-600 text-white",
        };
      case "stone":
        return {
          primary: "bg-stone-800 hover:bg-stone-900 text-white",
          accentText: "text-stone-800",
          accentBg: "bg-stone-100 border-stone-300",
          badge: "bg-stone-200 text-stone-800 border-stone-350",
          ring: "focus:ring-stone-500",
          heroGrad: "from-stone-50/80 via-stone-100 to-stone-50/40 text-stone-900",
          btnOutline: "border-stone-300 text-stone-800 hover:bg-stone-100",
          accentColor: "#292524",
          pillActive: "bg-stone-800 text-white",
          footerBg: "bg-stone-100/50 border-t border-stone-200",
          priceText: "text-stone-800",
          selectedBg: "bg-stone-800 border-stone-800 text-white",
        };
      default: // pink / rose
        return {
          primary: "bg-pink-600 hover:bg-pink-700 text-white",
          accentText: "text-pink-600",
          accentBg: "bg-pink-50 border-pink-100",
          badge: "bg-pink-100 text-pink-700 border-pink-200",
          ring: "focus:ring-pink-500",
          heroGrad: "from-[#FFF0F4] via-[#FDF5F2] to-[#FFF5F8] text-slate-800",
          btnOutline: "border-pink-200 text-pink-800 hover:bg-pink-50",
          accentColor: "#db2777",
          pillActive: "bg-pink-600 text-white",
          footerBg: "bg-pink-50/30 border-t border-pink-100/60",
          priceText: "text-pink-600",
          selectedBg: "bg-pink-600 border-pink-600 text-white",
        };
    }
  }, [brandSettings.bgColorPreset]);

  // Compute overall statistics or stock for active products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = selectedCategory === "Semua" || p.category === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const selectProductDetails = (product: Product) => {
    setSelectedProduct(product);
    // Auto preset first color and size, preferring the first in-stock variant if any
    if (product.variants && product.variants.length > 0) {
      const inStockVariant = product.variants.find(v => {
        const stockVal = v.availableStock !== undefined ? v.availableStock : v.stock;
        return stockVal > 0;
      });
      const defaultVariant = inStockVariant || product.variants[0];
      setSelectedSize(defaultVariant.size);
      setSelectedColor(defaultVariant.color);
    } else {
      setSelectedSize("");
      setSelectedColor("");
    }
  };

  // Find stock level for selected variant
  const selectedVariantDetails = useMemo(() => {
    if (!selectedProduct) return null;
    return selectedProduct.variants.find(
      v => v.size === selectedSize && v.color === selectedColor
    ) || null;
  }, [selectedProduct, selectedSize, selectedColor]);

  // Absolute total stock of a product
  const getProductTotalStock = (p: Product) => {
    return p.variants.reduce((acc, curr) => acc + (curr.availableStock !== undefined ? curr.availableStock : curr.stock), 0);
  };

  const getDynamicWhatsAppLink = (p: Product, variant: ProductVariant | null) => {
    const waNumber = "6281324366055"; // Indonesia country code prefix
    const size = selectedSize || "-";
    const color = selectedColor || "-";
    const sku = variant ? variant.sku : p.sku;
    const price = p.promoPrice || p.normalPrice;

    const text = `Halo *${brandSettings.company_name}*,\n\nSaya tertarik membeli produk yang tampil di website Jassinta Atelier:\n\n👗 *Nama Produk:* ${p.name}\n🔖 *SKU Pilihan:* ${sku}\n🎨 *Warna:* ${color}\n📏 *Ukuran:* ${size}\n💰 *Harga:* Rp ${price.toLocaleString("id-ID")}\n\nApakah stock tersebut tersedia untuk dikirimkan? Mohon panduan cara pemesanan. Terima kasih!`;
    return `https://api.whatsapp.com/send?phone=${waNumber}&text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 antialiased flex flex-col justify-between selection:bg-rose-100 text-sm">
      
      {/* Header Bar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-3xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {brandSettings.logo_img_base64 ? (
              <img 
                src={brandSettings.logo_img_base64} 
                className="h-10 w-auto object-contain cursor-pointer hover:scale-102 transition-transform select-none" 
                alt="Brand Logo" 
                onClick={handleSecretPortalTrigger}
                referrerPolicy="no-referrer"
              />
            ) : (
              <span 
                className="text-2xl animate-spin-slow cursor-pointer select-none hover:scale-110 transition-transform block"
                onClick={handleSecretPortalTrigger}
              >
                {brandSettings.logo_symbol || "🌸"}
              </span>
            )}
            <div className="leading-tight">
              <span 
                className="font-black text-lg tracking-tight bg-gradient-to-r from-slate-900 to-pink-700 bg-clip-text text-transparent hover:opacity-80 transition-opacity cursor-pointer select-none"
                onClick={handleSecretPortalTrigger}
              >
                {brandSettings.company_name}
              </span>
              <span className="block text-[10px] text-pink-600 font-extrabold uppercase tracking-widest leading-none mt-0.5">PREMIUM WOMEN'S WEAR</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Nav links */}
            <nav className="hidden md:flex items-center gap-6 text-xs text-slate-500 font-bold">
              <a href="#katalog" className="hover:text-slate-900 transition-colors">Koleksi Terbaru</a>
              <a href="#tentang" className="hover:text-slate-900 transition-colors">Cara Pemesanan</a>
              <span className="text-slate-300">&bull;</span>
              <span className="text-slate-400 font-mono text-[10px]">WA: 0813-2436-6055</span>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className={`relative overflow-hidden bg-gradient-to-r ${theme.heroGrad} py-16 sm:py-24 px-4 border-b border-pink-100/30`}>
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/4 bottom-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/80 rounded-full border border-pink-200/50 text-[11px] font-bold text-pink-700 uppercase tracking-widest mb-6 shadow-3xs">
            <Sparkles className="h-3.5 w-3.5 text-pink-500 animate-pulse" />
            KOLEKSI BUSANA WANITA MODERN TERBARU — JASSINTA ATELIER
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-[1.12]">
            Setiap Busana<br />Menyimpan Sebuah Cerita
          </h1>
          <p className="mt-5 text-sm sm:text-base text-slate-600 max-w-2xl mx-auto font-medium leading-relaxed font-sans">
            Dari helai kain yang dipilih dengan hati, lahir sebuah karya yang melekat bukan hanya di tubuh, tapi di dalam keindahan kenangan Anda.
          </p>

          <div className="mt-8 flex justify-center gap-3">
            <a 
              href="#katalog" 
              className={`px-6 py-3 rounded-xl font-bold transition-all shadow-md transform hover:-translate-y-0.5 text-xs ${theme.primary} flex items-center gap-2`}
            >
              Mulai Eksplorasi Stok <ShoppingBag className="h-4 w-4" />
            </a>
            <a 
              href="https://wa.me/6281324366055" 
              target="_blank" 
              rel="noreferrer"
              className="px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-bold text-xs transition-all shadow-3xs flex items-center gap-2"
            >
              Tanya Customer Service <Phone className="h-3.5 w-3.5 text-pink-600" />
            </a>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <main id="katalog" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full">
        
        {/* Search & Filter Header bar */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/60 shadow-3xs flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
          <div className="relative w-full md:w-80">
            <Search className="absolute inset-y-0 left-3 my-auto h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Cari dress, blazer, blouse, outerwear..." 
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 focus:border-pink-500 rounded-xl focus:outline-none focus:bg-white transition-all font-medium"
            />
          </div>

          {/* Dynamic Categories Tab Scroller */}
          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto justify-start md:justify-end overflow-x-auto">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 flex items-center gap-1 font-mono tracking-wider shrink-0 mr-1">
              <Filter className="h-3.5 w-3.5" /> Kategori:
            </span>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === cat 
                    ? theme.pillActive
                    : "bg-slate-100 text-slate-650 hover:bg-slate-200 border border-slate-200/20"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Live Catalog Status Notice */}
        <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-5 px-1 bg-slate-100 p-2 rounded-lg border border-slate-200/50">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 bg-emerald-500 rounded-full animate-ping" />
            Menampilkan <strong className="text-slate-700 font-bold font-sans">{filteredProducts.length}</strong> koleksi mode wanita pilihan
          </span>
          <span className="hidden sm:inline font-semibold text-rose-600 uppercase tracking-widest text-[9px]">DIKIRIM REALTIME SEGERA DARI GUDANG UTAMA INDONESIA</span>
        </div>

        {/* Product Grid */}
        {filteredProducts.length === 0 ? (
          <div className="my-16 text-center max-w-sm mx-auto">
            <div className="p-4 bg-slate-100 text-slate-400 rounded-full inline-block mb-3">
              <ShoppingBag className="h-10 w-auto opacity-70" />
            </div>
            <h3 className="text-base font-black text-slate-800">Koleksi Busana Tidak Ditemukan</h3>
            <p className="text-xs text-slate-500 mt-1">Coba masukkan kata kunci mode lain atau pilih menu kategori berbeda untuk memperbarui katalog online kami.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4 md:gap-6">
            {filteredProducts.map((p) => {
              const totalStock = getProductTotalStock(p);
              const isPromo = p.promoPrice && p.promoPrice < p.normalPrice;
              const discountPercent = isPromo 
                ? Math.round(((p.normalPrice - p.promoPrice) / p.normalPrice) * 100) 
                : 0;

              return (
                <div 
                  key={p.id}
                  onClick={() => selectProductDetails(p)}
                  className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden shadow-3xs hover:shadow-md hover:border-slate-300 group transition-all duration-200 cursor-pointer flex flex-col h-full"
                >
                  {/* Image Wrapper */}
                  <div className="relative aspect-square w-full bg-slate-100 overflow-hidden shrink-0">
                    {isPromo && (
                      <span className="absolute top-2.5 left-2.5 bg-rose-600 text-[9px] font-black tracking-wide text-white px-2 py-0.5 rounded-md z-10 select-none uppercase shadow-xs">
                        HEBAT -{discountPercent}%
                      </span>
                    )}

                    {totalStock <= 0 ? (
                      <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center p-3 text-center z-10">
                        <span className="bg-white/90 border border-slate-200 px-2.5 py-1 text-[10px] font-extrabold rounded-lg text-slate-800 uppercase tracking-wider shadow-md">
                          Habis Kontak Admin
                        </span>
                      </div>
                    ) : totalStock < 10 ? (
                      <span className="absolute bottom-2.5 left-2.5 bg-amber-500 text-[8px] font-bold text-white px-1.5 py-0.5 rounded-md z-10 uppercase tracking-widest shadow-2xs animate-pulse">
                        TERBATAS
                      </span>
                    ) : null}

                    {p.imageUrl ? (
                      <img 
                        src={p.imageUrl} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-350 pointer-events-none select-none"
                        alt={p.name}
                        draggable="false"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-350">
                        <ShoppingBag className="h-8 w-auto opacity-70" />
                        <span className="text-[9px] mt-1 text-slate-400 font-mono">No Photo URL</span>
                      </div>
                    )}
                  </div>

                  {/* Content Info */}
                  <div className="p-2.5 sm:p-3.5 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[8px] sm:text-[9px] font-extrabold uppercase tracking-wide text-slate-400 font-mono block">
                        {p.category}
                      </span>
                      <h3 className="font-extrabold text-[10px] sm:text-[13px] text-slate-850 tracking-tight line-clamp-1 sm:line-clamp-2 mt-0.5 group-hover:text-rose-650 transition-colors">
                        {p.name}
                      </h3>
                      <p className="text-[8px] sm:text-[10px] text-slate-400 font-semibold font-mono mt-0.5">
                        {p.sku}
                      </p>
                    </div>

                    <div className="mt-2 sm:mt-3.5 pt-1.5 sm:pt-2 border-t border-slate-100 flex flex-col justify-between gap-1">
                      <div>
                        {isPromo ? (
                          <div className="flex flex-col">
                            <span className="text-[8px] sm:text-[10px] text-slate-400 font-medium line-through leading-none">
                              IDR {p.normalPrice.toLocaleString("id-ID")}
                            </span>
                            <span className="text-[10px] sm:text-sm font-black text-rose-600 font-sans block mt-0.5">
                              IDR {p.promoPrice.toLocaleString("id-ID")}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] sm:text-sm font-black text-slate-800 font-sans block leading-none">
                            IDR {p.normalPrice.toLocaleString("id-ID")}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        {totalStock > 0 ? (
                          <span className="text-[8px] sm:text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            Ready: {totalStock}
                          </span>
                        ) : (
                          <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                            Habis
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* How to Order Banner */}
        <section id="tentang" className="mt-16 bg-white p-6 rounded-2xl border border-slate-200 shadow-3xs">
          <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
            <span className="p-1 px-1.5 bg-rose-100 text-rose-700 rounded-md">🛍️</span> ALUR MUDAH DAN CEPAT PEMESANAN DI JASSINTA ATELIER
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="flex gap-3">
              <span className="text-xl font-bold text-rose-500 font-mono shrink-0">01.</span>
              <div>
                <h4 className="font-bold text-slate-800">Pilih Busana Favorit Anda</h4>
                <p className="text-[11px] text-slate-505 mt-1">Jelajahi koleksi dress, blazer, blouse, hingga outerwear premium kami dari katalog terintegrasi pergudangan pintar.</p>
              </div>
            </div>
            <div className="flex gap-3 pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-slate-100 md:pl-5">
              <span className="text-xl font-bold text-rose-500 font-mono shrink-0">02.</span>
              <div>
                <h4 className="font-bold text-slate-800">Sesuaikan Varian</h4>
                <p className="text-[11px] text-slate-505 mt-1">Pilih ukuran dan warna serta tinjau detail ukuran lingkar dada (LD) atau lingkar pinggang (LP) secara presisi langsung di panel produk.</p>
              </div>
            </div>
            <div className="flex gap-3 pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-slate-100 md:pl-5">
              <span className="text-xl font-bold text-rose-500 font-mono shrink-0">03.</span>
              <div>
                <h4 className="font-bold text-slate-800">Checkout WhatsApp</h4>
                <p className="text-[11px] text-slate-505 mt-1">Klik pesan via WhatsApp. Pesan instan berspesifikasi SKU otomatis terbentuk rapi agar segera dilayani dengan ramah oleh tim CS.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Product Detail Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-55 flex items-center justify-center p-4 sm:p-6" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            
            {/* Overlay background */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProduct(null)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity" 
            />

            {/* Modal Container */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-white rounded-3xl text-left overflow-hidden shadow-2xl transform transition-all max-w-lg w-full z-10 flex flex-col max-h-[90vh] sm:max-h-[85vh] border border-slate-100"
            >
              {/* Header title & close button */}
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
                <span className="text-[10px] font-black uppercase text-pink-600 bg-pink-50 px-2.5 py-0.5 rounded border border-pink-100 tracking-wide">
                  Spesifikasi Detail Busana
                </span>
                <button 
                  onClick={() => setSelectedProduct(null)} 
                  className="p-1 text-slate-400 hover:text-slate-800 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="overflow-y-auto p-4 sm:p-6 space-y-5">
                {/* Product Core Info */}
                <div className="flex flex-col sm:flex-row gap-5">
                  {/* Left Column Image */}
                  <div className="w-full sm:w-64 aspect-square rounded-2xl bg-slate-100 relative overflow-hidden self-start shrink-0 border border-slate-200 group">
                    <img 
                      src={selectedProduct.imageUrl || "https://images.unsplash.com/photo-1608748010899-18f300247112?w=800&auto=format&fit=crop&q=80"} 
                      alt={selectedProduct.name}
                      className="w-full h-full object-cover pointer-events-none select-none transition-transform duration-700 group-hover:scale-105"
                      draggable="false"
                      referrerPolicy="no-referrer"
                      style={{ imageRendering: 'auto' }}
                    />
                  </div>

                  {/* Right Column Body Info */}
                  <div className="flex-1 min-w-0">
                    <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider block font-mono">{selectedProduct.category}</span>
                    <h2 className="text-base sm:text-lg font-black text-slate-800 tracking-tight leading-snug mt-1">{selectedProduct.name}</h2>
                    <p className="text-[10px] text-slate-400 font-bold font-mono mt-0.5">Katalog SKU: {selectedProduct.sku}</p>

                    <div className="flex items-baseline gap-2 mt-3">
                      {selectedProduct.promoPrice && selectedProduct.promoPrice < selectedProduct.normalPrice ? (
                        <>
                          <span className="text-base font-black text-rose-600 font-sans">
                            IDR {selectedProduct.promoPrice.toLocaleString("id-ID")}
                          </span>
                          <span className="text-[11px] text-slate-400 line-through line-clamp-1">
                            IDR {selectedProduct.normalPrice.toLocaleString("id-ID")}
                          </span>
                        </>
                      ) : (
                        <span className="text-base font-black text-slate-800 font-sans">
                          IDR {selectedProduct.normalPrice.toLocaleString("id-ID")}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 mt-3 font-medium leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      {selectedProduct.description || "Tidak ada deskripsi tambahan untuk produk ini."}
                    </p>
                  </div>
                </div>

                {/* Variant Configuration and Checkout Options inside shaded wrapper */}
                <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/50 space-y-4 font-sans">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    
                    {/* Size Selector */}
                    <div>
                      <label className="block text-slate-505 font-extrabold text-[10px] uppercase tracking-wider mb-1.5">PILIH UKURAN:</label>
                      <div className="flex flex-wrap gap-1.5">
                        {Array.from(new Set(selectedProduct.variants.map(v => v.size))).map(sz => (
                          <button
                            key={sz}
                            onClick={() => {
                              setSelectedSize(sz);
                              // Auto align first color for newly chosen size
                              const matchingColors = selectedProduct.variants.filter(v => v.size === sz);
                              if (matchingColors.length > 0 && !matchingColors.some(m => m.color === selectedColor)) {
                                  setSelectedColor(matchingColors[0].color);
                              }
                            }}
                            className={`px-2.5 py-1 rounded-md text-[10.5px] font-bold border transition-colors cursor-pointer ${
                              selectedSize === sz
                                ? theme.selectedBg
                                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            {sz}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Color Selector */}
                    <div>
                      <label className="block text-slate-550 font-extrabold text-[10px] uppercase tracking-wider mb-1.5">PILIH WARNA:</label>
                      <div className="flex flex-wrap gap-1.5">
                        {Array.from(new Set(selectedProduct.variants.filter(v => v.size === selectedSize).map(v => v.color))).map(cl => (
                          <button
                            key={cl}
                            onClick={() => setSelectedColor(cl)}
                            className={`px-2.5 py-1 rounded-md text-[10.5px] font-bold border transition-colors cursor-pointer ${
                              selectedColor === cl
                                ? theme.selectedBg
                                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            {cl}
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>

                  {/* Size Guide Details Sub-panel */}
                  {selectedVariantDetails && (selectedVariantDetails.lingkarDada || selectedVariantDetails.lingkarPinggang || selectedVariantDetails.lingkarPaha) ? (
                    <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-around text-center text-[10.5px]">
                      <div>
                        <span className="block text-[8px] font-extrabold uppercase text-slate-400">LD (Lingkar Dada)</span>
                        <span className="font-bold text-slate-800">{selectedVariantDetails.lingkarDada ? `${selectedVariantDetails.lingkarDada} cm` : "-"}</span>
                      </div>
                      <div className="h-6 w-px bg-slate-200" />
                      <div>
                        <span className="block text-[8px] font-extrabold uppercase text-slate-400">LP (Lingkar Pinggang)</span>
                        <span className="font-bold text-slate-800">{selectedVariantDetails.lingkarPinggang ? `${selectedVariantDetails.lingkarPinggang} cm` : "-"}</span>
                      </div>
                      <div className="h-6 w-px bg-slate-200" />
                      <div>
                        <span className="block text-[8px] font-extrabold uppercase text-slate-400">L.Paha (Paha)</span>
                        <span className="font-bold text-slate-800">{selectedVariantDetails.lingkarPaha ? `${selectedVariantDetails.lingkarPaha} cm` : "-"}</span>
                      </div>
                    </div>
                  ) : null}

                  {/* Stock level info for selection */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-700">
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium block">Lokasi & SKU Terkait</span>
                      <span className="font-mono text-slate-800 font-bold text-[10.5px]">SKU: {selectedVariantDetails?.sku || selectedProduct.sku}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-medium block">Stok Realtime Tersedia</span>
                      {selectedVariantDetails ? (
                        (() => {
                          const avail = selectedVariantDetails.availableStock !== undefined 
                            ? selectedVariantDetails.availableStock 
                            : selectedVariantDetails.stock;
                          return avail > 0 ? (
                            <span className="text-emerald-750 font-black text-sm">{avail} Unit Ready</span>
                          ) : (
                            <span className="text-rose-600 font-black text-sm">Stok Kosong</span>
                          );
                        })()
                      ) : (
                        <span className="text-rose-600 font-black text-sm">Stok Kosong</span>
                      )}
                    </div>
                  </div>

                  {/* WhatsApp order or pre-order CTA Button */}
                  <div className="pt-2">
                    {selectedVariantDetails && (selectedVariantDetails.availableStock !== undefined ? selectedVariantDetails.availableStock : selectedVariantDetails.stock) > 0 ? (
                      <a
                        href={getDynamicWhatsAppLink(selectedProduct, selectedVariantDetails)}
                        target="_blank"
                        rel="noreferrer"
                        className={`w-full py-3.5 rounded-xl text-sm font-black transition-all text-center flex items-center justify-center gap-2 shadow-md cursor-pointer ${theme.primary}`}
                      >
                        <Phone className="h-4.5 w-4.5 fill-current animate-pulse" /> Pesan Sekarang via WhatsApp Toko
                      </a>
                    ) : (
                      <a
                        href={`https://api.whatsapp.com/send?phone=6281324366055&text=${encodeURIComponent(
                          `Halo *${brandSettings.company_name}*,\n\nSaya tertarik dengan produk ini:\n\n👗 *Nama Produk:* ${selectedProduct.name}\n🔖 *SKU:* ${selectedVariantDetails?.sku || selectedProduct.sku}\n🎨 *Warna:* ${selectedColor || "-"}\n📏 *Ukuran:* ${selectedSize || "-"}\n\nNamun stok untuk varian warna/ukuran ini sedang kosong di landing page. Apakah bisa saya lakukan Pre-Order atau apakah akan segera diproduksi ulang?\n\nMohon bantuannya ya Sis, terima kasih!`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-3.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-black transition-all text-center flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                      >
                        <Phone className="h-4.5 w-4.5 text-pink-600 animate-pulse" /> Tanya Admin via WhatsApp (Pre-Order / Restok)
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>

          </div>
        )}
      </AnimatePresence>

      {/* Footer System */}
      <footer className={`${theme.footerBg} text-slate-500 py-12 px-4 mt-16 rounded-t-3xl border-t border-slate-200/40`}>
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-xs font-medium">
          
          <div>
            <div className="flex items-center gap-2 text-slate-800">
              <span className="text-lg">{brandSettings.logo_symbol || "🌸"}</span>
              <span className="font-extrabold text-sm">{brandSettings.company_name}</span>
            </div>
            <p className="mt-3 text-slate-500 leading-relaxed font-sans">
              Atelier busana wanita modern dan premium berstandardisasi logistik pergudangan cerdas. Menghadirkan siluet kontemporer berestetika tinggi, detail jahitan ultra-rapi, dan material bertekstur nyaman untuk menunjang penuh kepercayaan diri Anda sepanjang hari.
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            <span className="text-slate-800 font-extrabold uppercase tracking-widest text-[10px]">TENTANG TENANT</span>
            <span className="text-slate-500 hover:text-slate-800 transition-colors">Telp: 0813-2436-6055</span>
            <span className="text-slate-500 hover:text-slate-800 transition-colors">Instagram: @jassinta.atelier</span>
            <span className="text-slate-500 leading-relaxed">Alamat: Jalan Taman Induk, Gg Sian Ali, No.50A, Kota Depok, 16437</span>
          </div>

          <div className="flex flex-col gap-2.5">
            <span className="text-slate-800 font-extrabold uppercase tracking-widest text-[10px]">VERIFIKASI INTEGRITAS GUDANG</span>
            <div className="p-3 bg-white/75 border border-slate-200/80 rounded-xl text-[10px] text-slate-500 leading-relaxed font-mono shadow-3xs">
              <span className="block font-bold text-slate-700">System Code Audit: WMS-v4.0</span>
              <span className="block mt-1">Status database: <strong className="text-emerald-600 font-extrabold">Terhubung (Sync Realtime)</strong></span>
              <span className="block">Batas waktu kuota: Aman (Koleksi Auto Kompresi)</span>
            </div>
          </div>

        </div>

        <div className="max-w-7xl mx-auto mt-10 pt-6 border-t border-slate-200/60 text-center flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-bold text-slate-400">
          <p>© 2026 {brandSettings.company_name}. Hubungan langsung dengan server logistik ERP garmen pusat terintegrasi.</p>
          
          <div className="flex items-center gap-2 select-none">
            <span className="font-medium text-[10px] text-slate-400 uppercase tracking-widest leading-none">Sistem internal Jasinta</span>
            {/* Extremely quiet discrete indicator without titles to mask admin access */}
            <span 
              onClick={handleSecretPortalTrigger} 
              className="w-1.5 h-1.5 bg-slate-200 hover:bg-rose-300 rounded-full cursor-pointer transition-colors"
            />
          </div>
        </div>
      </footer>

    </div>
  );
}
