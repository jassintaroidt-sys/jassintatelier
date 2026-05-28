import React, { useState, useRef, useEffect } from "react";
import { 
  Sparkles, Send, Loader2, Bot, User, Phone, HelpCircle, AlertOctagon, RefreshCw, BarChart2, MessageSquare
} from "lucide-react";
import { Product, Order, Transaction } from "../types";

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
          <strong key={i} className="font-extrabold text-slate-900 bg-pink-50/40 px-1 rounded-sm border-b border-pink-200/50">
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
      elements.push(<div key={`space-${index}`} className="h-2.5" />);
      return;
    }

    if (trimmed.startsWith("###")) {
      flushList(`flush-${index}`);
      elements.push(
        <h3 key={`h3-${index}`} className="font-extrabold text-slate-800 text-xs md:text-[13px] mt-4 mb-2 bg-pink-50 border-l-4 border-pink-500 p-2 rounded-r-lg shadow-3xs flex items-center gap-2">
          <span>✨</span>
          <span>{parseInlineStyles(trimmed.replace(/^###\s*/, ""))}</span>
        </h3>
      );
      return;
    }
    if (trimmed.startsWith("####")) {
      flushList(`flush-${index}`);
      elements.push(
        <h4 key={`h4-${index}`} className="font-bold text-slate-800 text-xs mt-3 mb-1.5 pl-2 border-l-2 border-pink-400">
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
        <div key={`li-${index}`} className="leading-relaxed text-slate-700 flex items-start gap-2.5">
          <span className="text-pink-500 mt-1 select-none font-extrabold text-[10px] shrink-0">🌸</span>
          <span className="flex-1 text-slate-800 text-xs font-sans leading-relaxed">{parseInlineStyles(bulletMatch[2])}</span>
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
        <div key={`li-${index}`} className="leading-relaxed text-slate-700 flex items-start gap-2">
          <span className="text-pink-600 font-bold font-mono text-xs text-right w-5 pt-0.5 shrink-0 select-none bg-pink-50 rounded-sm py-0.5 text-center">{numberedMatch[1]}.</span>
          <span className="flex-1 text-slate-800 text-xs font-sans leading-relaxed">{parseInlineStyles(numberedMatch[2])}</span>
        </div>
      );
      return;
    }

    flushList(`flush-${index}`);
    elements.push(
      <p key={`p-${index}`} className="leading-relaxed text-slate-800 text-xs font-sans mb-1 pb-1">
        {parseInlineStyles(trimmed)}
      </p>
    );
  });

  flushList("final");
  return <div className="space-y-1.5">{elements}</div>;
};

interface AIAssistantViewProps {
  products: Product[];
  orders: Order[];
  transactions: Transaction[];
}

export default function AIAssistantView({ products, orders, transactions }: AIAssistantViewProps) {
  const [activeAssistantTab, setActiveAssistantTab] = useState<"advisor" | "chatbot">("advisor");
  const [isRateLimited, setIsRateLimited] = useState<boolean>(false);
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
  
  // Tab 1: Business Advisor State
  const [advisorInput, setAdvisorInput] = useState<string>("");
  const [advisorHistory, setAdvisorHistory] = useState<{ role: "user" | "bot"; content: string; isMock?: boolean }[]>([
    { 
      role: "bot", 
      content: "Halo! Saya **Claude-Biz**, Konsultan AI Bisnis personal khusus butik Jassinta Atelier. Saya telah membaca database produk, laju transaksi kas masuk-keluar, and status pesanan Anda. \n\nMau konsultasi perihal apa hari ini? Kakak bisa ketik sendiri atau gunakan **Quick Consulting Chips** di bawah untuk memicu analisis instan data-driven." 
    }
  ]);
  const [loadingAdvisor, setLoadingAdvisor] = useState<boolean>(false);

  // Tab 2: WhatsApp Chatbot State
  const [chatbotInput, setChatbotInput] = useState<string>("");
  const [chatbotHistory, setChatbotHistory] = useState<{ role: "user" | "bot"; content: string; isMock?: boolean }[]>([
    { 
      role: "bot", 
      content: "Halo Kak! ✨ Selamat datang di Customer Service *Jassinta Atelier*! Saya **Jassinta-Bot** admin virtual ramah yang siap melayani 24 jam.\n\nKakak boleh loh nanya soal ready stok baju apa, ukurannya, rekomendasi mix-and-match OOTD kondangan, sampai melacak paket kiriman (ORD-1001, dll). Mau tanya apa nih Kak? 😊💕" 
    }
  ]);
  const [loadingChatbot, setLoadingChatbot] = useState<boolean>(false);

  const advisorBottomRef = useRef<HTMLDivElement | null>(null);
  const chatbotBottomRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll to bottom
  useEffect(() => {
    advisorBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [advisorHistory, loadingAdvisor]);

  useEffect(() => {
    chatbotBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatbotHistory, loadingChatbot]);

  // Consult command dispatcher (Advisor)
  const handleAdvisorSubmit = async (customMessage?: string) => {
    const textToSend = customMessage || advisorInput;
    if (!textToSend.trim()) return;

    setAdvisorHistory(prev => [...prev, { role: "user", content: textToSend }]);
    setAdvisorInput("");
    setLoadingAdvisor(true);

    try {
      const res = await fetch(`${getApiPrefix()}/advisor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          products,
          orders,
          transactions
        })
      });

      const data = await res.json();
      if (data.rateLimited) {
        setIsRateLimited(true);
      }
      if (data.text) {
        setAdvisorHistory(prev => [...prev, { role: "bot", content: data.text, isMock: data.isMock }]);
      } else if (data.error) {
        setAdvisorHistory(prev => [...prev, { role: "bot", content: `⚠️ Terjadi kesalahan: ${data.error}` }]);
      } else {
        setAdvisorHistory(prev => [...prev, { role: "bot", content: "Mohon maaf, saya kesulitan merumuskan saran bisnis." }]);
      }
    } catch (err) {
      setAdvisorHistory(prev => [...prev, { role: "bot", content: "Tidak dapat menghubungi server AI. Pastikan server dev berjalan." }]);
    } finally {
      setLoadingAdvisor(false);
    }
  };

  // Chat message dispatcher (Chatbot)
  const handleChatbotSubmit = async () => {
    const textToSend = chatbotInput;
    if (!textToSend.trim()) return;

    setChatbotHistory(prev => [...prev, { role: "user", content: textToSend }]);
    setChatbotInput("");
    setLoadingChatbot(true);

    try {
      // Build a simple chat history object to pass to backend
      const formattedHistory = chatbotHistory.slice(1).map(h => ({
        role: h.role,
        content: h.content
      }));

      const res = await fetch(`${getApiPrefix()}/chatbot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          history: formattedHistory,
          products,
          orders
        })
      });

      const data = await res.json();
      if (data.rateLimited) {
        setIsRateLimited(true);
      }
      if (data.text) {
        setChatbotHistory(prev => [...prev, { role: "bot", content: data.text, isMock: data.isMock }]);
      } else {
        setChatbotHistory(prev => [...prev, { role: "bot", content: "Maaf Kak, Jassinta-Bot sedang sibuk memilah benang di gudang, coba lagi sebentar ya! 🌸" }]);
      }
    } catch (err) {
      setChatbotHistory(prev => [...prev, { role: "bot", content: "Koneksi terputus. Pastikan server lokal aktif." }]);
    } finally {
      setLoadingChatbot(false);
    }
  };

  // Chat preset tags (CS simulator)
  const handlePresetCustomerText = (text: string) => {
    setChatbotInput(text);
  };

  const quickAdvisorChips = [
    { label: "✅ SOP & Workflow Approval", text: "Kamu adalah AI Workflow Manager untuk bisnis fashion wanita.\n\nTugasmu:\n- Memastikan semua proses bisnis berjalan sesuai SOP\n- Memeriksa transaksi mencurigakan\n- Memberikan approval otomatis berdasarkan aturan bisnis\n- Memberi notifikasi jika ada pelanggaran SOP\n\nAturan:\n- Refund di atas Rp500.000 harus approval owner\n- Diskon di atas 30% harus approval supervisor\n- Pesanan VIP diprioritaskan\n- Retur lebih dari 2x dari customer yang sama harus ditandai\n- Produk stok kritis tidak boleh dipromosikan besar-besaran\n\nOutput:\n- Status approval\n- Risiko\n- Alasan keputusan\n- Tindakan yang direkomendasikan\n\nGunakan bahasa profesional, singkat, dan jelas." },
    { label: "📅 Smart Reminder & To-Do", text: "Kamu adalah AI Business Reminder Assistant.\n\nAnalisis seluruh data bisnis harian dan berikan:\n- reminder penting\n- tugas prioritas\n- warning bisnis\n- peluang peningkatan penjualan\n\nFokus pada:\n- stok menipis\n- produk tidak laku\n- customer lama tidak belanja\n- pesanan terlambat\n- momentum promo\n- tren penjualan\n\nFormat output:\n1. Prioritas Tinggi\n2. Prioritas Sedang\n3. Insight Hari Ini\n4. Rekomendasi Aksi\n\nGunakan gaya seperti manager bisnis profesional." },
    { label: "💎 Loyalty & VIP Customer", text: "Kamu adalah AI CRM dan Loyalty Specialist.\n\nAnalisis perilaku customer dan tentukan:\n- customer loyal\n- customer VIP\n- customer berisiko tidak kembali\n- customer sensitif diskon\n- customer dengan potensi repeat order tinggi\n\nBerikan:\n- segmentasi customer\n- rekomendasi promo personal\n- voucher yang cocok\n- strategi retensi\n\nGunakan data:\n- frekuensi pembelian\n- total belanja\n- kategori favorit\n- waktu pembelian\n- respons promo sebelumnya\n\nOutput harus mudah dipahami owner bisnis." },
    { label: "🤝 Affiliate & Reseller", text: "Kamu adalah AI Affiliate dan Reseller Manager.\n\nTugas:\n- memantau performa reseller\n- menghitung komisi otomatis\n- mendeteksi reseller aktif vs pasif\n- memberi strategi peningkatan penjualan\n\nBerikan:\n- ranking reseller terbaik\n- reseller yang perlu dibina\n- rekomendasi bonus\n- prediksi omzet reseller\n\nJika ada reseller yang performanya turun drastis, berikan warning dan kemungkinan penyebabnya." },
    { label: "📢 Content Marketing Gen", text: "Kamu adalah AI Marketing Content Creator untuk brand fashion wanita.\n\nBuat:\n- caption Instagram\n- caption TikTok\n- deskripsi Shopee\n- judul SEO marketplace\n- script live selling\n- ide promo\n- headline iklan\n\nTarget market:\nwanita Indonesia usia 17-40 tahun.\n\nGaya bahasa:\n- elegan\n- soft selling\n- estetik\n- modern\n- relatable\n- meningkatkan conversion\n\nSelalu sertakan:\n- hook menarik\n- CTA\n- emotional selling\n- manfaat produk\n- urgency jika cocok" },
    { label: "📸 Foto Produk Enhancement", text: "Kamu adalah AI Product Photo Assistant untuk fashion wanita.\n\nTugas:\n- meningkatkan kualitas foto produk\n- membuat tampilan lebih profesional\n- mempertahankan warna asli produk\n- membuat produk terlihat premium\n\nInstruksi:\n- hapus background berantakan\n- gunakan pencahayaan studio\n- tingkatkan ketajaman\n- pertahankan detail kain\n- fokus pada estetika fashion wanita modern\n- optimalkan untuk marketplace dan media sosial\n\nHasil akhir harus clean, elegan, dan meningkatkan kemungkinan pembelian." },
    { label: "💸 Forecast Cashflow", text: "Kamu adalah AI Financial Advisor bisnis fashion.\n\nAnalisis:\n- pemasukan\n- pengeluaran\n- margin\n- biaya operasional\n- stok\n- hutang supplier\n- tren omzet\n\nPrediksi:\n- cashflow 7 hari\n- cashflow 30 hari\n- risiko kekurangan modal\n- waktu terbaik restock\n- estimasi keuntungan\n\nJika ada risiko finansial:\n- jelaskan penyebab\n- tingkat risiko\n- solusi yang disarankan\n\nGunakan gaya profesional seperti CFO bisnis modern." },
    { label: "🕵️ Customer Behavior", text: "Kamu adalah AI Customer Behavior Analyst.\n\nPelajari perilaku pelanggan berdasarkan:\n- produk favorit\n- warna favorit\n- jam aktif belanja\n- respons terhadap diskon\n- frekuensi checkout\n- histori chat\n- histori pembelian\n\nTugas:\n- prediksi produk yang mungkin dibeli\n- rekomendasikan promo personal\n- deteksi customer hampir churn\n- tingkatkan conversion\n\nBerikan insight yang actionable dan spesifik." },
    { label: "📊 Owner Dashboard Asst", text: "Kamu adalah AI Executive Business Assistant untuk owner bisnis fashion.\n\nTugas:\n- merangkum kondisi bisnis setiap hari\n- memberikan insight cepat\n- menunjukkan masalah penting\n- memberi rekomendasi keputusan bisnis\n\nTampilkan:\n- omzet hari ini\n- produk terlaris\n- produk bermasalah\n- status pesanan\n- kondisi stok\n- performa marketplace\n- performa iklan\n- warning penting\n\nOutput harus ringkas, padat, profesional, dan mudah dipahami dalam 1 menit." },
    { label: "🚨 Anti Fraud & Security", text: "Kamu adalah AI Security & Fraud Detection System.\n\nPantau:\n- transaksi abnormal\n- refund mencurigakan\n- login tidak biasa\n- manipulasi stok\n- perubahan harga ekstrem\n- aktivitas admin yang tidak normal\n\nJika ada indikasi fraud:\n- jelaskan tingkat risiko\n- alasan sistem mencurigai aktivitas tersebut\n- tindakan pencegahan yang direkomendasikan\n\nPrioritaskan keamanan bisnis dan akurasi analisis." },
    { label: "📦 Supplier Management", text: "Kamu adalah AI Supplier Management Assistant.\n\nAnalisis:\n- performa supplier\n- kecepatan pengiriman\n- kualitas produk\n- histori keterlambatan\n- harga beli\n- stabilitas stok\n\nBerikan:\n- ranking supplier terbaik\n- supplier paling efisien\n- supplier berisiko\n- rekomendasi restock\n- strategi negosiasi harga\n\nTujuan:\nmengoptimalkan biaya dan menjaga kestabilan stok bisnis." },
    { label: "🏭 Supplier Intelligence", text: "Kamu adalah AI Supplier Intelligence untuk bisnis fashion wanita.\n\nTugas:\n- membandingkan supplier\n- menghitung margin keuntungan\n- menganalisis harga grosir\n- mengevaluasi kualitas supplier\n- memberi rekomendasi restock terbaik\n\nAnalisis berdasarkan:\n- harga beli\n- ongkir\n- kualitas produk\n- kecepatan pengiriman\n- histori keterlambatan\n- tingkat retur\n- margin bersih\n- tren produk\n\nBerikan:\n- supplier terbaik\n- supplier termurah\n- supplier paling stabil\n- risiko supplier\n- rekomendasi pembelian\n\nPrioritaskan profitabilitas dan kestabilan bisnis." },
    { label: "📈 Fashion Trend Detector", text: "Kamu adalah AI Fashion Trend Analyst.\n\nAnalisis tren fashion wanita dari:\n- TikTok\n- Instagram\n- marketplace\n- pencarian populer\n- warna viral\n- model pakaian trending\n\nTugas:\n- mendeteksi tren naik\n- memprediksi tren berikutnya\n- rekomendasi produk yang harus dijual\n- rekomendasi warna populer\n- rekomendasi strategi promosi\n\nFokus pada pasar fashion wanita Indonesia.\n\nBerikan insight yang cepat, spesifik, dan actionable." },
    { label: "🌟 SUPER AI BISNIS", text: "Kamu adalah AI Business Operating System untuk bisnis fashion wanita.\n\nKamu bertugas membantu owner menjalankan bisnis secara otomatis, cerdas, dan efisien.\n\nKemampuanmu:\n- analisis penjualan\n- prediksi stok\n- customer service\n- marketing\n- loyalitas pelanggan\n- anti fraud\n- supplier management\n- cashflow\n- marketplace management\n- WhatsApp automation\n- business advisor\n- trend fashion analysis\n\nTujuan utama:\n- meningkatkan omzet\n- meningkatkan repeat order\n- mengurangi human error\n- meningkatkan efisiensi operasional\n- membantu owner mengambil keputusan terbaik\n\nBerikan jawaban:\n- profesional\n- berbasis data\n- actionable\n- jelas\n- ringkas namun mendalam\n- mudah dipahami owner bisnis\n\nSelalu prioritaskan profitabilitas, efisiensi, dan pengalaman pelanggan." }
  ];

  const quickCustomerChatChips = [
    "Ready Gamis Silk warna Plum ukuran L?",
    "Kemarin saya beli Tunik Brokat, ada rekomendasi hijab yang cocok?",
    "Bantu lacak pesanan nomor ORD-1002 milik Siti Masitoh",
    "Gimana cara retur barang? Ukuran gamis plum kemarin kekecilan Sist",
    "Sist, saget mbalas ngangge boso Jowo mboten?"
  ];

  return (
    <div id="ai-assistant-view" className="space-y-6">
      {isRateLimited && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center justify-between gap-3 animate-fade-in shadow-3xs">
          <div className="flex items-center gap-2.5">
            <AlertOctagon className="h-4.5 w-4.5 shrink-0 text-rose-500 animate-pulse" />
            <span>
              <strong>Batas Kuota Gemini Tercapai</strong> &middot; Kami mendeteksi batas kuota harian Gemini API harian telah tercapai. Sistem telah mengaktifkan <strong>mode kecerdasan buatan cadangan offline interaktif</strong> secara otomatis agar operasional asisten & chatbot butik Anda tetap berjalan super cepat dan andal!
            </span>
          </div>
          <button 
            onClick={() => setIsRateLimited(false)} 
            className="text-[10px] bg-rose-100 hover:bg-rose-200 transition-all font-bold px-2.5 py-1.5 rounded-lg text-rose-700 cursor-pointer shrink-0"
          >
            Sembunyikan
          </button>
        </div>
      )}

      {/* Top Navigation Mode Tabs */}
      <div className="flex bg-white p-2 rounded-xl border border-pink-100 shadow-2xs items-center justify-between">
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveAssistantTab("advisor")}
            className={`text-xs px-4 py-2.5 rounded-md font-medium transition-all cursor-pointer flex items-center gap-2 ${activeAssistantTab === "advisor" ? "bg-white text-slate-800 shadow-2xs" : "text-slate-500 hover:text-slate-800"}`}
          >
            <BarChart2 className="h-4.5 w-4.5 text-pink-600" />
            AI Business Advisor (Strategic)
          </button>
          <button
            id="chatbot-tab-btn"
            onClick={() => setActiveAssistantTab("chatbot")}
            className={`text-xs px-4 py-2.5 rounded-md font-medium transition-all cursor-pointer flex items-center gap-2 ${activeAssistantTab === "chatbot" ? "bg-white text-slate-800 shadow-2xs" : "text-slate-500 hover:text-slate-800"}`}
          >
            <MessageSquare className="h-4.5 w-4.5 text-pink-600" />
            AI Customer Chatbot (Live Support)
          </button>
        </div>
        
        {/* Dynamic Status badge */}
        <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-pink-50 border border-pink-100/50">
          <Sparkles className="h-3.5 w-3.5 text-pink-500 animate-pulse" />
          <span className="text-[10px] font-bold text-pink-700">
            {aiStatus.hasOpenAI ? "OpenAI GPT-4o Active" : aiStatus.hasGemini ? "Gemini 3.5-Flash Active" : "AI Offline Simulation Active"}
          </span>
        </div>
      </div>

      {activeAssistantTab === "advisor" ? (
        /* Advisor Interface */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick chip panels */}
          <div className="bg-white p-6 rounded-2xl border border-pink-100 shadow-xs space-y-4">
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                <Sparkles className="h-4.5 w-4.5 text-pink-500" />
                Quick Consulting Chips
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">Pilih kueri cepat di bawah untuk langsung menyusun strategi berdaya analisis tinggi berdasarkan data nyata inventaris Jassinta Atelier.</p>
            </div>

            <div className="space-y-3 pt-2 max-h-[350px] overflow-y-auto pr-1">
              {quickAdvisorChips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAdvisorSubmit(chip.text)}
                  disabled={loadingAdvisor}
                  className="w-full text-left text-xs bg-slate-50/70 hover:bg-pink-50/55 p-3 rounded-xl border border-slate-200/60 transition-all hover:border-pink-300 font-medium text-slate-700 hover:text-pink-900 cursor-pointer flex items-start gap-1"
                >
                  <span className="shrink-0 mt-0.5">•</span>
                  <span>{chip.label}</span>
                </button>
              ))}
            </div>

            <div className="bg-pink-50/50 p-4 rounded-xl border border-pink-100 mt-4 text-[10.5px] leading-relaxed text-slate-600">
              📌 **Keterangan**: Analisis Advisor menyertakan daftar {products.length} Katalog Produk kami, total {orders.length} penjualan historis dan cashflow toko Anda secara aman dan real-time.
            </div>
          </div>

          {/* Interactive Chat window */}
          <div className="lg:col-span-2 bg-gradient-to-b from-white to-slate-50 border border-pink-100 rounded-2xl p-6 shadow-xs flex flex-col h-[550px] justify-between">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-slate-900 text-white rounded-lg">
                  <Bot className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Claude-Biz</h4>
                  <p className="text-[10px] text-slate-400">Konsultan Cerdas Bisnis Retail Spesialis Fashion</p>
                </div>
              </div>
              
              <span className="text-[9px] bg-slate-100 px-2 py-0.5 rounded-sm font-mono text-slate-500">
                CONTEXT SECURE
              </span>
            </div>

            {/* Chat list bubble */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4">
              {advisorHistory.map((chat, idx) => (
                <div key={idx} className={`flex gap-3 ${chat.role === "user" ? "justify-end" : "justify-start"}`}>
                  {chat.role === "bot" && (
                    <div className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0 text-xs">
                      AI
                    </div>
                  )}

                  <div className={`p-4 rounded-xl max-w-[85%] text-xs leading-relaxed space-y-2 shadow-2xs ${
                    chat.role === "user" ? "bg-pink-600 text-white rounded-tr-none whitespace-pre-line" : "bg-white text-slate-800 border rounded-tl-none border-slate-100"
                  }`}>
                    {chat.role === "user" ? chat.content : formatContent(chat.content)}
                    {chat.isMock && (
                      <div className="text-[9px] border-t border-slate-100 pt-1.5 mt-2 text-right italic text-slate-400 block pb-0">
                        *Menampilkan data model terkompresi mock (Gemini API Key belum diset).*
                      </div>
                    )}
                  </div>

                  {chat.role === "user" && (
                    <div className="h-8 w-8 rounded-full bg-pink-100 text-pink-700 flex items-center justify-center shrink-0 font-bold text-xs font-mono">
                      OW
                    </div>
                  )}
                </div>
              ))}
              {loadingAdvisor && (
                <div className="flex gap-3 justify-start">
                  <div className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0 text-xs">
                    AI
                  </div>
                  <div className="p-4 rounded-2xl bg-white border border-slate-150 rounded-tl-none shadow-2xs flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-pink-600" />
                    <span className="text-xs text-slate-500">Claude-Biz sedang membedah rasio HPP, saldo kas, and laju laku stock barang...</span>
                  </div>
                </div>
              )}
              <div ref={advisorBottomRef} />
            </div>

            {/* Input form */}
            <div className="flex gap-2.5 border-t pt-4">
              <input
                type="text"
                placeholder="Konsultasi tentang model baju baru, omzet turun, dll..."
                value={advisorInput}
                onChange={e => setAdvisorInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAdvisorSubmit()}
                className="flex-1 text-xs p-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-pink-500"
                disabled={loadingAdvisor}
              />
              <button
                onClick={() => handleAdvisorSubmit()}
                disabled={loadingAdvisor || !advisorInput.trim()}
                className="bg-pink-600 hover:bg-pink-700 disabled:bg-slate-200 text-white font-bold p-3 rounded-xl transition-all flex items-center justify-center shrink-0 cursor-pointer glow-btn"
              >
                <Send className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Chatbot Customer Simulator Interface */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Simulation Chips */}
          <div className="bg-white p-6 rounded-2xl border border-pink-100 shadow-xs space-y-4">
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                <Bot className="h-4.5 w-4.5 text-pink-600" />
                Customer Chat Presets
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">Gunakan kueri preset ini untuk menguji kepintaran virtual admin 'Jassinta-Bot' dalam membalas chat secara cerdas.</p>
            </div>

            <div className="space-y-2 pt-2">
              {quickCustomerChatChips.map((text, idx) => (
                <button
                  key={idx}
                  onClick={() => handlePresetCustomerText(text)}
                  disabled={loadingChatbot}
                  className="w-full text-left text-xs bg-slate-50 hover:bg-pink-50/50 p-2.5 rounded-xl border border-slate-200/60 transition-all hover:border-pink-300 font-medium text-slate-600 hover:text-pink-900 cursor-pointer block truncate"
                >
                  "{text}"
                </button>
              ))}
            </div>

            <div className="bg-emerald-50/60 p-4 border border-emerald-100 rounded-xl space-y-2.5 text-xs text-slate-700">
              <h4 className="font-bold text-emerald-800 text-[11px] uppercase tracking-wider">Keunggulan Jassinta-Bot:</h4>
              <p className="text-[10.5px] leading-relaxed">
                ✅ **Jawab Fleksibel**: Mampu memahami pertanyaan dalam **Bahasa Jawa (ngoko/krama)**, kasual gaul, atau formal. <br/>
                ✅ **Pelacakan Instan**: Langsung melihat stock di Rak A-01 atau status paket J&T ORD-1001 dalam detik. <br/>
                ✅ **Selera Estetis Tinggi**: Mengerti fashion wanita, murni tanpa halusinasi.
              </p>
            </div>
          </div>

          {/* WhatsApp UI Wrapper */}
          <div className="lg:col-span-2 bg-slate-100 rounded-2xl border border-pink-200 flex flex-col h-[550px] justify-between shadow-xs overflow-hidden">
            {/* WhatsApp Header bar */}
            <div className="bg-emerald-800 text-white p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-full bg-emerald-700 flex items-center justify-center font-bold text-sm relative border border-emerald-600/30">
                  🌸
                  <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 border border-emerald-800 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-white">Jassinta Atelier CS</h4>
                  <p className="text-[9.5px] text-emerald-200">Online &bull; AI CS Bot Active</p>
                </div>
              </div>
              <div className="text-[9.5px] bg-emerald-900/60 font-mono px-2.5 py-0.5 rounded-md text-emerald-200">
                WHATSAPP LIVE
              </div>
            </div>

            {/* Chat Body panel */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-orange-50/20 max-h-[420px]">
              {chatbotHistory.map((chat, idx) => (
                <div key={idx} className={`flex ${chat.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`p-3.5 rounded-xl max-w-[80%] text-[12px] leading-relaxed space-y-1.5 shadow-2xs ${
                    chat.role === "user" ? "bg-emerald-100 text-slate-800 rounded-tr-none border border-emerald-250 whitespace-pre-line" : "bg-white text-slate-800 rounded-tl-none border border-slate-100"
                  }`}>
                    {chat.role === "user" ? chat.content : formatContent(chat.content)}
                    {chat.isMock && (
                      <span className="text-[8.5px] border-t pt-1 mt-1 font-mono text-slate-400 block text-right">
                        *Simulasi offline mode*
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {loadingChatbot && (
                <div className="flex justify-start">
                  <div className="p-3.5 rounded-xl bg-white border border-slate-200/50 rounded-tl-none shadow-2xs text-xs text-slate-400 flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                    <span>Jassinta-Bot sedang mengetik...</span>
                  </div>
                </div>
              )}
              <div ref={chatbotBottomRef} />
            </div>

            {/* Canned Input Form */}
            <div className="bg-white p-3.5 border-t border-slate-200 flex gap-2.5 items-center shrink-0">
              <input
                type="text"
                placeholder="Ketik balasan buat customer simulator..."
                value={chatbotInput}
                onChange={e => setChatbotInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleChatbotSubmit()}
                className="flex-1 text-xs p-2.5 rounded-full border border-slate-200 bg-slate-50 focus:outline-none focus:bg-white focus:border-emerald-600"
                disabled={loadingChatbot}
              />
              <button
                onClick={handleChatbotSubmit}
                disabled={loadingChatbot || !chatbotInput.trim()}
                className="h-9 w-9 rounded-full bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-100 text-white flex items-center justify-center cursor-pointer shrink-0"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
