import React, { useState, useEffect } from "react";
import { 
  TrendingUp, ShoppingBag, AlertTriangle, MessageSquare, 
  Sparkles, Loader2, ArrowUpRight, Activity, Calendar, Clock,
  Shield, User, X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Product, Order, Transaction } from "../types";
import { useFirebase } from "../lib/FirebaseProvider";

const formatContent = (text: string) => {
  if (!text) return null;

  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  
  let currentList: React.ReactNode[] = [];
  let isNumberedList = false;

  const flushList = (key: string) => {
    if (currentList.length > 0) {
      if (isNumberedList) {
        elements.push(
          <div key={`ol-${key}`} className="pl-1.5 space-y-2 my-2.5 font-sans text-xs flex flex-col">
            {currentList}
          </div>
        );
      } else {
        elements.push(
          <div key={`ul-${key}`} className="pl-1.5 space-y-2 my-2.5 font-sans text-xs flex flex-col">
            {currentList}
          </div>
        );
      }
      currentList = [];
    }
  };

  const parseInlineStyles = (txt: string) => {
    const parts = txt.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="font-extrabold text-white bg-pink-500/20 px-1 rounded-sm border-b border-pink-400">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList(`flush-${index}`);
      elements.push(<div key={`space-${index}`} className="h-2" />);
      return;
    }

    if (trimmed.startsWith("###")) {
      flushList(`flush-${index}`);
      elements.push(
        <h3 key={`h3-${index}`} className="font-extrabold text-white text-xs md:text-[13px] mt-4 mb-2 bg-pink-500/10 border-l-4 border-pink-400 p-2 rounded-r-lg flex items-center gap-2">
          <span>✨</span>
          <span>{parseInlineStyles(trimmed.replace(/^###\s*/, ""))}</span>
        </h3>
      );
      return;
    }
    if (trimmed.startsWith("####")) {
      flushList(`flush-${index}`);
      elements.push(
        <h4 key={`h4-${index}`} className="font-bold text-pink-200 text-xs mt-3 mb-1.5 pl-2 border-l-2 border-pink-400">
          {parseInlineStyles(trimmed.replace(/^####\s*/, ""))}
        </h4>
      );
      return;
    }

    const bulletMatch = trimmed.match(/^([•\*\-\+])\s+(.*)/);
    if (bulletMatch) {
      if (isNumberedList) {
        flushList(`flush-${index}`);
      }
      isNumberedList = false;
      currentList.push(
        <div key={`li-${index}`} className="leading-relaxed text-pink-100 flex items-start gap-2.5">
          <span className="text-pink-400 mt-1 select-none font-extrabold text-[10px] shrink-0">🌸</span>
          <span className="flex-1 text-pink-100 text-xs font-sans leading-relaxed">{parseInlineStyles(bulletMatch[2])}</span>
        </div>
      );
      return;
    }

    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numberedMatch) {
      if (!isNumberedList) {
        flushList(`flush-${index}`);
      }
      isNumberedList = true;
      currentList.push(
        <div key={`li-${index}`} className="leading-relaxed text-pink-100 flex items-start gap-2">
          <span className="text-pink-300 font-bold font-mono text-xs text-right w-5 pt-0.5 shrink-0 select-none bg-pink-500/10 rounded-sm py-0.5 text-center">{numberedMatch[1]}.</span>
          <span className="flex-1 text-pink-100 text-xs font-sans leading-relaxed">{parseInlineStyles(numberedMatch[2])}</span>
        </div>
      );
      return;
    }

    flushList(`flush-${index}`);
    elements.push(
      <p key={`p-${index}`} className="leading-relaxed text-pink-50 text-xs font-sans mb-1">
        {parseInlineStyles(trimmed)}
      </p>
    );
  });

  flushList("final");
  return <div className="space-y-1">{elements}</div>;
};

interface DashboardProps {
  products: Product[];
  orders: Order[];
  transactions: Transaction[];
  setActiveTab: (tab: string) => void;
}

export default function DashboardView({ products, orders, transactions, setActiveTab }: DashboardProps) {
  const { auditLogs, addAuditLog, updateAuditLogs } = useFirebase() as any;
  const [aiSummary, setAiSummary] = useState<string>("");
  const [loadingAi, setLoadingAi] = useState<boolean>(false);
  const [selectedChartPeriod, setSelectedChartPeriod] = useState<"Harian" | "Mingguan">("Harian");

  const [activeToast, setActiveToast] = useState<any | null>(null);

  useEffect(() => {
    const handleAlert = async (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        const newAlert = customEvent.detail;
        await addAuditLog(newAlert);
        
        setActiveToast(null);
        setTimeout(() => {
          setActiveToast(newAlert);
        }, 50);
      }
    };
    window.addEventListener("jassinta-security-alert", handleAlert);
    return () => {
      window.removeEventListener("jassinta-security-alert", handleAlert);
    };
  }, []);

  useEffect(() => {
    if (activeToast) {
      const t = setTimeout(() => {
        setActiveToast(null);
      }, 6000);
      return () => clearTimeout(t);
    }
  }, [activeToast]);

  // Calculate stats
  const totalOmzet = orders
    .filter(o => o.status === "Selesai" || o.status === "Kirim")
    .reduce((sum, o) => sum + o.total, 0);

  const pendingConfirmation = orders.filter(o => o.status === "Tunda").length;
  const processingCount = orders.filter(o => o.status === "Proses").length;
  
  // Count low stock items (any variant stock < 5)
  const lowStockProducts = products.filter(p => 
    p.variants.some(v => v.stock < 5)
  );

  const totalStockAlerts = lowStockProducts.length;

  const [aiStatus, setAiStatus] = useState({ hasGemini: false, hasOpenAI: false });

  // Check AI health on mount
  useEffect(() => {
    fetch("/api/health")
      .then(r => r.json())
      .then(data => {
        setAiStatus({ hasGemini: data.hasGeminiKey, hasOpenAI: data.hasOpenAIKey });
      })
      .catch(() => {});
  }, []);

  const getApiPrefix = () => {
    if (aiStatus.hasOpenAI) return "/api/openai";
    return "/api/gemini";
  };

  // Generate dynamic AI Summary on load or click
  const fetchAISummary = async () => {
    setLoadingAi(true);
    try {
      const res = await fetch(`${getApiPrefix()}/advisor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Berikan Ringkasan Bisnis Pagi Ini secara komprehensif, rapi, dan terstruktur dengan paragraf pendek, huruf tebal-tipis, dan bullet points.",
          products,
          orders,
          transactions
        })
      });
      const data = await res.json();
      if (data.text) {
        setAiSummary(data.text);
      } else {
        setAiSummary("Gagal mengambil ringkasan AI.");
      }
    } catch (err) {
      setAiSummary("Gagal terhubung dengan asisten AI.");
    } finally {
      setLoadingAi(false);
    }
  };

  useEffect(() => {
    fetchAISummary();
  }, []);

  return (
    <div id="dashboard-view" className="space-y-6">
      {/* Upper header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-pink-100 shadow-xs">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-800">Pusat Komando Jassinta</h2>
            <p className="text-[11px] sm:text-sm text-slate-500 mt-1">
              Real-time monitoring butik fashion premium hari ini.
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 bg-pink-50/50 px-3 sm:px-4 py-2 rounded-xl border border-pink-100/50 self-start sm:self-auto">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="text-[10px] sm:text-xs font-mono font-medium text-slate-600 block">
              SISTEM AKTIF
            </span>
            <span className="text-[10px] sm:text-xs text-slate-400">|</span>
            <span className="text-[10px] sm:text-xs text-slate-600 font-medium">Mei 2026</span>
          </div>
        </div>

      {/* Real-time Security Notification Banner */}
      <div className="bg-white rounded-2xl border border-rose-100 shadow-xs overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
        <div className="p-4 bg-rose-50/40 border-b border-rose-100/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 bg-rose-500/15 text-rose-600 rounded-lg animate-pulse">
              <Shield className="h-4.5 w-4.5" />
            </span>
            <div>
              <h3 className="font-extrabold text-[13px] text-slate-800 tracking-tight flex items-center gap-2">
                Live Feed Keamanan & Perubahan Sensitif
                <span className="inline-flex items-center gap-1 bg-emerald-50 text-[9px] font-bold text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                  <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-ping" />
                  SISTEM AKTIF
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">Arsip validasi token enkripsi dan manipulasi branding / log data sensitif.</p>
            </div>
          </div>
          <button 
            onClick={() => {
              updateAuditLogs([]);
            }}
            className="text-[10px] text-slate-400 hover:text-rose-600 font-semibold underline cursor-pointer"
          >
            Bersihkan Log
          </button>
        </div>
        <div className="divide-y divide-slate-100">
          {auditLogs.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400">
              Tidak ada aktivitas mencurigakan atau perubahan sensitif terpantau saat ini. All systems nominal.
            </div>
          ) : (
            auditLogs.slice(0, 3).map((log: any) => {
              const badgeBg = log.type === "SECURITY" ? "bg-red-50 text-red-700 border-red-200" :
                              log.type === "BRANDING" ? "bg-blue-50 text-blue-700 border-blue-200" :
                              log.type === "STOCK" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-50 text-slate-700 border-slate-200";
              return (
                <div key={log.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <span className={`px-2 py-0.5 text-[9px] font-black rounded-md border tracking-wider uppercase shrink-0 mt-0.5 ${badgeBg}`}>
                      {log.type}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-700 font-sans leading-relaxed">{log.message}</p>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400 font-medium">
                        <span className="flex items-center gap-1 font-mono text-[9px]">
                          <Clock className="h-3 w-3" /> {log.timestamp}
                        </span>
                        <span>&bull;</span>
                        <span className="font-semibold text-slate-500 flex items-center gap-1">
                          <User className="h-3 w-3" /> {log.user}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="sm:text-right shrink-0">
                    <span className="text-[10px] text-slate-400 font-mono font-medium block">IP Address</span>
                    <span className="text-[10px] text-slate-600 font-bold font-mono">{log.ip}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Floating Dynamic Security Toaster */}
      <AnimatePresence>
        {activeToast && (
          <motion.div
            initial={{ opacity: 0, y: -55, x: typeof window !== 'undefined' && window.innerWidth > 640 ? 0 : "-50%" }}
            animate={{ opacity: 1, y: 0, x: typeof window !== 'undefined' && window.innerWidth > 640 ? 0 : "-50%" }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-6 right-6 z-50 bg-slate-900 text-white rounded-xl shadow-2xl p-4 max-w-sm w-full border border-rose-500/40 divide-y divide-slate-800 animate-in fade-in duration-200 animate-out duration-150"
            style={{
              boxShadow: "0 20px 40px -15px rgba(0,0,0,0.5)"
            }}
          >
            <div className="pb-2.5 flex items-start gap-3">
              <div className="p-1.5 bg-rose-600 rounded-lg shrink-0 mt-0.5 animate-pulse">
                <Shield className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-rose-400 font-mono block">Notifikasi Keamanan</span>
                <p className="text-xs font-bold text-white mt-0.5 leading-relaxed">{activeToast.message}</p>
              </div>
              <button onClick={() => setActiveToast(null)} className="text-slate-500 hover:text-white shrink-0 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="pt-2.5 flex items-center justify-between text-[10px] text-slate-400">
              <span className="font-mono">{activeToast.timestamp} &bull; {activeToast.user}</span>
              <span className="font-mono text-rose-400/80 bg-rose-950/40 px-1.5 py-0.5 rounded font-bold">{activeToast.ip}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Executive Summary Widget */}
      <div className="bg-gradient-to-r from-slate-900 via-pink-950 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-pink-900/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-48 h-48 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-pink-500/20 text-pink-300 rounded-lg border border-pink-500/30">
              <Sparkles className="h-5 w-5 animate-spin" style={{ animationDuration: '4s' }} />
            </span>
            <div>
              <h3 className="font-bold text-base tracking-tight text-white flex items-center gap-2">
                Asisten AI: Ringkasan Bisnis Pagi Ini
              </h3>
              <p className="text-xs text-pink-200/80">Analisis cerdas AI untuk Jassinta Atelier</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              id="refresh-ai-summary-btn"
              onClick={fetchAISummary}
              disabled={loadingAi}
              className="text-xs bg-white/10 hover:bg-white/20 text-white font-medium px-3.5 py-1.5 rounded-lg transition-all border border-white/10 flex items-center gap-1 cursor-pointer"
            >
              {loadingAi ? <Loader2 className="h-3 w-3 animate-spin" /> : <Activity className="h-3 w-3" />}
              Refresh AI
            </button>
            <button 
              onClick={() => setActiveTab("transaksi-pesanan")}
              className="text-xs bg-pink-600 hover:bg-pink-700 text-white font-bold px-3.5 py-1.5 rounded-lg transition-all shadow-sm flex items-center gap-1 cursor-pointer"
            >
              <ShoppingBag className="h-3 w-3" />
              Buka Kasir
            </button>
          </div>
        </div>

        <div className="mt-4 text-sm leading-relaxed text-pink-50/90 font-sans border-t border-white/10 pt-4 relative z-10">
          {loadingAi ? (
            <div className="flex items-center gap-3 py-2 text-pink-200/70">
              <Loader2 className="h-4 w-4 animate-spin text-pink-400" />
              <span>Claude-Biz sedang membedah arus kas dan tren stok di gudang...</span>
            </div>
          ) : (
            <div className="text-[12.5px] font-normal leading-relaxed text-pink-50">
              {aiSummary ? formatContent(aiSummary) : (
                <p className="italic text-[13.5px] text-pink-200">
                  "Selamat datang! Tekan tombol Refresh AI untuk memicu asisten cerdas menganalisis omzet dan status inventaris Anda."
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
        {/* Omzet Card */}
        <div id="kpi-omzet" className="bg-white p-3 sm:p-5 rounded-2xl border border-pink-100 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] sm:text-xs text-slate-500 font-medium tracking-wide">TOTAL OMZET</p>
              <h4 className="text-sm sm:text-lg md:text-2xl font-bold text-slate-800 mt-1 sm:mt-2">
                IDR {totalOmzet.toLocaleString("id-ID")}
              </h4>
            </div>
            <span className="p-1.5 sm:p-2.5 bg-emerald-50 text-emerald-600 rounded-lg sm:rounded-xl border border-emerald-100 shrink-0">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:h-5" />
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-3 sm:mt-4 text-[9px] sm:text-xs text-emerald-600 font-medium">
            <span className="bg-emerald-100 px-1 py-0.5 rounded-sm">+18.4%</span>
            <span className="text-slate-400 hidden sm:inline">vs mgg lalu</span>
          </div>
        </div>

        {/* Orders Card */}
        <div id="kpi-pesanan" className="bg-white p-3 sm:p-5 rounded-2xl border border-pink-100 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] sm:text-xs text-slate-500 font-medium tracking-wide">ORDER AKTIF</p>
              <h4 className="text-sm sm:text-lg md:text-2xl font-bold text-slate-800 mt-1 sm:mt-2">
                {processingCount + pendingConfirmation} <span className="text-[10px] sm:text-sm font-normal text-slate-400">Pcs</span>
              </h4>
            </div>
            <span className="p-1.5 sm:p-2.5 bg-pink-50 text-pink-600 rounded-lg sm:rounded-xl border border-pink-100 shrink-0">
              <ShoppingBag className="h-4 w-4 sm:h-5 sm:h-5" />
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-3 sm:mt-4 text-[9px] sm:text-xs text-amber-600 font-medium">
            <span className="bg-amber-100 px-1 py-0.5 rounded-sm">{pendingConfirmation} Tunda</span>
          </div>
        </div>

        {/* Low Stock Alarm Card */}
        <div id="kpi-alert-stok" className="bg-white p-3 sm:p-5 rounded-2xl border border-pink-100 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] sm:text-xs text-slate-500 font-medium tracking-wide">STOK MENIPIS</p>
              <h4 className="text-sm sm:text-lg md:text-2xl font-bold text-slate-800 mt-1 sm:mt-2">
                {totalStockAlerts} <span className="text-[10px] sm:text-sm font-normal text-slate-400">SKU</span>
              </h4>
            </div>
            <span className={`p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl border shrink-0 ${totalStockAlerts > 0 ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-slate-50 text-slate-400 border-slate-100"}`}>
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:h-5" />
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-3 sm:mt-4 text-[9px] sm:text-xs">
            {totalStockAlerts > 0 ? (
              <span className="text-rose-600 font-medium animate-pulse">Butuh Restok</span>
            ) : (
              <span className="text-emerald-600 font-medium whitespace-nowrap">Semua Aman</span>
            )}
          </div>
        </div>

        {/* Interactive Chats Card */}
        <div id="kpi-chats" className="bg-white p-3 sm:p-5 rounded-2xl border border-pink-100 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] sm:text-xs text-slate-500 font-medium tracking-wide">RESPONS CHAT</p>
              <h4 className="text-sm sm:text-lg md:text-2xl font-bold text-slate-800 mt-1 sm:mt-2">
                 98%
              </h4>
            </div>
            <span className="p-1.5 sm:p-2.5 bg-blue-50 text-blue-600 rounded-lg sm:rounded-xl border border-blue-100 shrink-0">
              <MessageSquare className="h-4 w-4 sm:h-5 sm:h-5" />
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-3 sm:mt-4 text-[9px] sm:text-xs text-blue-600 font-medium">
            <span className="bg-blue-100 px-1 py-0.5 rounded-sm">Jassinta Bot</span>
          </div>
        </div>
      </div>

      {/* Main Graph & Alert panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Graph - Interactive SVG Graphic */}
        <div className="lg:col-span-2 bg-white p-4 sm:p-6 rounded-2xl border border-pink-100 shadow-xs flex flex-col justify-between overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-800 text-base sm:text-lg">Grafik Penjualan Butik</h3>
              <p className="text-[10px] sm:text-xs text-slate-400">Arus omzet harian & mingguan</p>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-lg self-start sm:self-auto overflow-x-auto max-w-full">
              <button
                onClick={() => setSelectedChartPeriod("Harian")}
                className={`text-[10px] sm:text-xs px-2.5 sm:px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer whitespace-nowrap ${selectedChartPeriod === "Harian" ? "bg-white text-slate-800 shadow-2xs" : "text-slate-500 hover:text-slate-800"}`}
              >
                Harian
              </button>
              <button
                onClick={() => setSelectedChartPeriod("Mingguan")}
                className={`text-[10px] sm:text-xs px-2.5 sm:px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer whitespace-nowrap ${selectedChartPeriod === "Mingguan" ? "bg-white text-slate-800 shadow-2xs" : "text-slate-500 hover:text-slate-800"}`}
              >
                Mingguan
              </button>
            </div>
          </div>

          {/* SVG Area Chart */}
          <div className="mt-6 h-40 sm:h-64 w-full relative">
            <svg viewBox="0 0 500 220" className="w-full h-full">
              <defs>
                <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ec4899" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#ec4899" stopOpacity="0.01" />
                </linearGradient>
              </defs>
              
              {/* Grid Lines */}
              <line x1="40" y1="20" x2="480" y2="20" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3" />
              <line x1="40" y1="65" x2="480" y2="65" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3" />
              <line x1="40" y1="110" x2="480" y2="110" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3" />
              <line x1="40" y1="155" x2="480" y2="155" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3" />
              <line x1="40" y1="180" x2="480" y2="180" stroke="#cbd5e1" strokeWidth="1.5" />

              {/* Y Axis Labels */}
              <text x="10" y="24" className="text-[10px] fill-slate-400 font-mono">1.5M</text>
              <text x="10" y="69" className="text-[10px] fill-slate-400 font-mono">1.0M</text>
              <text x="10" y="114" className="text-[10px] fill-slate-400 font-mono">500K</text>
              <text x="10" y="159" className="text-[10px] fill-slate-400 font-mono">100K</text>

              {selectedChartPeriod === "Harian" ? (
                <>
                  {/* Area fill */}
                  <path
                    d="M 40,150 L 100,120 L 160,175 L 220,95 L 280,110 L 340,60 L 400,90 L 460,50 L 460,180 L 40,180 Z"
                    fill="url(#chart-grad)"
                  />
                  {/* Trend line */}
                  <path
                    d="M 40,150 L 100,120 L 160,175 L 220,95 L 280,110 L 340,60 L 400,90 L 460,50"
                    fill="none"
                    stroke="#db2777"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  
                  {/* Data points */}
                  <circle cx="100" cy="120" r="4" className="fill-pink-600 stroke-white stroke-2" />
                  <circle cx="220" cy="95" r="4" className="fill-pink-600 stroke-white stroke-2" />
                  <circle cx="340" cy="60" r="4" className="fill-pink-600 stroke-white stroke-2" />
                  <circle cx="460" cy="50" r="4" className="fill-pink-600 stroke-white stroke-2" />

                  {/* Dynamic Tooltip Mock floating on the peak bar */}
                  <g transform="translate(310, 20)">
                    <rect width="60" height="25" rx="5" className="fill-slate-800" />
                    <text x="30" y="16" className="text-[9px] fill-white font-bold text-center" textAnchor="middle">IDR 1.2M</text>
                  </g>
                  
                  {/* X Axis Labels */}
                  <text x="40" y="200" className="text-[10px] fill-slate-400 font-medium" textAnchor="middle">Sen</text>
                  <text x="100" y="200" className="text-[10px] fill-slate-400 font-medium" textAnchor="middle">Sel</text>
                  <text x="160" y="200" className="text-[10px] fill-slate-400 font-medium" textAnchor="middle">Rab</text>
                  <text x="220" y="200" className="text-[10px] fill-slate-400 font-medium" textAnchor="middle">Kam</text>
                  <text x="280" y="200" className="text-[10px] fill-slate-400 font-medium" textAnchor="middle">Jum</text>
                  <text x="340" y="200" className="text-[10px] fill-slate-600 font-bold" textAnchor="middle">Sab</text>
                  <text x="400" y="200" className="text-[10px] fill-slate-400 font-medium" textAnchor="middle">Min</text>
                  <text x="460" y="200" className="text-[10px] fill-pink-600 font-bold animate-pulse" textAnchor="middle">Hari ini</text>
                </>
              ) : (
                <>
                  {/* Mingguan Area fill */}
                  <path
                    d="M 40,160 L 110,140 L 180,90 L 250,110 L 320,60 L 390,80 L 460,35 L 460,180 L 40,180 Z"
                    fill="url(#chart-grad)"
                  />
                  {/* Trend line */}
                  <path
                    d="M 40,160 L 110,140 L 180,90 L 250,110 L 320,60 L 390,80 L 460,35"
                    fill="none"
                    stroke="#9d174d"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  
                  {/* Data points */}
                  <circle cx="180" cy="90" r="4" className="fill-pink-700 stroke-white stroke-2" />
                  <circle cx="320" cy="60" r="4" className="fill-pink-700 stroke-white stroke-2" />
                  <circle cx="460" cy="35" r="4" className="fill-pink-700 stroke-white stroke-2" />
                  
                  {/* X Axis Labels */}
                  <text x="40" y="200" className="text-[10px] fill-slate-400 font-medium" textAnchor="middle">Mgg 1</text>
                  <text x="110" y="200" className="text-[10px] fill-slate-400 font-medium" textAnchor="middle">Mgg 2</text>
                  <text x="180" y="200" className="text-[10px] fill-slate-400 font-medium" textAnchor="middle">Mgg 3</text>
                  <text x="250" y="200" className="text-[10px] fill-slate-400 font-medium" textAnchor="middle">Mgg 4</text>
                  <text x="320" y="200" className="text-[10px] fill-slate-400 font-medium" textAnchor="middle">Mgg 5</text>
                  <text x="390" y="200" className="text-[10px] fill-slate-400 font-medium" textAnchor="middle">Mgg 6</text>
                  <text x="460" y="200" className="text-[10px] fill-pink-600 font-bold" textAnchor="middle">Mei (Aktif)</text>
                </>
              )}
            </svg>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-pink-50/50 p-3 sm:p-4 rounded-xl border border-pink-100 mt-4 text-[11px] sm:text-xs font-medium text-slate-700 gap-2">
            <span className="leading-relaxed">💡 **Rekomendasi AI**: Promosi Weekend berfokus ke *Sage Green Blouse* untuk profit gajian.</span>
            <button 
              onClick={() => setActiveTab("ai-assistant")}
              className="text-pink-600 hover:text-pink-800 hover:underline inline-flex items-center gap-0.5 cursor-pointer shrink-0"
            >
              Konsul AI <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Smart Alerts & Action Center */}
        <div className="bg-white p-6 rounded-2xl border border-pink-100 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-base">Notifikasi Cerdas</h3>
              <span className="text-[11px] bg-red-50 text-red-600 px-2.5 py-0.5 rounded-full font-bold">4 Urgent</span>
            </div>

            {/* Alert List */}
            <div className="space-y-3.5 mt-4">
              <div className="flex gap-3 bg-rose-50/80 p-3.5 rounded-xl border border-rose-100">
                <AlertTriangle className="h-4.5 w-4.5 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-rose-800">Gudang: Tunik Brokat Menipis!</h4>
                  <p className="text-[11px] text-rose-700 mt-0.5">Ukuran XL tinggal 1 unit di Rak A-08.</p>
                  <button 
                    onClick={() => setActiveTab("smart-scan")}
                    className="text-[10px] font-bold text-pink-700 hover:underline mt-1 block cursor-pointer"
                  >
                    Scan Bon Grosir untuk Restok &rarr;
                  </button>
                </div>
              </div>

              <div className="flex gap-3 bg-amber-50/80 p-3.5 rounded-xl border border-amber-100">
                <Clock className="h-4.5 w-4.5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-800">Pesanan WhatsApp Tertunda</h4>
                  <p className="text-[11px] text-amber-700 mt-0.5">ORD-1002 dari Siti Masitoh perlu verifikasi slip transfer.</p>
                  <button 
                    onClick={() => setActiveTab("transaksi-pesanan")}
                    className="text-[10px] font-bold text-pink-700 hover:underline mt-1 block cursor-pointer"
                  >
                    Cek Bukti Pembayaran &rarr;
                  </button>
                </div>
              </div>

              <div className="flex gap-3 bg-blue-50/80 p-3.5 rounded-xl border border-blue-100">
                <MessageSquare className="h-4.5 w-4.5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-blue-800">Komplain Retur Diajukan</h4>
                  <p className="text-[11px] text-blue-700 mt-0.5">Rania Wardhana mengajukan retur Gamis Plum L kekecilan.</p>
                  <button 
                    onClick={() => setActiveTab("transaksi-pesanan")}
                    className="text-[10px] font-bold text-blue-700 hover:underline mt-1 block cursor-pointer"
                  >
                    Tinjau Retur &rarr;
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 mt-4">
            <button 
              onClick={() => setActiveTab("katalog-stok")}
              className="w-full text-center bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium py-2 rounded-xl text-xs transition-colors border border-slate-200 cursor-pointer"
            >
              Lihat Detail Semua Riwayat Stok &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Live Order & Top Product Table Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Order Status Monitoring */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-pink-100 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Status Pesanan Live</h3>
              <p className="text-xs text-slate-400">Daftar transaksi masuk hari ini & status terbaru</p>
            </div>
            <button 
              onClick={() => setActiveTab("transaksi-pesanan")}
              className="text-xs text-pink-600 font-bold hover:underline cursor-pointer"
            >
              Kelola Pesanan
            </button>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="text-left text-slate-400 text-xs font-semibold border-b border-slate-100 pb-2">
                  <th className="pb-3 font-medium">No. Order</th>
                  <th className="pb-3 font-medium">Pelanggan</th>
                  <th className="pb-3 font-medium">Platform</th>
                  <th className="pb-3 font-medium">Total</th>
                  <th className="pb-3 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {orders.slice(0, 4).map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/50">
                    <td className="py-3 font-mono font-bold text-slate-800">{order.id}</td>
                    <td className="py-3 font-medium">{order.customerName}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold ${
                        order.platform === "Shopee" ? "bg-orange-50 text-orange-600" :
                        order.platform === "Tokopedia" ? "bg-emerald-50 text-emerald-600" :
                        order.platform === "WhatsApp" ? "bg-green-50 text-green-600" :
                        order.platform === "Kasir" ? "bg-pink-50 text-pink-600" :
                        order.platform === "Offline" ? "bg-slate-200 text-slate-700 font-mono" :
                        "bg-slate-100 text-slate-600"
                      }`}>
                        {order.platform}
                      </span>
                    </td>
                    <td className="py-3 font-bold">IDR {order.total.toLocaleString("id-ID")}</td>
                    <td className="py-3 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        order.status === "Selesai" ? "bg-emerald-100 text-emerald-800" :
                        order.status === "Kirim" ? "bg-blue-100 text-blue-800" :
                        order.status === "Proses" ? "bg-amber-100 text-amber-800" :
                        "bg-slate-100 text-slate-500"
                      }`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Products Rank */}
        <div className="bg-white p-6 rounded-2xl border border-pink-100 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 text-base">Top Produk Terlaris</h3>
            <span className="text-[11px] text-pink-600 font-bold bg-pink-50 px-2 py-0.5 rounded-md">Real-time</span>
          </div>

          <div className="space-y-4 mt-4">
            {products.slice(0, 3).map((product, idx) => {
              // Calculate total stock
              const totalStock = product.variants.reduce((acc, v) => acc + v.stock, 0);
              return (
                <div key={product.id} className="flex items-center gap-3">
                  <span className="text-sm font-bold font-mono text-slate-300 w-4">0{idx + 1}</span>
                  <img src={product.imageUrl} alt={product.name} className="h-10 w-10 object-cover rounded-lg border border-slate-100 shrink-0" referrerPolicy="no-referrer" />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-800 truncate">{product.name}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Sisa Stok: {totalStock} • {product.category}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-pink-600">IDR {product.promoPrice.toLocaleString("id-ID")}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
