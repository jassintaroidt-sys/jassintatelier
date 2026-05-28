import React, { useState, useEffect } from "react";
import { 
  LayoutDashboard, Boxes, ShoppingBag, Coins, Sparkles, Cpu, Users, Settings, Menu, X, ArrowUpRight, LogOut, Key, RotateCcw
} from "lucide-react";

// Types
import { Product, Order, StockHistory, Transaction, Karyawan } from "./types";

// Initial Datasets
import { 
  INITIAL_PRODUCTS, INITIAL_ORDERS, INITIAL_STOCK_HISTORY, INITIAL_TRANSACTIONS, INITIAL_KARYAWAN 
} from "./initialData";

// Components
import DashboardView from "./components/DashboardView";
import KatalogView from "./components/KatalogView";
import PesananView from "./components/PesananView";
import SettingsView from "./components/SettingsView";
import KeuanganView from "./components/KeuanganView";
import AIAssistantView from "./components/AIAssistantView";
import SmartScanView from "./components/SmartScanView";
import MarketplaceWAView from "./components/MarketplaceWAView";
import KaryawanGudangView from "./components/KaryawanGudangView";

import LoginView from "./components/LoginView";
import ChangePasswordModal from "./components/ChangePasswordModal";
import PublicStoreView from "./components/PublicStoreView";

import { useFirebase } from "./lib/FirebaseProvider";

export default function App() {
  const { 
    user, 
    loading, 
    products, 
    orders,
    stockHistory,
    transactions,
    karyawanList,
    brandSettings,
    categories,
    logout,
    updateProducts,
    updateOrders,
    updateStockHistory,
    updateTransactions,
    updateKaryawan,
    updateBrandSettings,
    updateCategories,
    upsertProduct,
    deleteProduct
  } = useFirebase() as any;

  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [showAdminLogin, setShowAdminLogin] = useState<boolean>(false);

  // Dynamics of Favicon and Document Title
  useEffect(() => {
    document.title = `${brandSettings.company_name} | WMS Enterprise`;
    
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.font = "24px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(brandSettings.logo_symbol || "🌸", 16, 17);
        
        let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
        if (!link) {
          link = document.createElement("link");
          link.rel = "icon";
          document.getElementsByTagName("head")[0].appendChild(link);
        }
        link.href = canvas.toDataURL();
      }
    } catch (e) {
      console.error("Failed to generate dynamic favicon", e);
    }
  }, [brandSettings.company_name, brandSettings.logo_symbol]);

  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [resetConfirm, setResetConfirm] = useState<boolean>(false);

  const handleResetData = async () => {
    if (resetConfirm) {
      // In Firebase, we'd delete all docs. For now, let's just clear locally if needed
      // but the provider should handle it.
      await updateProducts([]);
      await updateOrders([]);
      await updateStockHistory([]);
      await updateTransactions([]);
      // await updateKaryawan(INITIAL_KARYAWAN);
      
      setResetConfirm(false);
    } else {
      setResetConfirm(true);
      setTimeout(() => {
        setResetConfirm(false);
      }, 4000);
    }
  };

  const menuItems = [
    { id: "dashboard", label: "Pusat Komando (Dashboard)", icon: LayoutDashboard },
    { id: "katalog-stok", label: "Katalog & Stok Gudang", icon: Boxes },
    { id: "transaksi-pesanan", label: "Transaksi & Pesanan", icon: ShoppingBag },
    { id: "keuangan", label: "Keuangan & Buku Kas", icon: Coins },
    { id: "ai-assistant", label: "AI Assistant (Advisor & CS Bot)", icon: Sparkles },
    { id: "smart-scan", label: "Smart Scan & AI OCR", icon: Cpu },
    { id: "marketplace-wa", label: "Marketplace & WhatsApp WA", icon: Settings },
    { id: "karyawan-gudang", label: "Karyawan & Gudang Digital", icon: Users },
    { id: "settings", label: "Sistem, Retur & Audit Log", icon: Settings },
  ];

  const renderActiveView = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <DashboardView 
            products={products} 
            orders={orders} 
            transactions={transactions} 
            setActiveTab={setActiveTab} 
          />
        );
      case "katalog-stok":
        return (
          <KatalogView 
            products={products} 
            setProducts={updateProducts} 
            upsertProduct={upsertProduct}
            deleteProduct={deleteProduct}
            stockHistory={stockHistory} 
            setStockHistory={updateStockHistory} 
            categories={categories}
            setCategories={updateCategories}
          />
        );
      case "transaksi-pesanan":
        return (
          <PesananView 
            orders={orders} 
            setOrders={updateOrders} 
            products={products}
            setProducts={updateProducts}
            upsertProduct={upsertProduct}
            setStockHistory={updateStockHistory}
            transactions={transactions}
            setTransactions={updateTransactions}
            brandSettings={brandSettings}
          />
        );
      case "keuangan":
        return (
          <KeuanganView 
            transactions={transactions} 
            setTransactions={updateTransactions} 
          />
        );
      case "ai-assistant":
        return (
          <AIAssistantView 
            products={products} 
            orders={orders} 
            transactions={transactions} 
          />
        );
      case "smart-scan":
        return (
          <SmartScanView 
            products={products} 
            setProducts={updateProducts} 
            upsertProduct={upsertProduct}
            setStockHistory={updateStockHistory}
            transactions={transactions}
            setTransactions={updateTransactions}
          />
        );
      case "marketplace-wa":
        return (
          <MarketplaceWAView 
            products={products} 
            setProducts={updateProducts} 
            upsertProduct={upsertProduct}
            orders={orders} 
            setOrders={updateOrders} 
            transactions={transactions} 
            setTransactions={updateTransactions} 
            setStockHistory={updateStockHistory}
          />
        );
      case "karyawan-gudang":
        return (
          <KaryawanGudangView 
            karyawanList={karyawanList} 
            setKaryawanList={updateKaryawan} 
            products={products}
            orders={orders} 
          />
        );
      case "settings":
        return <SettingsView />;
      default:
        return <p className="text-sm italic text-slate-450 text-center py-10">Layanan tidak ditemukan.</p>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-pink-500/20 border-t-pink-500 rounded-full animate-spin"></div>
          <p className="text-pink-200 font-bold animate-pulse">Menghubungkan ke Jassinta Master...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (showAdminLogin) {
      return (
        <div className="relative min-h-screen bg-slate-900 overflow-x-hidden">
          {/* Subtle Back Button for user comfort */}
          <div className="absolute top-6 left-6 z-50">
            <button 
              onClick={() => setShowAdminLogin(false)}
              className="px-4.5 py-2.5 bg-slate-800 hover:bg-slate-750 text-white border border-slate-700/50 rounded-xl text-xs font-black shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              &larr; Kembali ke Landing Page Toko
            </button>
          </div>
          <LoginView onLoginSuccess={() => {
            setShowAdminLogin(false);
          }} />
        </div>
      );
    }
    return (
      <PublicStoreView 
        products={products} 
        brandSettings={brandSettings} 
        onEnterWms={() => setShowAdminLogin(true)} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex text-slate-800 antialiased selection:bg-pink-100 selection:text-pink-900">
      
      {/* Mobile Backdrop overlay when sidebar is open */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-30 transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Top Header bar */}
      <div className="lg:hidden fixed top-0 inset-x-0 bg-slate-900 text-white z-40 p-4 border-b border-pink-950 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2">
          {brandSettings.logo_img_base64 ? (
            <img src={brandSettings.logo_img_base64} className="h-6 w-auto object-contain" alt="Logo" referrerPolicy="no-referrer" />
          ) : (
            <span className="text-xl animate-pulse">{brandSettings.logo_symbol}</span>
          )}
          <span className="font-extrabold text-[15px] tracking-wide text-pink-100 uppercase">{brandSettings.company_name}</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 hover:bg-slate-800 rounded-lg text-pink-200 transition-colors cursor-pointer"
        >
          {sidebarOpen ? <X className="h-5.5 w-5.5" /> : <Menu className="h-5.5 w-5.5" />}
        </button>
      </div>

      {/* Sidebar navigation */}
      <aside 
        className={`fixed inset-y-0 left-0 bg-slate-900 text-white border-r border-pink-950/20 w-72 p-6 z-40 flex flex-col justify-between overflow-y-auto gap-8 transition-transform duration-300 transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="space-y-6">
          {/* Logo & Title branding */}
          <div className="flex items-center justify-between border-b border-pink-950/40 pb-5">
            <div className="flex items-center gap-2.5">
              {brandSettings.logo_img_base64 ? (
                <img src={brandSettings.logo_img_base64} className="h-7 w-auto object-contain rounded bg-white p-0.5" alt="Logo" referrerPolicy="no-referrer" />
              ) : (
                <span className="text-2xl animate-pulse">{brandSettings.logo_symbol}</span>
              )}
              <div>
                <h1 className="font-extrabold text-[15px] tracking-wider text-pink-100 uppercase leading-tight select-none">{brandSettings.company_name}</h1>
                <p className="text-[10px] text-pink-300 font-medium">Sistem ERP + AI v3.0</p>
              </div>
            </div>
            
            {/* Close button inside mobile menu drawer */}
            <button 
              onClick={() => setSidebarOpen(false)} 
              className="lg:hidden p-1.5 hover:bg-slate-800 text-pink-300 rounded-lg cursor-pointer"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {menuItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              const getActiveColorClass = () => {
                if (brandSettings.bgColorPreset === "gold") return "bg-amber-600 text-black shadow-md font-bold";
                if (brandSettings.bgColorPreset === "emerald") return "bg-emerald-600 text-white shadow-md font-bold";
                if (brandSettings.bgColorPreset === "stone") return "bg-stone-600 text-white shadow-md font-bold";
                return "bg-pink-600 text-white shadow-md font-bold";
              };
              
              const getIconColorClass = () => {
                if (isActive) return "text-white";
                if (brandSettings.bgColorPreset === "gold") return "text-amber-500";
                if (brandSettings.bgColorPreset === "emerald") return "text-emerald-400";
                if (brandSettings.bgColorPreset === "stone") return "text-stone-400";
                return "text-pink-400";
              };

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    // Automatically collapse sidebar on mobile
                    if (window.innerWidth < 1024) {
                      setSidebarOpen(false);
                    }
                  }}
                  className={`w-full text-left p-3 rounded-lg text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
                    isActive 
                      ? getActiveColorClass()
                      : "text-slate-350 hover:bg-slate-800/80 hover:text-white"
                  }`}
                >
                  <Icon className={`h-4.5 w-4.5 shrink-0 ${getIconColorClass()}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div>
          <button
            onClick={() => setShowPasswordModal(true)}
            className="w-full mb-2 text-left p-3 rounded-lg text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <Key className="h-4.5 w-4.5 shrink-0 text-slate-500" />
            <span className="truncate">Ganti Password</span>
          </button>

          <button
            onClick={handleResetData}
            className={`w-full mb-2 text-left p-3 rounded-lg text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
              resetConfirm 
                ? "bg-amber-950/40 text-amber-500 border border-amber-955/30 hover:bg-amber-950/50" 
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <RotateCcw className={`h-4.5 w-4.5 shrink-0 ${resetConfirm ? "text-amber-500" : "text-slate-500"}`} />
            <span className="truncate">{resetConfirm ? "Yakin? Klik tuk Kosongkan!" : "Kosongkan Seluruh Data"}</span>
          </button>

          <button
            onClick={logout}
            className="w-full mb-4 text-left p-3 rounded-lg text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer text-slate-400 hover:bg-red-950/30 hover:text-red-400"
          >
            <LogOut className="h-4.5 w-4.5 shrink-0 text-red-500/70" />
            <span className="truncate">Keluar Sistem</span>
          </button>
          
          {/* Brand signature credit line to protect workspace aesthetics */}
          <div className="pt-4 border-t border-pink-950/30 text-[10px] text-pink-300/40 font-mono tracking-wide">
            <p>© 2026 JASSINTA ATELIER ERP</p>
            <p className="mt-1">PANDUAN EDISI LENGKAP v2.0</p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 lg:pl-72 pt-[68px] lg:pt-0 min-h-screen flex flex-col justify-between">
        <div className="p-4 sm:p-6 md:p-8 max-w-[1440px] mx-auto w-full space-y-6">
          {renderActiveView()}
        </div>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-white p-5 text-center text-xs text-slate-400 font-medium">
          Dibuat berdasarkan Dokumen Perencanaan Bisnis &bull; Edisi Mei 2026 &bull; Jassinta Atelier + AI Assistant
        </footer>
      </main>

      <ChangePasswordModal 
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </div>
  );
}
