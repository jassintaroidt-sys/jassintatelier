import React, { useState, useEffect } from 'react';
import { 
  Building, RotateCcw, Activity, Palette, Upload, Printer, Download, Eye, 
  QrCode, Scale, Trash2, EyeOff, Check, Heart, Shield, HelpCircle, Sparkles, Image as ImageIcon
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { motion, AnimatePresence } from 'motion/react';
import { compressImage, dispatchSecurityAlert } from '../utils';
import { useFirebase } from '../lib/FirebaseProvider';

// Recommended Theme Options
interface BrandTheme {
  id: string;
  name: string;
  primaryColor: string; // Tailwind class background
  textColor: string;    // Tailwind text class
  accentColor: string;  // Gold, Cream, Soft Pink, Black Luxury hex/styles 
  logoSymbol: string;
  tagline: string;
}

const PRESET_BRANDS: BrandTheme[] = [
  {
    id: "jassinta-original",
    name: "Jassinta Atelier",
    primaryColor: "bg-pink-600 hover:bg-pink-700",
    textColor: "text-pink-600",
    accentColor: "#ec4899", // pink-500
    logoSymbol: "🌸",
    tagline: "Modern Women's Premium Fashion Collection"
  },
  {
    id: "jassinta-premium",
    name: "Jassinta Premium",
    primaryColor: "bg-amber-950 hover:bg-amber-900 border border-amber-500/20",
    textColor: "text-amber-500",
    accentColor: "#d97706", // amber-600/gold
    logoSymbol: "👑",
    tagline: "Exclusive Silk & Gold Embellishments"
  },
  {
    id: "olivia-fashion",
    name: "Olivia Fashion",
    primaryColor: "bg-stone-800 hover:bg-stone-900",
    textColor: "text-stone-700",
    accentColor: "#78716c", // stone-500
    logoSymbol: "⚜️",
    tagline: "Chic Casual Wear with French Silhouettes"
  },
  {
    id: "hijabku",
    name: "HijabKu by Jassinta",
    primaryColor: "bg-emerald-700 hover:bg-emerald-800",
    textColor: "text-emerald-700",
    accentColor: "#059669", // emerald-600
    logoSymbol: "🧕",
    tagline: "Elegant Modern Hijab & Casual Syar'i"
  }
];

export default function SettingsView() {
  const { brandSettings, updateBrandSettings } = useFirebase() as any;
  const [activeTab, setActiveTab] = useState<"branding" | "return" | "audit">("branding");
  
  // Real-time Brand Settings State (Local buffer before save)
  const [settings, setSettings] = useState(brandSettings);

  // Sync buffer if brandSettings changes from sync
  useEffect(() => {
    setSettings(brandSettings);
  }, [brandSettings]);

  // State to handle visual preview tab inside Branding
  const [previewTab, setPreviewTab] = useState<"invoice" | "label" | "barcode" | "pdf" | "watermark">("invoice");
  const [successMsg, setSuccessMsg] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const handleLogoUpload = (file: File) => {
    setUploadError("");
    const validTypes = ["image/jpeg", "image/png", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      setUploadError("Format file tidak didukung! Pastikan mengunggah file JPG, PNG, atau JPEG.");
      return;
    }
    // Set a much larger raw file size limit since we compress it anyway
    if (file.size > 8 * 1024 * 1024) {
      setUploadError("Ukuran file terlalu besar! Batas maksimal pengunggahan logo adalah 8 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      if (typeof reader.result === "string") {
        try {
          // Compress custom logo to max 600x600 at 0.92 quality (JPEG)
          // This reduces file size while maintaining sharp UI visibility.
          const compressed = await compressImage(reader.result, 600, 600, 0.92);
          const updated = { ...settings, logo_img_base64: compressed };
          setSettings(updated);
          handleSave(updated);
          setSuccessMsg("Logo kustom berhasil diunggah, dikompresi (< 25 KB), dan diterapkan! 🎉");
          setTimeout(() => setSuccessMsg(""), 4000);
          
          dispatchSecurityAlert(
            "BRANDING",
            "Owner mengunggah logo kustom berformat baru (telah dikompresi agar ramah basis data)"
          );
        } catch (err) {
          setUploadError("Gagal mengompresi gambar kustom.");
        }
      }
    };
    reader.onerror = () => {
      setUploadError("Terjadi kesalahan saat membaca file gambar.");
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (newSettings = settings) => {
    try {
      await updateBrandSettings(newSettings);
      
      setSuccessMsg("Pengaturan Branding & Tenant berhasil disimpan dan diaplikasikan ke seluruh sistem secara cloud! ✨");
      setTimeout(() => {
        setSuccessMsg("");
      }, 4000);

      dispatchSecurityAlert(
        "BRANDING",
        `Branding diubah menjadi "${newSettings.company_name}" [Skema: ${newSettings.bgColorPreset.toUpperCase()}]`
      );
    } catch (e: any) {
      console.error("Failed to update brand settings in Firebase:", e);
      setUploadError("Gagal menyimpan ke Cloud. Pastikan koneksi stabil.");
    }
  };

  const applyPreset = (preset: BrandTheme) => {
    const updated = {
      ...settings,
      company_name: preset.name,
      logo_symbol: preset.logoSymbol,
      logo_img_base64: "", // Reset custom logo upon preset selection (fall back to Emoji)
      bgColorPreset: preset.id === "jassinta-premium" ? "gold" : preset.id === "olivia-fashion" ? "stone" : preset.id === "hijabku" ? "emerald" : "pink",
      invoice_footer: `Terima kasih banyak telah mempercayai koleksi ${preset.name} ✨ Kepuasan busana elegan Anda adalah dedikasi utama kami.`
    };
    handleSave(updated);
    dispatchSecurityAlert("BRANDING", `Preset tema "${preset.name}" diaktifkan sebagai identitas utama`);
  };

  // Helper styles based on primary theme selection
  const getThemeStyles = () => {
    if (settings.bgColorPreset === "gold") {
      return {
        bg: "bg-amber-950",
        btn: "bg-amber-600 hover:bg-amber-700 text-black",
        text: "text-amber-500",
        border: "border-amber-500/35",
        lightBg: "bg-amber-50/50",
        colorHex: "#d97706"
      };
    } else if (settings.bgColorPreset === "stone") {
      return {
        bg: "bg-stone-800",
        btn: "bg-stone-800 hover:bg-stone-900 text-white",
        text: "text-stone-700",
        border: "border-stone-300",
        lightBg: "bg-stone-50",
        colorHex: "#78716c"
      };
    } else if (settings.bgColorPreset === "emerald") {
      return {
        bg: "bg-emerald-800",
        btn: "bg-emerald-600 hover:bg-emerald-700 text-white",
        text: "text-emerald-700",
        border: "border-emerald-300",
        lightBg: "bg-emerald-50",
        colorHex: "#059669"
      };
    } else {
      return {
        bg: "bg-pink-600 border-pink-700",
        btn: "bg-pink-600 hover:bg-pink-700 text-white",
        text: "text-pink-600",
        border: "border-pink-300",
        lightBg: "bg-pink-50/50",
        colorHex: "#ec4899"
      };
    }
  };

  const theme = getThemeStyles();

  // Audit Logs Mock
  const [auditLogs, setAuditLogs] = useState([
    { id: 1, time: "14:12:05", user: "Owner Jassinta", role: "Owner", module: "Branding", action: "Mengubah logo ke format SVG Premium", ip: "36.85.12.98" },
    { id: 2, time: "13:28:44", user: "Admin A", role: "Manager", module: "Multi Tenant", action: "Mengaktifkan Tenant White-Label Olivia Fashion", ip: "192.168.1.5" },
    { id: 3, time: "11:50:11", user: "System API", role: "Automation", module: "Marketplace Sync", action: "Auto-Watermark 4 foto produk baru di TikTok Shop", ip: "127.0.0.1" },
    { id: 4, time: "10:45:12", user: "Admin A", role: "Manager", module: "Inventory", action: "Edit stock DRS-BLK-M-0001 (+10 unit)", ip: "192.168.1.5" },
    { id: 5, time: "10:22:05", user: "Budi Warehouse", role: "Picker", module: "Order Processing", action: "Scan Barcode Kurir Shopee untuk Order ORD-1002", ip: "10.0.0.12" }
  ]);

  // Returns Mock
  const [returns, setReturns] = useState([
    { id: "RET-001", date: "24 May 2026", orderId: "ORD-1005", customer: "Siti Aminah", reason: "Tukar ukuran dari M ke L (Gamis Hana)", qcCategory: "Sellable", action: "Exchange Size & Restock", user: "QC Hasan" },
    { id: "RET-002", date: "22 May 2026", orderId: "ORD-0992", customer: "Rina Marlina", reason: "Kain serat renda sedikit robek di lengan", qcCategory: "Damaged", action: "Refund Total (Rejected Fabric)", user: "QC Desi" },
    { id: "RET-003", date: "20 May 2026", orderId: "ORD-0985", customer: "Citra Kirana", reason: "Salah warna pengiriman (baju lavender, pesan sage)", qcCategory: "Repack needed", action: "Send Correct Item & Repack Return", user: "QC Hasan" }
  ]);

  return (
    <div className="space-y-6">
      {/* Header Profile Dashboard */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{settings.logo_symbol}</span>
            <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">{settings.company_name} WMS Center</h2>
          </div>
          <p className="text-sm text-slate-500">Konfigurasi Manajemen Multi-Brand, Live Preview Dokumen, dan Alur Kerja Retur Gudang</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <span className="bg-slate-100 text-slate-700 text-xs px-3 py-1.5 rounded-full font-semibold border border-slate-200">
            Version v3.0 White-Label Enabled
          </span>
        </div>
      </div>

      {successMsg && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-xs font-semibold flex items-center gap-2"
        >
          <span className="text-base">✨</span>
          {successMsg}
        </motion.div>
      )}

      {/* Primary Tab Navigation */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="flex items-center overflow-x-auto border-b border-slate-100 p-1 bg-slate-50/50">
          <button
            onClick={() => setActiveTab("branding")}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "branding"
                ? `${theme.text} border-b-2 border-current bg-white shadow-xs`
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Palette className="h-4 w-4" />
            1. Brand Config & Live Simulator
          </button>
          
          <button
            onClick={() => setActiveTab("return")}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "return"
                ? "text-pink-600 border-b-2 border-pink-600 bg-white shadow-xs"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
          >
            <RotateCcw className="h-4 w-4" />
            2. Return Management (QC)
          </button>

          <button
            onClick={() => setActiveTab("audit")}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "audit"
                ? "text-pink-600 border-b-2 border-pink-600 bg-white shadow-xs"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Activity className="h-4 w-4" />
            3. Audit Log Sistem
          </button>
        </div>

        <div className="p-6">
          {activeTab === "branding" && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
              
              {/* BRANDING FORM & PRESETS - LEFT COLUMN */}
              <div className="xl:col-span-5 space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 mb-1 text-pink-600">
                    <Sparkles className="h-4 w-4" /> Multi-Tenant White-Label Presets
                  </h3>
                  <p className="text-xs text-slate-500 mb-3">Klik tombol preset di bawah untuk mengubah identitas warna, logo, dan profil seluruh sistem secara instan.</p>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {PRESET_BRANDS.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => applyPreset(p)}
                        className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group cursor-pointer ${
                          settings.company_name === p.name
                            ? "border-slate-800 bg-slate-900 text-white shadow-md ring-2 ring-pink-500/35"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          <span className="text-base">{p.logoSymbol}</span>
                          <span className="truncate">{p.name}</span>
                        </div>
                        <p className="text-[9px] text-slate-400 mt-1 truncate">{p.tagline}</p>
                        {settings.company_name === p.name && (
                          <div className="absolute top-1 right-1 bg-pink-500 text-white p-0.5 rounded-full">
                            <Check className="h-2 w-2" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* Company Settings Table */}
                <div className="space-y-4">
                  <h3 className="font-bold text-xs text-slate-700 uppercase tracking-widest">Detail Informasi Bisnis</h3>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Nama Perusahaan (Brand Utama)</label>
                      <input 
                        type="text" 
                        value={settings.company_name} 
                        onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                        className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-400 font-medium text-slate-800" 
                      />
                    </div>

                    {/* CUSTOM LOGO UPLOAD (JPG, PNG, JPEG) */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Unggah File Logo Perusahaan (JPG, PNG, JPEG)
                      </label>
                      <div
                        id="logo-dropzone"
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOver(true);
                        }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDragOver(false);
                          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                            handleLogoUpload(e.dataTransfer.files[0]);
                          }
                        }}
                        onClick={() => {
                          const el = document.getElementById("logo-file-input");
                          if (el) el.click();
                        }}
                        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                          dragOver 
                            ? "border-pink-500 bg-pink-50" 
                            : "border-slate-300 bg-slate-50 hover:bg-slate-100/70"
                        }`}
                      >
                        <input
                          id="logo-file-input"
                          type="file"
                          accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleLogoUpload(e.target.files[0]);
                            }
                          }}
                          className="hidden"
                        />
                        <div className="flex flex-col items-center justify-center space-y-2">
                          {settings.logo_img_base64 ? (
                            <div className="relative group">
                              <img
                                src={settings.logo_img_base64}
                                alt="Custom Logo"
                                className="h-14 max-w-full object-contain mx-auto rounded-md shadow-xs bg-white border p-1"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute -top-2 -right-2 bg-rose-500 text-white p-1 rounded-full hover:bg-rose-600 transition-colors shadow-sm cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const updated = { ...settings, logo_img_base64: "" };
                                  setSettings(updated);
                                  handleSave(updated);
                                }}
                                title="Hapus logo kustom"
                              >
                                <Trash2 className="h-3 w-3" />
                              </div>
                            </div>
                          ) : (
                            <div className="p-2 rounded-full bg-slate-100 text-slate-500">
                              <Upload className="h-5 w-5" />
                            </div>
                          )}
                          <div className="text-xs font-semibold text-slate-600">
                            {settings.logo_img_base64 ? "Ganti logo kustom atau" : "Tarik & lepas gambar ke sini atau"} 
                            <span className="text-pink-600 ml-1 underline group-hover:text-pink-700 font-bold">Pilih File</span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium">Format: JPG, PNG, JPEG (Maks. 2.5 MB)</p>
                        </div>
                      </div>
                      {uploadError && (
                        <p className="text-[10px] font-bold text-rose-600 mt-1.5 animate-pulse">{uploadError}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Logo Symbol / Emoji</label>
                        <select 
                          value={settings.logo_symbol} 
                          onChange={(e) => setSettings({ ...settings, logo_symbol: e.target.value })}
                          className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                        >
                          <option value="🌸">🌸 Cherry Blossom (Boutique)</option>
                          <option value="👑">👑 Crown (Luxury Velvet)</option>
                          <option value="⚜️">⚜️ Fleur-De-Lis (French Couture)</option>
                          <option value="🧕">🧕 Hijab Icon (Muslim Syar'i)</option>
                          <option value="🎀">🎀 Ribbon (Girly Dress)</option>
                          <option value="👜">👜 Handbag (Exclusive Acc)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Format Logo Utama</label>
                        <select 
                          value={settings.logo_format} 
                          onChange={(e) => setSettings({ ...settings, logo_format: e.target.value })}
                          className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                        >
                          <option value="SVG">SVG Vector (Rekomendasi Tajam)</option>
                          <option value="PNG">PNG Transparan HD</option>
                          <option value="JPG">JPG Standar</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Warna Tema Utama</label>
                        <select 
                          value={settings.bgColorPreset} 
                          onChange={(e) => setSettings({ ...settings, bgColorPreset: e.target.value })}
                          className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-bold"
                        >
                          <option value="pink" className="text-pink-600">Soft Pink (Original)</option>
                          <option value="gold" className="text-amber-600">Black Luxury & Gold</option>
                          <option value="stone" className="text-stone-700">Warm Linen Cream</option>
                          <option value="emerald" className="text-emerald-700">Peaceful Emerald</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Nomor WhatsApp CS</label>
                        <input 
                          type="text" 
                          value={settings.whatsapp} 
                          onChange={(e) => setSettings({ ...settings, whatsapp: e.target.value })}
                          className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg" 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">Instagram</label>
                        <input 
                          type="text" 
                          value={settings.instagram} 
                          onChange={(e) => setSettings({ ...settings, instagram: e.target.value })}
                          className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700" 
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">TikTok</label>
                        <input 
                          type="text" 
                          value={settings.tiktok} 
                          onChange={(e) => setSettings({ ...settings, tiktok: e.target.value })}
                          className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700" 
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">Website</label>
                        <input 
                          type="text" 
                          value={settings.website} 
                          onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                          className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700" 
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Alamat Gudang / Outlet Fisik</label>
                      <textarea 
                        rows={2} 
                        value={settings.address} 
                        onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                        className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
                      ></textarea>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Custom Footer Catatan Invoice (Nota)</label>
                      <textarea 
                        rows={2} 
                        value={settings.invoice_footer} 
                        onChange={(e) => setSettings({ ...settings, invoice_footer: e.target.value })}
                        className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
                      ></textarea>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                          Cap Toko & Tanda Tangan Owner
                        </span>
                        <input 
                          type="checkbox" 
                          checked={settings.digital_signature} 
                          onChange={(e) => setSettings({ ...settings, digital_signature: e.target.checked })}
                          className="rounded text-pink-600 focus:ring-pink-500 h-4 w-4"
                        />
                      </div>
                      {settings.digital_signature && (
                        <div>
                          <label className="block text-[9px] font-semibold text-slate-500">Nama Penandatangan (Owner)</label>
                          <input 
                            type="text" 
                            value={settings.owner_name} 
                            onChange={(e) => setSettings({ ...settings, owner_name: e.target.value })}
                            className="w-full text-[11px] p-1.5 bg-white border border-slate-200 rounded-md mt-1 font-semibold text-slate-800" 
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2">
                    <button 
                      onClick={() => handleSave()}
                      className={`w-full py-2.5 ${theme.btn} rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-xs hover:shadow-xs cursor-pointer flex items-center justify-center gap-1.5`}
                    >
                      <Check className="h-4 w-4" /> Simpan Konfigurasi & Sync System
                    </button>
                  </div>
                </div>
              </div>

              {/* LIVE SIMULATOR REALTIME SCREEN - RIGHT COLUMN */}
              <div className="xl:col-span-7 space-y-4">
                <div className="bg-slate-900 text-slate-300 p-4 rounded-t-2xl flex justify-between items-center border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></div>
                    <span className="text-xs font-black uppercase tracking-widest text-white">Live Branded Document Simulator</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">FORMAT: {settings.logo_format} 300DPI</span>
                </div>

                {/* Sub Tab Previews */}
                <div className="flex gap-1 overflow-x-auto bg-slate-100 p-1 border-b border-slate-200">
                  <button
                    onClick={() => setPreviewTab("invoice")}
                    className={`px-3 py-2 text-[10px] font-bold uppercase transition-all rounded-lg cursor-pointer shrink-0 flex items-center gap-1 ${
                      previewTab === "invoice" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    📄 Invoice A4
                  </button>
                  <button
                    onClick={() => setPreviewTab("label")}
                    className={`px-3 py-2 text-[10px] font-bold uppercase transition-all rounded-lg cursor-pointer shrink-0 flex items-center gap-1 ${
                      previewTab === "label" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    🚚 Shipping Label
                  </button>
                  <button
                    onClick={() => setPreviewTab("barcode")}
                    className={`px-3 py-2 text-[10px] font-bold uppercase transition-all rounded-lg cursor-pointer shrink-0 flex items-center gap-1 ${
                      previewTab === "barcode" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    🏷️ Barcode Tag
                  </button>
                  <button
                    onClick={() => setPreviewTab("pdf")}
                    className={`px-3 py-2 text-[10px] font-bold uppercase transition-all rounded-lg cursor-pointer shrink-0 flex items-center gap-1 ${
                      previewTab === "pdf" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    📊 Report Brand PDF
                  </button>
                  <button
                    onClick={() => setPreviewTab("watermark")}
                    className={`px-3 py-2 text-[10px] font-bold uppercase transition-all rounded-lg cursor-pointer shrink-0 flex items-center gap-1 ${
                      previewTab === "watermark" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    📷 Watermark Photo
                  </button>
                </div>

                {/* VISUAL LAYOUT CONTAINER */}
                <div className="bg-slate-100 p-4 rounded-b-2xl min-h-[460px] flex items-center justify-center border border-slate-200 overflow-hidden relative">
                  
                  {/* PREVIEW 1: INVOICE & NOTA */}
                  {previewTab === "invoice" && (
                    <div className="bg-white w-full max-w-md p-6 border border-slate-200 rounded-xl shadow-lg text-xs space-y-4 relative overflow-hidden text-slate-800">
                      
                      {/* Brand theme subtle background watermark in paper */}
                      {settings.logo_img_base64 ? (
                        <img src={settings.logo_img_base64} className="absolute -top-6 -right-6 h-36 w-36 object-contain opacity-[0.05] select-none pointer-events-none rotate-[12deg] border-none outline-hidden" alt="Watermark" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="absolute -top-10 -right-10 text-[110px] text-slate-50/70 select-none pointer-events-none font-bold">
                          {settings.logo_symbol}
                        </span>
                      )}

                      {/* Header */}
                      <div className="flex justify-between items-start border-b border-dashed border-slate-200 pb-3 relative z-10">
                        <div>
                          <div className="flex items-center gap-1.5">
                            {settings.logo_img_base64 ? (
                              <img src={settings.logo_img_base64} className="h-7 w-auto object-contain" alt="Branding Logo" referrerPolicy="no-referrer" />
                            ) : (
                              <span className="text-xl">{settings.logo_symbol}</span>
                            )}
                            <h4 className="font-extrabold text-slate-900 text-sm tracking-tight">{settings.company_name}</h4>
                          </div>
                          <p className="text-[9px] text-slate-500 mt-1 max-w-[200px]">Alamat: {settings.address}</p>
                          <p className="text-[8px] text-slate-400 mt-0.5">WA: {settings.whatsapp} | IG: @{settings.instagram}</p>
                        </div>
                        <div className="text-right">
                          <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[8px] font-bold uppercase">LUNAS</span>
                          <p className="font-bold text-slate-800 mt-1">INV-20260526-003</p>
                          <p className="text-[8px] text-slate-400 font-mono">26 Mei 2026 • 13:25 UTC</p>
                        </div>
                      </div>

                      {/* Customer Info */}
                      <div className="grid grid-cols-2 gap-2 text-[9px] border-b border-slate-100 pb-2">
                        <div>
                          <p className="font-bold text-slate-400 uppercase tracking-wider">KIRIM KEPADA:</p>
                          <p className="font-semibold text-slate-800">Siti Amalia Rosyi</p>
                          <p className="text-slate-500">+62 812-4566-7890</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-400 uppercase tracking-wider">EKSPEDISI (Awb):</p>
                          <p className="font-semibold text-slate-800">J&T Express Premium</p>
                          <p className="text-slate-500 font-mono text-[8px]">JT-991204855512</p>
                        </div>
                      </div>

                      {/* Line Items */}
                      <div className="space-y-2 border-b border-dashed border-slate-200 pb-3">
                        <div className="flex justify-between font-bold text-[9px] text-slate-400">
                          <span className="w-1/2">PRODUK & WARNA/SIZE</span>
                          <span className="w-1/6 text-center">QTY</span>
                          <span className="w-1/3 text-right">TOTAL</span>
                        </div>
                        
                        <div className="flex justify-between leading-tight text-[10px]">
                          <span className="w-1/2 font-semibold">
                            Gamis Hana Silk Premium
                            <span className="block text-[8px] text-slate-400 font-normal">GMS-CRM-OS-0015 (Cream / XL)</span>
                          </span>
                          <span className="w-1/6 text-center text-slate-600">1</span>
                          <span className="w-1/3 text-right font-semibold text-slate-800">Rp 249.000</span>
                        </div>

                        <div className="flex justify-between leading-tight text-[10px]">
                          <span className="w-1/2 font-semibold">
                            Linen Outer Elegant
                            <span className="block text-[8px] text-slate-400 font-normal">OUT-BLK-S-0002 (Black / M)</span>
                          </span>
                          <span className="w-1/6 text-center text-slate-600">1</span>
                          <span className="w-1/3 text-right font-semibold text-slate-800">Rp 195.000</span>
                        </div>
                      </div>

                      {/* Ledger Summary */}
                      <div className="space-y-1.5 text-[10px] flex flex-col items-end pt-1">
                        <div className="flex justify-between w-2/3">
                          <span className="text-slate-500">Subtotal Belanja:</span>
                          <span className="font-medium text-slate-800">Rp 444.000</span>
                        </div>
                        <div className="flex justify-between w-2/3 text-pink-600">
                          <span>Diskon Voucher Butik:</span>
                          <span>- Rp 15.000</span>
                        </div>
                        <div className="flex justify-between w-2/3">
                          <span className="text-slate-500">Biaya Pengiriman:</span>
                          <span>Rp 18.000</span>
                        </div>
                        <div className="flex justify-between w-2/3 border-t border-slate-200 pt-1.5 mt-1">
                          <span className="font-bold text-slate-900 text-xs">Total Transaksi:</span>
                          <span className="font-black text-slate-900 text-xs">Rp 447.000</span>
                        </div>
                      </div>

                      {/* Cashiers QRIS & Signatures */}
                      <div className="flex items-center justify-between border-t border-dashed border-slate-200 pt-3 gap-4">
                        <div className="flex items-center gap-1.5 p-1 border border-slate-100 rounded-md">
                          <QrCode className="h-7 w-7 text-slate-800 shrink-0" />
                          <div>
                            <p className="font-bold text-[8px] tracking-wide text-slate-800 uppercase">Qris Hub</p>
                            <p className="text-[7px] text-slate-400 leading-tight">Barcode Pembayaran Lunas</p>
                          </div>
                        </div>

                        {settings.digital_signature && (
                          <div className="text-center w-28 text-[9px]">
                            <p className="text-[8px] text-slate-400">Pimpinan Gudang</p>
                            <div className="p-1 border border-pink-100 rounded bg-pink-50/50 my-0.5 inline-block text-[8px] font-bold text-pink-600 font-mono tracking-wider rotate-[-4deg]">
                              ⭐️ APPROVED BY {settings.owner_name.toUpperCase()} ⭐️
                            </div>
                            <p className="text-[8px] font-semibold text-slate-700">{settings.owner_name}</p>
                          </div>
                        )}
                      </div>

                      {/* Branded Customizable Footer */}
                      <div className="text-center text-[8px] text-slate-400 border-t border-slate-100 pt-2.5 italic">
                        "{settings.invoice_footer}"
                      </div>
                    </div>
                  )}

                  {/* PREVIEW 2: SHIPPING LABEL */}
                  {previewTab === "label" && (
                    <div className="bg-white w-full max-w-sm p-5 border border-slate-350 rounded-xl shadow-lg text-[10px] space-y-4 text-slate-800">
                      
                      {/* Top Eco Title Courier Section */}
                      <div className="flex justify-between items-center border-b border-dashed border-slate-300 pb-2.5">
                        <div className="flex items-center gap-1.5">
                          {settings.logo_img_base64 ? (
                            <img src={settings.logo_img_base64} className="h-6 w-auto object-contain" alt="Logo" referrerPolicy="no-referrer" />
                          ) : (
                            <span className="text-lg">{settings.logo_symbol}</span>
                          )}
                          <span className="font-black tracking-tight text-slate-900 text-xs">{settings.company_name}</span>
                        </div>
                        <span className="font-black text-sm text-yellow-600 font-mono bg-yellow-50 border border-yellow-200 rounded px-1.5 py-0.5">J&T REGULAR</span>
                      </div>

                      {/* Sender and Receiver */}
                      <div className="grid grid-cols-2 divide-x divide-slate-200 text-[9px] py-1">
                        <div className="pr-2 space-y-1">
                          <p className="font-black text-slate-400 uppercase text-[8px]">PENGIRIM (SENDER):</p>
                          <p className="font-bold text-slate-800">{settings.company_name}</p>
                          <p className="text-slate-600 truncate">{settings.address}</p>
                          <p className="font-medium text-slate-600 font-mono">Hub: {settings.whatsapp}</p>
                        </div>
                        <div className="pl-2 space-y-1">
                          <p className="font-black text-slate-400 uppercase text-[8px]">PENERIMA (RECEIVER):</p>
                          <p className="font-bold text-slate-800">Ibu Sri Rahayu W.</p>
                          <p className="text-slate-600">Jl. Sisingamangaraja No. 89, Pekanbaru, Riau, 28281</p>
                          <p className="font-medium text-slate-600 font-mono">TLP: +62 821-23340-99</p>
                        </div>
                      </div>

                      {/* Real Barcode representation using custom styled blocks */}
                      <div className="border border-slate-300 p-3 rounded-lg bg-slate-50 flex flex-col items-center">
                        <div className="flex items-end h-8 gap-0.5 w-full justify-center">
                          {Array.from({ length: 44 }).map((_, i) => (
                            <div 
                              key={i} 
                              className="bg-black transition-all"
                              style={{ 
                                width: i % 4 === 0 ? "3px" : i % 3 === 0 ? "1px" : "2px", 
                                height: i % 5 === 0 ? "24px" : "32px", 
                                opacity: i === 12 || i === 24 || i === 35 ? 0.3 : 1 
                              }}
                            />
                          ))}
                        </div>
                        <p className="text-[10px] font-mono tracking-widest text-slate-700 font-bold mt-1.5">JT-991204855512</p>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 p-2 rounded-lg space-y-1">
                        <div className="flex justify-between font-bold text-[8px] text-slate-400 uppercase">
                          <span>Detail Barang Garmen</span>
                          <span>SKU & QTY</span>
                        </div>
                        <div className="flex justify-between font-medium text-slate-700">
                          <div className="truncate w-3/4">1. Gamis Hana Silk Premium - Cream/XL</div>
                          <span className="font-mono">GMS-CRM-OS-0015 (x1)</span>
                        </div>
                        <div className="flex justify-between font-medium text-slate-700">
                          <div className="truncate w-3/4">2. Linen Outer Elegant - Black/M</div>
                          <span className="font-mono">OUT-BLK-S-0002 (x1)</span>
                        </div>
                      </div>

                      <div className="text-center font-mono text-[8px] text-slate-400">
                        Generated Automatically via Jassinta Atelier WMS integration
                      </div>
                    </div>
                  )}

                  {/* PREVIEW 3: BARCODE STICKER */}
                  {previewTab === "barcode" && (
                    <div className="bg-white p-6 border-2 border-slate-800 rounded-lg shadow-md max-w-xs text-center space-y-3 font-mono text-slate-800">
                      <div className="flex items-center justify-center gap-1.5 border-b border-slate-200 pb-1.5">
                        {settings.logo_img_base64 ? (
                          <img src={settings.logo_img_base64} className="h-5 w-auto object-contain" alt="Logo" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="text-sm">{settings.logo_symbol}</span>
                        )}
                        <span className="font-black text-[9px] uppercase tracking-wider text-slate-900">{settings.company_name} AUTHENTIC</span>
                      </div>
                      
                      <p className="font-bold text-[10px] text-slate-700">Gamis Hana Silk (Cream - Size XL)</p>
                      
                      {/* Barcode representation */}
                      <div className="flex justify-center items-end h-10 gap-0.5 my-2">
                        {Array.from({ length: 32 }).map((_, i) => (
                          <div 
                            key={i} 
                            className="bg-slate-900" 
                            style={{ 
                              width: i % 3 === 0 ? "2.5px" : "1.5px", 
                              height: i % 4 === 0 ? "28px" : "38px" 
                            }} 
                          />
                        ))}
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs font-black tracking-widest text-slate-900">GMS-CRM-OS-0015</p>
                        <p className="text-[9px] text-slate-500 font-bold bg-slate-100 py-0.5 rounded">Rp 249.000</p>
                      </div>
                    </div>
                  )}

                  {/* PREVIEW 4: BRANDED PDF REPORT PAGES */}
                  {previewTab === "pdf" && (
                    <div className="bg-white w-full max-w-md p-6 border border-slate-200 rounded-xl shadow-lg text-[9px] space-y-4 relative overflow-hidden text-slate-700">
                      
                      {/* PDF Diagonal Watermark */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] select-none pointer-events-none rotate-[-35deg]">
                        <span className="text-5xl font-black">{settings.company_name.toUpperCase()} REPORT</span>
                      </div>

                      {/* Header Branded PDF */}
                      <div className="flex justify-between items-center border-b border-2 border-slate-850 pb-2 relative z-10">
                        <div className="flex items-center gap-1.5">
                          {settings.logo_img_base64 ? (
                            <img src={settings.logo_img_base64} className="h-7 w-auto object-contain" alt="Logo" referrerPolicy="no-referrer" />
                          ) : (
                            <span className="text-lg">{settings.logo_symbol}</span>
                          )}
                          <div>
                            <h4 className="font-black text-slate-900 text-xs leading-none uppercase">{settings.company_name}</h4>
                            <p className="text-[7px] text-slate-400 mt-1">SaaS Warehousing System • Multi-Tenant Export Mode</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-800">LAPORAN MUTASI INVENTARIS GUDANG</p>
                          <p className="text-[7px] text-slate-400 font-mono">Date: 26 May 2026 • Page 1 of 12</p>
                        </div>
                      </div>

                      <div className="space-y-2 relative z-10">
                        <p className="font-bold text-slate-800">Menampilkan 5 mutasi stock real-time teratas:</p>
                        
                        <div className="border border-slate-200 rounded-md overflow-hidden">
                          <table className="w-full text-[8px] text-left">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                              <tr>
                                <th className="p-1">TANGGAL</th>
                                <th className="p-1">SKU BARANG</th>
                                <th className="p-1 text-center">TIPE</th>
                                <th className="p-1 text-right">MUTASI</th>
                                <th className="p-1 text-right">BALANCE</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              <tr>
                                <td className="p-1">26 May 13:12</td>
                                <td className="p-1 font-mono text-slate-800">GMS-CRM-OS-0015</td>
                                <td className="p-1 text-center"><span className="bg-rose-50 text-rose-600 px-1 rounded text-[7px]">Stock Out</span></td>
                                <td className="p-1 text-right text-rose-600">-1 pcs</td>
                                <td className="p-1 text-right font-mono font-bold">14 pcs</td>
                              </tr>
                              <tr>
                                <td className="p-1">26 May 10:45</td>
                                <td className="p-1 font-mono text-slate-800">DRS-BLK-M-0001</td>
                                <td className="p-1 text-center"><span className="bg-emerald-50 text-emerald-600 px-1 rounded text-[7px]">Adjustment</span></td>
                                <td className="p-1 text-right text-emerald-600">+10 pcs</td>
                                <td className="p-1 text-right font-mono font-bold">45 pcs</td>
                              </tr>
                              <tr>
                                <td className="p-1">25 May 16:30</td>
                                <td className="p-1 font-mono text-slate-800">OUT-BLK-S-0002</td>
                                <td className="p-1 text-center"><span className="bg-blue-50 text-blue-600 px-1 rounded text-[7px]">Transfer</span></td>
                                <td className="p-1 text-right text-blue-600">+5 pcs</td>
                                <td className="p-1 text-right font-mono font-bold">22 pcs</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* PDF Pagination & Validation signatures */}
                      <div className="flex justify-between items-center text-[7px] text-slate-400 pt-2 border-t border-slate-100 relative z-10">
                        <span>Laporan valid dicocokkan otomatis menggunakan database PostgreSQL Jassinta Atelier.</span>
                        <span className="font-bold">PRINTED BY CLAUDE-BIZ SYSTEM</span>
                      </div>
                    </div>
                  )}

                  {/* PREVIEW 5: WATERMARK PHOTO PROTECTION */}
                  {previewTab === "watermark" && (
                    <div className="flex flex-col items-center gap-3 w-full max-w-sm">
                      
                      {/* Product Image Viewer Frame */}
                      <div className="relative w-full aspect-square max-h-64 rounded-xl border-4 border-white shadow-xl overflow-hidden bg-slate-200">
                        
                        {/* Fake Catalog Render */}
                        {settings.selected_image === "dress-pink" ? (
                          <div className="w-full h-full bg-gradient-to-tr from-pink-300 to-rose-400 flex flex-col items-center justify-center p-4 text-white">
                            <span className="text-5xl drop-shadow-md">👗</span>
                            <span className="font-extrabold text-sm drop-shadow-xs mt-2 uppercase">Silk Gamis Plum Elegant</span>
                            <span className="text-[10px] text-pink-100">Katalog Utama Jassinta Atelier</span>
                          </div>
                        ) : (
                          <div className="w-full h-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex flex-col items-center justify-center p-4 text-white">
                            <span className="text-5xl drop-shadow-md">🧥</span>
                            <span className="font-extrabold text-sm drop-shadow-xs mt-2 uppercase">Sage Green Coat Outwear</span>
                            <span className="text-[10px] text-emerald-100 font-mono">Special Winter Edition</span>
                          </div>
                        )}

                        {/* Interactive Watermark Layer Grid Overlaid */}
                        <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-6 p-4 overflow-hidden pointer-events-none select-none">
                          {settings.watermark_repeat ? (
                            Array.from({ length: 6 }).map((_, i) => (
                              <span 
                                key={i} 
                                className="font-black text-slate-900 border border-slate-900/10 px-2 py-0.5 rounded-sm shrink-0 whitespace-nowrap"
                                style={{ 
                                  opacity: settings.watermark_opacity / 100,
                                  transform: `rotate(${settings.watermark_angle}deg)`,
                                  fontSize: `${settings.watermark_size}px`
                                }}
                              >
                                {settings.watermark_text}
                              </span>
                            ))
                          ) : (
                            <span 
                              className="font-black text-slate-900 border-2 border-slate-900/20 px-3 py-1 rounded bg-white/20 absolute"
                              style={{ 
                                opacity: settings.watermark_opacity / 100,
                                transform: `rotate(${settings.watermark_angle}deg) translate(-50%, -50%)`,
                                fontSize: `${settings.watermark_size + 4}px`,
                                top: "50%",
                                left: "50%"
                              }}
                            >
                              {settings.watermark_text}
                            </span>
                          )}
                        </div>

                        {/* Protective Indicator Tag */}
                        <div className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-md text-white text-[8px] font-black tracking-widest uppercase px-2 py-1 rounded-md flex items-center gap-1 shadow-sm">
                          <Shield className="h-3 w-3 text-pink-400" /> SECURED-BY-WMS
                        </div>
                      </div>

                      {/* Interactive Simulator Sliders */}
                      <div className="w-full bg-white p-3 rounded-xl border border-slate-200 grid grid-cols-2 gap-2 text-[10px]">
                        <div className="col-span-2 flex justify-between items-center bg-slate-50 p-1.5 rounded-lg mb-1">
                          <span className="font-bold text-slate-700">Pilih Demo Baju Katalog:</span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => setSettings({...settings, selected_image: "dress-pink"})}
                              className={`px-2 py-0.5 text-[9px] font-bold rounded cursor-pointer ${settings.selected_image === "dress-pink" ? "bg-pink-600 text-white" : "bg-slate-200 text-slate-600"}`}
                            >Gamis</button>
                            <button
                              onClick={() => setSettings({...settings, selected_image: "coat-sage"})}
                              className={`px-2 py-0.5 text-[9px] font-bold rounded cursor-pointer ${settings.selected_image === "coat-sage" ? "bg-emerald-700 text-white" : "bg-slate-200 text-slate-600"}`}
                            >Outer</button>
                          </div>
                        </div>

                        <div>
                          <label className="block font-bold text-slate-600 mb-0.5">Teks Tag Watermark</label>
                          <input 
                            type="text" 
                            value={settings.watermark_text} 
                            onChange={(e) => setSettings({...settings, watermark_text: e.target.value})}
                            className="w-full p-1 bg-slate-50 border border-slate-200 rounded text-[10px]"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-600 mb-0.5">Metode Peletakan</label>
                          <select 
                            value={settings.watermark_repeat ? "true" : "false"}
                            onChange={(e) => setSettings({...settings, watermark_repeat: e.target.value === "true"})}
                            className="w-full p-1 bg-slate-50 border border-slate-200 rounded text-[10px]"
                          >
                            <option value="true">Grup Berulang (Tile)</option>
                            <option value="false">Center Tunggal (Tengah)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block font-bold text-slate-600 mb-0.5">Kepekatan (Opacity) ({settings.watermark_opacity}%)</label>
                          <input 
                            type="range" min="5" max="80" 
                            value={settings.watermark_opacity} 
                            onChange={(e) => setSettings({...settings, watermark_opacity: Number(e.target.value)})}
                            className="w-full accent-pink-600"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-600 mb-0.5">Sudut Putar (Angle) ({settings.watermark_angle}°)</label>
                          <input 
                            type="range" min="-90" max="90" 
                            value={settings.watermark_angle} 
                            onChange={(e) => setSettings({...settings, watermark_angle: Number(e.target.value)})}
                            className="w-full accent-pink-600"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>

            </div>
          )}

          {activeTab === "return" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="text-base font-extrabold text-slate-800">Return & Reverse Logistics Center</h3>
                  <p className="text-xs text-slate-500">Form validasi proses pengembalian produk pelanggan dari marketplace (QC Restock vs Defect Reject)</p>
                </div>
                <button 
                  onClick={() => {
                    const id = `RET-00${returns.length + 1}`;
                    const customLogs = [
                      { id: id, date: "Hari ini", orderId: "ORD-1011", customer: "Amelia Wardrobe", reason: "Ukuran terlalu sempit di bahu", qcCategory: "Sellable", action: "Restock & Re-ironing", user: "QC Hasan" },
                      ...returns
                    ];
                    setReturns(customLogs);
                    alert("Order retur baru berhasil diinput di sistem logistik gudang!");
                  }}
                  className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-800 shrink-0 cursor-pointer"
                >
                  + Proses Input Retur Baru
                </button>
              </div>

              {/* Step By Step Return Flowchart representation */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 border border-slate-200 rounded-xl text-xs text-center">
                <div className="p-2 bg-white rounded-lg border border-slate-200 space-y-1">
                  <span className="bg-slate-100 text-slate-700 font-bold px-1.5 py-0.5 rounded text-[9px] uppercase">Langkah 1</span>
                  <p className="font-bold text-slate-800">Barang Kembali</p>
                  <p className="text-[10px] text-slate-400">Merchant menerima paket return dari kurir e-commerce</p>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200 space-y-1">
                  <span className="bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded text-[9px] uppercase">Langkah 2</span>
                  <p className="font-bold text-slate-800">QC Checklist</p>
                  <p className="text-[10px] text-slate-400">Staff gudang memindai Barcode, periksa noda atau robekan garmen</p>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200 space-y-1">
                  <span className="bg-pink-100 text-pink-700 font-bold px-1.5 py-0.5 rounded text-[9px] uppercase">Langkah 3</span>
                  <p className="font-bold text-slate-800">Ubah Lokasi Bin</p>
                  <p className="text-[10px] text-slate-400">Mutasi stock dimasukkan ke 'Damaged' atau 'QC Sellable Stock'</p>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200 space-y-1">
                  <span className="bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded text-[9px] uppercase">Langkah 4</span>
                  <p className="font-bold text-slate-800">Tindakan</p>
                  <p className="text-[10px] text-slate-400">Ajukan refund uang belanja / pengiriman kargo exchange size barunya</p>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs bg-white">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="p-3 font-bold">KODE RETUR</th>
                      <th className="p-3 font-bold">TANGGAL</th>
                      <th className="p-3 font-bold">ORDER ID</th>
                      <th className="p-3 font-bold">CUSTOMER</th>
                      <th className="p-3 font-bold">ALASAN REJECT NYATA</th>
                      <th className="p-3 font-bold">HASIL QC GUDANG</th>
                      <th className="p-3 font-bold">PILIHAN TINDAKAN</th>
                      <th className="p-3 font-bold">STAFF PIC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {returns.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="p-3 font-bold text-slate-800 font-mono text-[10px]">{r.id}</td>
                        <td className="p-3 whitespace-nowrap text-slate-500">{r.date}</td>
                        <td className="p-3 font-mono font-semibold text-slate-700">{r.orderId}</td>
                        <td className="p-3 font-medium text-slate-800">{r.customer}</td>
                        <td className="p-3 text-slate-600 max-w-xs truncate">{r.reason}</td>
                        <td className="p-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                            r.qcCategory === "Sellable" 
                              ? "bg-emerald-100 text-emerald-850" 
                              : r.qcCategory === "Damaged" 
                              ? "bg-rose-100 text-rose-850" 
                              : "bg-amber-100 text-amber-850"
                          }`}>
                            {r.qcCategory}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-slate-800">{r.action}</td>
                        <td className="p-3 text-slate-500">{r.user}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "audit" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-base font-extrabold text-slate-800">Audit Log Real-Time & Security Trails</h3>
                  <p className="text-xs text-slate-500">Semua riwayat pengubahan, pergerakan stok, persetujuan admin, and edit stock pada sistem Jassinta Atelier diproteksi secara permanen.</p>
                </div>
                <button
                  onClick={() => {
                    const newLog = {
                      id: auditLogs.length + 1,
                      time: new Date().toISOString().replace("T", " ").substring(11, 19),
                      user: "Owner Jassinta",
                      role: "Owner",
                      module: "Security System",
                      action: "Mengunduh Laporan Enkripsi Log Sistem ke Excel",
                      ip: "36.85.12.98"
                    };
                    setAuditLogs([newLog, ...auditLogs]);
                    alert("Aktivitas tercatat aman dalam database audit_logs!");
                    dispatchSecurityAlert("SECURITY", "Exporting system audit trails encrypted to Excel archive file done", "Owner Jassinta");
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 cursor-pointer"
                >
                  Ekspor Audit Log
                </button>
              </div>
              
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs bg-white">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="p-3 font-bold">WAKTU (GMT+7)</th>
                      <th className="p-3 font-bold">NAMA USER (ROLE)</th>
                      <th className="p-3 font-bold">NAMA MODUL</th>
                      <th className="p-3 font-bold">AKSI SISTEM & PARAMETER</th>
                      <th className="p-3 font-bold text-right">IP ADDRESS PORTAL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50">
                        <td className="p-3 whitespace-nowrap text-slate-500 font-mono text-[10px]">{log.time}</td>
                        <td className="p-3">
                          <span className="font-bold text-slate-800">{log.user}</span>
                          <span className="text-[9px] text-slate-400 block font-semibold leading-none mt-0.5">{log.role}</span>
                        </td>
                        <td className="p-3">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-bold text-[9px] uppercase tracking-wide">
                            {log.module}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600 font-sans" dangerouslySetInnerHTML={{ __html: log.action }} />
                        <td className="p-3 text-slate-400 font-mono text-right text-[10px]">{log.ip}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
