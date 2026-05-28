import React, { useState } from "react";
import { 
  FileText, UploadCloud, AlertCircle, CheckCircle, RefreshCw, Eye, Sparkles, Loader2, Table, LayoutList, History
} from "lucide-react";
import { Product, StockHistory, Transaction } from "../types";

interface SmartScanViewProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  upsertProduct: (product: Product) => Promise<void>;
  setStockHistory: React.Dispatch<React.SetStateAction<StockHistory[]>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
}

interface OCRItem {
  sku: string;
  name: string;
  qty: number;
  buyPrice: number;
  total: number;
}

export default function SmartScanView({ products, setProducts, upsertProduct, setStockHistory, transactions, setTransactions }: SmartScanViewProps) {
  const [selectedPreset, setSelectedPreset] = useState<"faktur_grosir" | "nota_tangan" | "struk_gudang" | "resi_pengiriman" | null>(null);
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [customBase64, setCustomBase64] = useState<string>("");
  const [loadingOCR, setLoadingOCR] = useState<boolean>(false);
  const [ocrError, setOcrError] = useState<string>("");
  const [aiStatus, setAiStatus] = useState({ hasGemini: false, hasOpenAI: false });

  // Check AI health on mount
  React.useEffect(() => {
    fetch("/api/health")
      .then(r => r.json())
      .then(data => {
        setAiStatus({ hasGemini: data.hasGeminiKey, hasOpenAI: data.hasOpenAIKey });
      })
      .catch(() => {});
  }, []);

  const getOcrUrl = () => {
    if (aiStatus.hasOpenAI) return "/api/openai/ocr";
    return "/api/gemini/ocr";
  };
  
  // OCR Hasil state
  const [ocrResultType, setOcrResultType] = useState<string>("");
  const [ocrItems, setOcrItems] = useState<OCRItem[]>([]);
  const [ocrTotalBill, setOcrTotalBill] = useState<number>(0);
  const [scanStep, setScanStep] = useState<"upload" | "preview" | "confirmed">("upload");
  const [confirmedDirection, setConfirmedDirection] = useState<"masuk" | "keluar">("masuk");

  // Presets descriptions for Indonesian fashion
  const presetsInfo = {
    faktur_grosir: {
      title: "Faktur Resmi Grosir (Printed)",
      desc: "Printed formal tax invoice from Tanah Abang Blok B wholesale merchant, detailing formal SKU code tables.",
      image: "https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=300",
      total: "Rp 5.390.000"
    },
    nota_tangan: {
      title: "Nota Tangan Coretan Penjual",
      desc: "Carbon-copy handwritten paper slip featuring rapid scribbles of blouse and kulot quantities.",
      image: "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=300",
      total: "Rp 2.575.000"
    },
    struk_gudang: {
      title: "Struk Kasir / Bon Agen Fabric",
      desc: "Thermal paper receipt printed at roll cashier desk for premium brokat roll fabric purchases.",
      image: "https://images.unsplash.com/photo-1601597111158-2fceff270190?w=300",
      total: "Rp 1.350.000"
    },
    resi_pengiriman: {
      title: "Resi Pengiriman Resmi (J&T / Shopee Express)",
      desc: "Barcode shipping label containing recipient address and specific apparel item manifest details.",
      image: "https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=300",
      total: "Rp 740.000"
    }
  };

  // Convert uploaded custom files to base64
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCustomFile(file);
    setSelectedPreset(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      setCustomBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Run Gemini API OCR on server
  const triggerAIOCRAnaysis = async () => {
    setLoadingOCR(true);
    setOcrError("");
    try {
      const payload: any = {
        presetName: selectedPreset
      };

      if (customBase64) {
        payload.imageBase64 = customBase64;
        payload.mimeType = customFile?.type || "image/jpeg";
      }

      const res = await fetch(getOcrUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Gagal menghubungi server OCR.");
      }

      const data = await res.json();
      if (data.items) {
        setOcrResultType(data.documentType || "Dokumen Inventaris");
        setOcrItems(data.items);
        setOcrTotalBill(data.totalBill || 0);
        setScanStep("preview");
      } else {
        throw new Error("Layanan AI gagal mengekstrak tabel garmen atau format dokumen tidak dikenal.");
      }
    } catch (err: any) {
      setOcrError(err.message || "Gagal memproses dokumen dengan AI OCR.");
    } finally {
      setLoadingOCR(false);
    }
  };

  // Confirm stock operation (masuk or keluar) and save to cashflow & history ledger
  const handleConfirmStockOperation = (direction: "masuk" | "keluar") => {
    // 1. Update stock levels in catalog products
    ocrItems.forEach(ocrMatch => {
      const prod = products.find(p => p.sku.toUpperCase() === ocrMatch.sku.toUpperCase());
      if (prod) {
        // Distribute stock equally among size S, M, L, XL variants
        const dividedQty = Math.floor(ocrMatch.qty / 4);
        const remainder = ocrMatch.qty % 4;
        
        const updatedProduct = {
          ...prod,
          variants: prod.variants.map((v, i) => {
            const change = dividedQty + (i === 1 ? remainder : 0);
            const currentPhysical = v.physicalStock !== undefined ? v.physicalStock : v.stock;
            const currentReserved = v.reservedStock || 0;
            const newPhysical = direction === "masuk" ? currentPhysical + change : Math.max(0, currentPhysical - change);
            const newAvailable = Math.max(0, newPhysical - currentReserved);
            return {
              ...v,
              physicalStock: newPhysical,
              reservedStock: currentReserved,
              availableStock: newAvailable,
              stock: newAvailable
            };
          })
        };
        upsertProduct(updatedProduct);
      }
    });

    // 2. Insert to StockHistory ledger log
    const stockLogs: StockHistory[] = ocrItems.map(ocr => {
      const catalogMatch = products.find(p => p.sku.toUpperCase() === ocr.sku.toUpperCase());
      const initialPhysical = catalogMatch ? (catalogMatch.variants[1]?.physicalStock ?? catalogMatch.variants[1]?.stock ?? 0) : 0;
      const finalPhysical = direction === "masuk" ? initialPhysical + ocr.qty : Math.max(0, initialPhysical - ocr.qty);
      
      return {
        id: "st-ocr-" + Date.now() + Math.random().toString(36).substr(2, 5),
        productSku: ocr.sku,
        productName: catalogMatch ? catalogMatch.name : ocr.name,
        variantSize: "M", // Central size
        variantColor: "Grosir",
        date: new Date().toISOString(),
        changeQty: direction === "masuk" ? ocr.qty : -ocr.qty,
        type: direction === "masuk" ? "Stock In" : "Stock Out",
        notes: direction === "masuk"
          ? `Stok Masuk Pintar via AI OCR (Scan: ${ocrResultType})`
          : `Stok Keluar Pintar via AI OCR (Scan: ${ocrResultType})`,
        operator: "Ahmad Gudang (Staff)",
        stockTypeAffected: "Physical",
        beforeQty: initialPhysical,
        afterQty: finalPhysical
      };
    });
 
    setStockHistory(prev => [...stockLogs, ...prev]);
 
    // 3. Create cashflow transaction (Cash Outflow for buy, Cash Inflow for sale/adjustment)
    const transactionEntry: Transaction = {
      id: "TX-OCR-" + Math.floor(100 + Math.random() * 900),
      date: new Date().toISOString(),
      type: direction === "masuk" ? "Keluar" : "Masuk",
      category: direction === "masuk" ? "Restok" : "Penjualan",
      amount: ocrTotalBill,
      notes: direction === "masuk"
        ? `Restok stok masuk otomatis via AI OCR - ${ocrResultType}`
        : `Pengeluaran stok keluar otomatis via AI OCR - ${ocrResultType}`
    };
 
    setTransactions(prev => [transactionEntry, ...prev]);
    setConfirmedDirection(direction);
    setScanStep("confirmed");
  };

  return (
    <div id="smart-scan-view" className="space-y-6">
      {/* Top Description panel */}
      <div className="bg-white p-6 rounded-2xl border border-pink-100 shadow-2xs">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-pink-600" />
            Modul Scan Pintar & AI OCR Terintegrasi
            <span className="text-[10px] bg-pink-50 text-pink-700 px-2.5 py-0.5 rounded-full border border-pink-100 flex items-center gap-1.5 ml-auto">
              <Sparkles className="h-3 w-3 animate-pulse" />
              {aiStatus.hasOpenAI ? "OpenAI GPT-4o Vision" : aiStatus.hasGemini ? "Gemini 1.5 Flash Vision" : "Simulation Engine"}
            </span>
          </h2>
        <p className="text-xs text-slate-500 mt-1">
          Hemat waktu packing & audit stok. Cukup upload foto nota pembelian, bon tangan, atau faktur kulakan grosir Tanah Abang, AI kami akan otomatis membaca tabel dan mengupdate stok gudang & cashflow keuangan.
        </p>
      </div>

      {scanStep === "upload" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Preset templates list for demo */}
          <div className="bg-white p-5 rounded-2xl border border-pink-100 shadow-xs space-y-4">
            <div>
              <h3 className="font-extrabold text-slate-700 text-xs flex items-center gap-1">
                <LayoutList className="h-4 w-4 text-pink-600" />
                Langkah 1: Pilih Preset Dokumen Grosir
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">Gunakan template berkas nyata di bawah ini untuk melihat demo keajaiban OCR Vision Gemini.</p>
            </div>

            <div className="space-y-3.5">
              {(Object.keys(presetsInfo) as Array<keyof typeof presetsInfo>).map(key => {
                const info = presetsInfo[key];
                return (
                  <div
                    key={key}
                    onClick={() => {
                      setSelectedPreset(key);
                      setCustomFile(null);
                      setCustomBase64("");
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex gap-3 ${selectedPreset === key ? "bg-pink-50/50 border-pink-400 shadow-3xs" : "bg-slate-50/50 border-slate-200/60 hover:border-pink-200"}`}
                  >
                    <img src={info.image} alt={info.title} className="h-11 w-11 rounded-lg object-cover border border-slate-200" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{info.title}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{info.desc}</p>
                      <span className="text-[10px] font-mono font-bold text-pink-600 block mt-1">Total: {info.total}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upload or Drag file block */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-pink-100 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="font-extrabold text-slate-700 text-xs flex items-center gap-1 mb-3">
                <UploadCloud className="h-4 w-4 text-pink-600" />
                Langkah 2: Ambil Foto / Drag & Drop Berkas Custom
              </h3>
              
              <div className="border-2 border-dashed border-slate-200 hover:border-pink-300 rounded-2xl p-8 text-center bg-slate-50/30 transition-colors cursor-pointer relative group flex flex-col items-center justify-center min-h-[220px]">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <UploadCloud className="h-10 w-10 text-slate-300 group-hover:text-pink-500 transition-colors mb-3" />
                
                {customFile ? (
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-700">Berkas Menerima: {customFile.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">Ukuran: {(customFile.size/1024).toFixed(1)} KB &bull; Tipe: {customFile.type}</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-600">Seret foto struk/nota Anda ke sini, atau klik untuk unggah</p>
                    <p className="text-[10px] text-slate-400">Format pendukung: JPEG, PNG, HEIC. Maksimal 5MB.</p>
                  </div>
                )}
              </div>

              {ocrError && (
                <div className="mt-4 p-3 bg-rose-50 border border-rose-100 rounded-lg flex items-center gap-2.5 text-xs text-rose-800">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <p>{ocrError}</p>
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 pt-4 mt-6 flex justify-end">
              <button
                onClick={triggerAIOCRAnaysis}
                disabled={loadingOCR || (!selectedPreset && !customBase64)}
                className={`text-xs font-bold px-6 py-2.5 rounded-lg flex items-center gap-2 cursor-pointer transition-all ${
                  (selectedPreset || customBase64) 
                    ? "bg-pink-600 hover:bg-pink-700 text-white shadow-sm glow-btn" 
                    : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                }`}
              >
                {loadingOCR ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Asisten AI sedang mengekstrak tulisan...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    Picu Deteksi AI OCR Vision &rarr;
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {scanStep === "preview" && (
        /* Preview Table OCR Results */
        <div className="bg-white p-6 rounded-2xl border border-pink-100 shadow-xs space-y-6">
          <div className="border-b border-rose-100 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
            <div>
              <span className="text-[10px] bg-slate-900 text-white font-mono font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider">
                {ocrResultType}
              </span>
              <h3 className="font-extrabold text-slate-800 text-base mt-2">Pratinjau Hasil Pembacaan AI OCR</h3>
              <p className="text-xs text-slate-400">Verifikasi kelayakan SKU, Qty, dan Harga Beli sebelum menyimpan ke stok gudang logistik.</p>
            </div>
            
            <button
              onClick={() => setScanStep("upload")}
              className="text-xs py-1.5 px-3.5 border rounded-lg hover:bg-slate-50 cursor-pointer text-slate-600 font-medium"
            >
              Ulangi Scan
            </button>
          </div>

          {/* Extracted items table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-xs">
              <thead>
                <tr className="text-left font-semibold text-slate-400 uppercase text-[10px] border-b pb-2 bg-slate-50">
                  <th className="p-3">Kecocokan SKU Katalog</th>
                  <th className="p-3">Nama Garmen</th>
                  <th className="p-3 text-center">Jumlah (Pcs)</th>
                  <th className="p-3 text-right">Harga Beli Grosir</th>
                  <th className="p-3 text-right">Total Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {ocrItems.map((ocrItem, idx) => {
                  const matchedCatalog = products.find(p => p.sku.toUpperCase() === ocrItem.sku.toUpperCase());
                  return (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={ocrItem.sku}
                            onChange={e => {
                              const updated = [...ocrItems];
                              updated[idx].sku = e.target.value;
                              setOcrItems(updated);
                            }}
                            className="font-mono font-bold text-pink-600 border border-slate-250 p-1 rounded-md focus:border-pink-500 focus:outline-none w-32"
                          />
                          {matchedCatalog ? (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold p-1 px-2.5 rounded-full">
                              COCOK: {matchedCatalog.name}
                            </span>
                          ) : (
                            <span className="text-[10px] bg-amber-100 text-amber-800 font-bold p-1 px-2.5 rounded-full animate-bounce">
                              SKU BARU
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={ocrItem.name}
                          onChange={e => {
                            const updated = [...ocrItems];
                            updated[idx].name = e.target.value;
                            setOcrItems(updated);
                          }}
                          className="font-medium text-slate-800 border border-slate-250 p-1 rounded-md focus:outline-none focus:border-pink-500 w-full"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          value={ocrItem.qty}
                          onChange={e => {
                            const updated = [...ocrItems];
                            const qty = Number(e.target.value);
                            updated[idx].qty = qty;
                            updated[idx].total = qty * updated[idx].buyPrice;
                            setOcrItems(updated);
                            setOcrTotalBill(updated.reduce((sum, item) => sum + item.total, 0));
                          }}
                          className="text-center font-bold font-mono border border-slate-250 p-1 rounded-md focus:outline-none focus:border-pink-500 w-16"
                        />
                      </td>
                      <td className="p-3 text-right">
                        <input
                          type="number"
                          value={ocrItem.buyPrice}
                          onChange={e => {
                            const updated = [...ocrItems];
                            const price = Number(e.target.value);
                            updated[idx].buyPrice = price;
                            updated[idx].total = price * updated[idx].qty;
                            setOcrItems(updated);
                            setOcrTotalBill(updated.reduce((sum, item) => sum + item.total, 0));
                          }}
                          className="text-right font-mono border border-slate-250 p-1 rounded-md focus:outline-none focus:border-pink-500 w-24"
                        />
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-800 text-xs">
                        IDR {ocrItem.total.toLocaleString("id-ID")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pricing total section */}
          <div className="border-t border-slate-100 pt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-50/50 p-5 rounded-2xl border">
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">TOTAL MANIFEST BARANG / INVOICE:</p>
              <h4 className="text-xl font-bold font-mono text-slate-800 mt-1">
                IDR {ocrTotalBill.toLocaleString("id-ID")}
              </h4>
              <p className="text-[10px] text-slate-400 mt-1">Tentukan arah transaksi stok Anda di bawah ini untuk terekam utuh.</p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={() => setScanStep("upload")}
                className="text-xs font-semibold px-4 py-2.5 border rounded-xl hover:bg-slate-100 cursor-pointer text-slate-600"
              >
                Batal
              </button>
              <button
                onClick={() => handleConfirmStockOperation("keluar")}
                className="text-xs bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold px-5 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Mengurangi stok garmen di Katalog & mencatat pengeluaran/penjualan"
              >
                🔻 Tambahkan ke Stok Keluar
              </button>
              <button
                onClick={() => handleConfirmStockOperation("masuk")}
                className="text-xs bg-pink-600 hover:bg-pink-700 text-white font-bold px-5 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow-sm shadow-pink-600/20"
                title="Menambahkan stok garmen di Katalog & mencatat restok/pembelian"
              >
                🔺 Tambahkan ke Stok Masuk
              </button>
            </div>
          </div>
        </div>
      )}

      {scanStep === "confirmed" && (
        /* Success Message screen */
        <div className="bg-white p-12 rounded-2xl border border-pink-100 shadow-xs text-center space-y-4 max-w-lg mx-auto">
          <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="h-9 w-9" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              {confirmedDirection === "masuk" ? "Yay! Stok Masuk Berhasil Diimpor" : "Yay! Stok Keluar Berhasil Diimpor"}
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              {confirmedDirection === "masuk" 
                ? "Berkas dari supplier garmen berhasil tuntas diaudit. Sistem telah otomatis mendistribusikan penambahan logistik di Katalog, mencoret log keluar masuk di audit trail pergudangan, serta merumuskan pengeluaran modal di Buku Kas Keuangan."
                : "Berkas resi/nota penjualan berhasil tuntas selesai diaudit. Sistem telah otomatis mendistribusikan pengurangan logistik di Katalog, mencoret log keluar masuk di audit trail pergudangan, serta merumuskan pemasukan omzet di Buku Kas Keuangan."
              }
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl text-left text-xs space-y-1">
            <p className="font-bold text-slate-700 uppercase text-[10px] tracking-wide">Summary Transaksi:</p>
            <p className="text-slate-600">
              &bull; Impor Stok: {confirmedDirection === "masuk" ? "+" : "-"}{ocrItems.reduce((acc, i) => acc + i.qty, 0)} pcs garmen fashion
            </p>
            <p className="text-slate-600">
              &bull; Buku Keuangan: {confirmedDirection === "masuk" ? "Aliran Kas Keluar" : "Aliran Kas Masuk"} senilai IDR {ocrTotalBill.toLocaleString("id-ID")}
            </p>
            <p className="text-slate-600">&bull; Operator Logistik: Ahmad Gudang</p>
          </div>

          <div className="pt-4">
            <button
              onClick={() => {
                setScanStep("upload");
                setSelectedPreset(null);
                setCustomFile(null);
                setCustomBase64("");
                setOcrItems([]);
              }}
              className="text-xs bg-slate-900 border border-slate-900 text-white font-bold p-2.5 px-6 rounded-xl transition-all cursor-pointer"
            >
              Scan Berkas Baru
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
