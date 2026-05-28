import React, { useState } from "react";
import { 
  TrendingUp, TrendingDown, DollarSign, Download, PlusCircle, Calendar, FileText, PieChart, CornerDownRight
} from "lucide-react";
import { Transaction } from "../types";

interface KeuanganViewProps {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
}

export default function KeuanganView({ transactions, setTransactions }: KeuanganViewProps) {
  const [showAddTx, setShowAddTx] = useState<boolean>(false);
  const [newTx, setNewTx] = useState({
    type: "Masuk",
    category: "Penjualan",
    amount: 150000,
    notes: ""
  });

  // Calculate high fidelity finance ledgers
  const totalInflow = transactions
    .filter(t => t.type === "Masuk")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalOutflow = transactions
    .filter(t => t.type === "Keluar")
    .reduce((sum, t) => sum + t.amount, 0);

  const netProfit = totalInflow - totalOutflow;

  // Let's deduce an estimated Cost of Goods Sold (HPP). 
  // Let's assume wholesale purchase cost (HPP) represents roughly 45% of our Retail Sales Revenue
  const estimatedHPP = Math.round(totalInflow * 0.45);
  const grossMargin = totalInflow - estimatedHPP;
  const operationalExpenses = totalOutflow; // Ads, salaries
  const calculatedNetProfit = grossMargin - operationalExpenses;

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTx.amount || newTx.amount <= 0) {
      alert("Harap masukkan nominal transaksi!");
      return;
    }

    const createdTx: Transaction = {
      id: "TX-" + Math.floor(100 + Math.random() * 900),
      date: new Date().toISOString(),
      type: newTx.type as any,
      category: newTx.category as any,
      amount: Number(newTx.amount),
      notes: newTx.notes || `${newTx.category} harian`
    };

    setTransactions(prev => [createdTx, ...prev]);
    setShowAddTx(false);
    
    // Reset Form
    setNewTx({
      type: "Masuk",
      category: "Penjualan",
      amount: 150000,
      notes: ""
    });
  };

  // Printable finance export simulation
  const handleExportFinance = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["ID,Tanggal,Tipe,Kategori,Nominal,Keterangan"]
        .concat(transactions.map(t => `${t.id},${t.date.split("T")[0]},${t.type},${t.category},${t.amount},"${t.notes}"`))
        .join("\n");
        
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "laporan_keuangan_jassinta_atelier.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="keuangan-view" className="space-y-6">
      {/* Finance general header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-xl border border-pink-100 shadow-2xs">
        <div>
          <h3 className="font-bold text-slate-800 text-base">Arus Kas & Pembukuan Finansial</h3>
          <p className="text-xs text-slate-400">Monitoring laba kotor, HPP garmen, pengeluaran ads, dan sisa laba bersih toko.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddTx(!showAddTx)}
            className="text-xs bg-slate-900 border border-slate-900 text-white font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer"
          >
            Pencatatan Manual
          </button>
          
          <button
            onClick={handleExportFinance}
            className="text-xs bg-pink-600 hover:bg-pink-700 text-white font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Download className="h-4 w-4" /> Ekspor CSV Laporan
          </button>
        </div>
      </div>

      {showAddTx && (
        <form onSubmit={handleAddTransaction} className="bg-white p-5 rounded-xl border border-pink-100 shadow-xs space-y-4">
          <h4 className="font-bold text-slate-800 text-sm border-b pb-2">Catat Transaksi Manual</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Tipe:</label>
              <select
                value={newTx.type}
                onChange={e => {
                  const val = e.target.value;
                  setNewTx({ 
                    ...newTx, 
                    type: val,
                    category: val === "Masuk" ? "Penjualan" : "Restok"
                  });
                }}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-pink-500"
              >
                <option value="Masuk">Kas Masuk (+ Debet)</option>
                <option value="Keluar">Kas Keluar (- Kredit)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Kategori:</label>
              <select
                value={newTx.category}
                onChange={e => setNewTx({ ...newTx, category: e.target.value })}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-pink-500"
              >
                {newTx.type === "Masuk" ? (
                  <>
                    <option value="Penjualan">Uang Penjualan Retail</option>
                    <option value="Operasional">Kelebihan Saldo Kas</option>
                  </>
                ) : (
                  <>
                    <option value="Restok">Membeli Bahan / Restock Supplier</option>
                    <option value="Iklan">Biaya Iklan (TikTok/Instagram Ads)</option>
                    <option value="Gaji">Gaji Admin CS / Bonus Karyawan</option>
                    <option value="Operasional">Listrik/Internet & Packing Solasi</option>
                  </>
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Nominal Rupiah (IDR):</label>
              <input
                type="number"
                value={newTx.amount}
                onChange={e => setNewTx({ ...newTx, amount: Number(e.target.value) })}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Keterangan:</label>
              <input
                type="text"
                placeholder="E.g. Membeli isolasi bening kardus"
                value={newTx.notes}
                onChange={e => setNewTx({ ...newTx, notes: e.target.value })}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 text-xs pt-2">
            <button type="button" onClick={() => setShowAddTx(false)} className="px-4 py-2 border rounded-lg cursor-pointer">Batal</button>
            <button type="submit" className="bg-pink-600 text-white font-bold px-4 py-2 rounded-lg cursor-pointer">Simpan Transaksi</button>
          </div>
        </form>
      )}

      {/* Financial Ledger Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
        {/* Income Card */}
        <div className="bg-white p-3 sm:p-5 rounded-2xl border border-emerald-100 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] sm:text-xs text-slate-400 font-bold tracking-wide uppercase">TOTAL PEMASUKAN</p>
              <h4 className="text-sm sm:text-xl font-bold text-slate-800 mt-1 sm:mt-2 font-mono truncate">
                {totalInflow.toLocaleString("id-ID")}
              </h4>
            </div>
            <span className="p-1.5 sm:p-2.5 bg-emerald-50 text-emerald-600 rounded-lg sm:rounded-xl border border-emerald-100 shrink-0">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
            </span>
          </div>
        </div>

        {/* Expense Card */}
        <div className="bg-white p-3 sm:p-5 rounded-2xl border border-rose-100 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] sm:text-xs text-slate-400 font-bold tracking-wide uppercase">TOTAL PENGELUARAN</p>
              <h4 className="text-sm sm:text-xl font-bold text-slate-800 mt-1 sm:mt-2 font-mono truncate">
                {totalOutflow.toLocaleString("id-ID")}
              </h4>
            </div>
            <span className="p-1.5 sm:p-2.5 bg-rose-50 text-rose-600 rounded-lg sm:rounded-xl border border-rose-100 shrink-0">
              <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5" />
            </span>
          </div>
        </div>

        {/* Profit Card */}
        <div className="col-span-2 lg:col-span-1 bg-slate-900 p-3 sm:p-5 rounded-2xl text-white shadow-2xs hover:shadow-xs transition-shadow relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-24 h-24 bg-pink-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] sm:text-xs text-pink-200 font-bold tracking-wide uppercase">DANA KAS AKTIF</p>
              <h4 className="text-sm sm:text-xl font-bold text-white mt-1 sm:mt-2 font-mono">
                IDR {netProfit.toLocaleString("id-ID")}
              </h4>
            </div>
            <span className="p-1.5 sm:p-2.5 bg-pink-500/20 text-pink-300 rounded-lg sm:rounded-xl border border-pink-500/30 shrink-0">
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
            </span>
          </div>
        </div>
      </div>

      {/* Main financial segment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profit Loss Statement */}
        <div className="bg-white p-6 rounded-2xl border border-pink-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1">
              <FileText className="h-4 w-4 text-pink-600" />
              Laporan Laba/Rugi (Edisi Buku Kas Mei 2026)
            </h4>
            <span className="text-[10px] text-pink-600 bg-pink-50 font-bold px-2 py-0.5 rounded-sm">Otomatis Terhitung</span>
          </div>

          <div className="space-y-3.5 text-xs text-slate-700">
            {/* Sales Revenue */}
            <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-medium">
              <span>A. Total Pemasukan Bersih Retail</span>
              <span className="font-mono text-emerald-600 font-bold">IDR {totalInflow.toLocaleString("id-ID")}</span>
            </div>

            {/* Estimated COGS / HPP */}
            <div className="flex justify-between items-center p-2 rounded-lg border-b border-slate-100">
              <span className="text-slate-500 flex items-center gap-1 pl-2">
                <CornerDownRight className="h-3 w-3 text-slate-400" />
                Estimasi HPP Garmen (45% total omzet)
              </span>
              <span className="font-mono font-medium text-slate-700">IDR {estimatedHPP.toLocaleString("id-ID")}</span>
            </div>

            {/* Gross Profit Row */}
            <div className="flex justify-between items-center bg-pink-50/40 p-2.5 rounded-lg border border-pink-100/40 font-bold text-slate-800">
              <span>B. LABA KOTOR (Omzet - HPP)</span>
              <span className="font-mono text-pink-600">IDR {grossMargin.toLocaleString("id-ID")}</span>
            </div>

            {/* Operating Expenses */}
            <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-medium">
              <span>C. Total Pengeluaran Operasional Toko</span>
              <span className="font-mono text-rose-600 font-bold">IDR {totalOutflow.toLocaleString("id-ID")}</span>
            </div>

            {/* Breakdown of operational expenses */}
            <div className="space-y-1.5 pl-6 text-[11px] text-slate-500">
              <div className="flex justify-between">
                <span>- Pengeluaran Iklan Ads (TikTok/IG)</span>
                <span className="font-mono font-medium text-slate-700">
                  IDR {transactions.filter(t => t.category === "Iklan").reduce((sum, t) => sum + t.amount, 0).toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between">
                <span>- Belanja Bahan Garmen (Restok)</span>
                <span className="font-mono font-medium text-slate-700">
                  IDR {transactions.filter(t => t.category === "Restok").reduce((sum, t) => sum + t.amount, 0).toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between">
                <span>- Penggajian Staff & Komisi CS</span>
                <span className="font-mono font-medium text-slate-700">
                  IDR {transactions.filter(t => t.category === "Gaji").reduce((sum, t) => sum + t.amount, 0).toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between">
                <span>- Listrik & Utilitas Packing</span>
                <span className="font-mono font-medium text-slate-700">
                  IDR {transactions.filter(t => t.category === "Operasional" && t.type === "Keluar").reduce((sum, t) => sum + t.amount, 0).toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            {/* Net Profit Row */}
            <div className="flex justify-between items-center bg-slate-900 text-white p-3 rounded-lg font-bold text-sm">
              <span>D. ESTIMASI LABA BERSIH (B - C)</span>
              <span className="font-mono text-pink-400">IDR {calculatedNetProfit.toLocaleString("id-ID")}</span>
            </div>
          </div>
        </div>

        {/* Cash Flow Ledger Log */}
        <div className="bg-white p-6 rounded-2xl border border-pink-100 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1">
                <PieChart className="h-4 w-4 text-pink-600" />
                Histori Alur Keuangan Kas Harian
              </h4>
              <span className="text-[10px] text-slate-500 font-mono">Terakhir diupdate: 1 Menit Lalu</span>
            </div>

            {/* List */}
            <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
              {transactions.map(t => (
                <div key={t.id} className="flex justify-between items-center text-xs p-2.5 rounded-lg border border-slate-50 hover:bg-slate-50/50">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">{t.notes}</span>
                      {t.platform && (
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                          t.platform === "Shopee" ? "bg-orange-50 text-orange-600" :
                          t.platform === "Tokopedia" ? "bg-emerald-50 text-emerald-600" :
                          t.platform === "WhatsApp" ? "bg-green-50 text-green-600" :
                          t.platform === "Kasir" ? "bg-pink-50 text-pink-600" :
                          "bg-slate-100 text-slate-600"
                        }`}>
                          {t.platform}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        t.category === "Penjualan" ? "bg-emerald-50 text-emerald-600" :
                        t.category === "Iklan" ? "bg-rose-50 text-rose-600" :
                        t.category === "Gaji" ? "bg-blue-50 text-blue-600" :
                        "bg-slate-100 text-slate-600"
                      }`}>
                        {t.category}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono">{new Date(t.date).toLocaleDateString("id-ID")} &bull; ID: {t.id}</p>
                  </div>

                  <span className={`font-mono font-bold text-xs ${t.type === "Masuk" ? "text-emerald-600" : "text-rose-600"}`}>
                    {t.type === "Masuk" ? "+" : "-"} IDR {t.amount.toLocaleString("id-ID")}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[10px] text-slate-400 border-t border-slate-100 pt-3 text-center mt-4 italic">
            Semua transaksi terintegrasi dari modul pergudangan dan kasir marketplace otomatis.
          </p>
        </div>
      </div>
    </div>
  );
}
