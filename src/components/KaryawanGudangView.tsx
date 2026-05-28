import React, { useState } from "react";
import { 
  Users, CheckCircle2, Map, ClipboardList, Calendar, MapPin, Award, Clock
} from "lucide-react";
import { Karyawan, Product, Order } from "../types";

interface KaryawanGudangProps {
  karyawanList: Karyawan[];
  setKaryawanList: React.Dispatch<React.SetStateAction<Karyawan[]>>;
  products: Product[];
  orders: Order[];
}

export default function KaryawanGudangView({ karyawanList, setKaryawanList, products, orders }: KaryawanGudangProps) {
  const [activeKaryawanTab, setActiveKaryawanTab] = useState<"karyawan" | "gudang">("karyawan");
  const [clockingInStaff, setClockingInStaff] = useState<string>("emp1");
  const [attendanceStatus, setAttendanceStatus] = useState<"Hadir" | "Sakit" | "Izin">("Hadir");

  // Filter pending orders that need packaging in the warehouse
  const activePickingOrders = orders.filter(o => o.status === "Proses");

  // Handle staff digital attendance check-in
  const handleClockIn = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = karyawanList.map(emp => {
      if (emp.id === clockingInStaff) {
        // Check if checked in today already
        const todayDateStr = new Date().toISOString().split("T")[0];
        const isAlreadyCheckedIn = emp.attendances.some(att => att.date === todayDateStr);
        if (isAlreadyCheckedIn) {
          alert(`Staff ${emp.name} sudah melakukan absensi hari ini!`);
          return emp;
        }

        const newAttendance = {
          date: todayDateStr,
          checkInTime: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
          status: attendanceStatus
        };

        return {
          ...emp,
          attendances: [newAttendance, ...emp.attendances]
        };
      }
      return emp;
    });

    setKaryawanList(updated);
    alert(`Sukses mencatat absensi digital staff ${karyawanList.find(e => e.id === clockingInStaff)?.name}!`);
  };

  return (
    <div id="karyawan-gudang-view" className="space-y-6">
      {/* Switch selectors */}
      <div className="flex bg-white p-2 rounded-xl border border-pink-100 shadow-2xs">
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveKaryawanTab("karyawan")}
            className={`text-xs px-4 py-2 rounded-md font-medium transition-all cursor-pointer flex items-center gap-2 ${activeKaryawanTab === "karyawan" ? "bg-white text-slate-800 shadow-2xs" : "text-slate-500 hover:text-slate-800"}`}
          >
            <Users className="h-4.5 w-4.5 text-pink-600" />
            Manajemen Karyawan & Absensi Digital
          </button>
          <button
            id="gudang-map-tab-btn"
            onClick={() => setActiveKaryawanTab("gudang")}
            className={`text-xs px-4 py-2 rounded-md font-medium transition-all cursor-pointer flex items-center gap-2 ${activeKaryawanTab === "gudang" ? "bg-white text-slate-800 shadow-2xs" : "text-slate-500 hover:text-slate-800"}`}
          >
            <Map className="h-4.5 w-4.5 text-pink-600" />
            Gudang Digital & Peta Lokasi Rak
          </button>
        </div>
      </div>

      {activeKaryawanTab === "karyawan" ? (
        /* Team management and attendance */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Attendance Forms simulator */}
          <div className="bg-white p-6 rounded-2xl border border-pink-100 shadow-xs space-y-4">
            <div>
              <h3 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                <Clock className="h-4.5 w-4.5 text-pink-600" />
                Absensi Digital Harian Karyawan
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">Simulasi Check-in masuk harian staff dengan waktu presisi otomatis.</p>
            </div>

            <form onSubmit={handleClockIn} className="space-y-3.5 mt-2 text-xs">
              <div>
                <label className="block text-slate-500 font-bold mb-1">Pilih Anggota Tim:</label>
                <select
                  value={clockingInStaff}
                  onChange={e => setClockingInStaff(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white"
                >
                  {karyawanList.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1">Status Kehadiran:</label>
                <div className="flex gap-2">
                  {["Hadir", "Sakit", "Izin"].map(status => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setAttendanceStatus(status as any)}
                      className={`flex-1 text-[11px] font-bold p-2 rounded-lg border text-center cursor-pointer transition-colors ${attendanceStatus === status ? "bg-pink-600 text-white border-pink-600" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t mt-4">
                <button
                  type="submit"
                  className="w-full bg-slate-900 border border-slate-900 text-white font-bold py-2 rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Check In Absen Harian CS
                </button>
              </div>
            </form>
          </div>

          {/* Karyawan profiles with dynamic commissions */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-pink-100 shadow-xs space-y-4">
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                <Award className="h-4.5 w-4.5 text-pink-600" />
                Daftar Karyawan, Performa & Komisi Penjualan
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Komisi otomatis dihitung secara akurat berdasarkan penyelesaian tiket (CS) atau packing (Gudang).</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {karyawanList.map(emp => (
                <div key={emp.id} className="p-4 rounded-xl border border-pink-100 bg-slate-50/40 space-y-3">
                  <div className="flex items-center gap-3">
                    <img src={emp.avatar} alt={emp.name} className="h-10 w-10 object-cover rounded-full border border-slate-200" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{emp.name}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{emp.role} &bull; {emp.phone}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center text-[10.5px] border-t border-slate-200/50 pt-2.5">
                    <div className="p-1.5 bg-white rounded-md border text-slate-600">
                      <span className="text-[9px] text-slate-400 font-bold block mb-0.5">TUGAS SELESAI</span>
                      <span className="font-bold text-slate-800">{emp.completedTasks} Tiket/Order</span>
                    </div>
                    <div className="p-1.5 bg-white rounded-md border text-slate-600">
                      <span className="text-[9px] text-slate-400 font-bold block mb-0.5 font-mono">KOMISI BULAN INI</span>
                      <span className="font-bold text-pink-600 font-mono">IDR {emp.commissionEarned.toLocaleString("id-ID")}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Histori Catatan Absensi:</p>
                    <div className="text-[10px] space-y-1 text-slate-600 max-h-[80px] overflow-y-auto pr-1">
                      {emp.attendances.map((att, idx) => (
                        <div key={idx} className="flex justify-between p-1 bg-white rounded-md border border-slate-100">
                          <span>{att.date} ({att.checkInTime})</span>
                          <span className={`font-bold ${att.status === "Hadir" ? "text-emerald-600" : "text-amber-600"}`}>{att.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Warehouse visualization and picking lists */
        <div id="visual-warehouse-board" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Automated picking list */}
          <div className="bg-white p-6 rounded-2xl border border-pink-100 shadow-xs space-y-4">
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                <ClipboardList className="h-4.5 w-4.5 text-pink-600" />
                Picking List Pengepakan Otomatis (Gudang)
              </h3>
              <p className="text-xs text-slate-400 mt-1">Daftar petunjuk pengambilan barang dari rak penempatan berdasarkan order status 'Proses' terintegrasi.</p>
            </div>

            <div className="space-y-3.5 max-h-[440px] overflow-y-auto pr-1">
              {activePickingOrders.length === 0 ? (
                <div className="p-6 text-center italic text-slate-400 text-xs bg-slate-50 rounded-xl border">
                  👍 Semua order berhasil dipacking! Silakan penuhi order baru.
                </div>
              ) : (
                activePickingOrders.map(order => (
                  <div key={order.id} className="p-4 rounded-xl border border-pink-100 bg-slate-50/40 space-y-2.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-mono font-bold text-slate-800">Order Ref: {order.id}</span>
                      <span className="text-[10.5px] font-bold bg-pink-100 text-pink-800 px-2 py-0.5 rounded-sm">Pack Status: Proses</span>
                    </div>

                    <div className="space-y-2">
                      {order.items.map((item, idx) => {
                        const productMatch = products.find(p => p.sku === item.productSku);
                        return (
                          <div key={`${item.productSku}-${idx}`} className="flex justify-between items-center bg-white p-2 border border-slate-200/50 rounded-lg text-xs leading-relaxed">
                            <div>
                              <p className="font-bold text-slate-800">{item.productName}</p>
                              <p className="text-[10.5px] text-slate-500 font-mono">
                                Varian: {item.color} ({item.size}) &bull; SKU: {item.productSku}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="bg-pink-600 text-white font-bold font-mono px-3 py-1.5 rounded-md text-center block text-sm shadow-2xs">
                                {productMatch?.rackLocation || "Rak Standar"}
                              </span>
                              <span className="text-[10.5px] font-bold text-slate-700 block mt-1">Sisa Ambil: {item.qty} Pcs</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Visual Shelf Layout Maps */}
          <div className="bg-white p-6 rounded-2xl border border-pink-100 shadow-xs flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                  <MapPin className="h-4.5 w-4.5 text-pink-600" />
                  Visual Denah Tata Letak Rak Gudang
                </h3>
                <p className="text-xs text-slate-400 mt-1">Peta virtual tata letak gantungan & tumpukan produk di Gudang Jassinta Atelier. Klik pada rak untuk melihat produk ditaruh.</p>
              </div>

              {/* Warehouse grid layout mockup */}
              <div className="grid grid-cols-2 gap-4 text-xs font-mono pt-3">
                <div 
                  onClick={() => alert("Rak A: Area Penyimpanan Gamis Syari Silk & Tunik Brokat Premium.")}
                  className="bg-emerald-50/50 hover:bg-emerald-100/50 p-4 border-2 border-emerald-300 rounded-xl text-center cursor-pointer transition-colors space-y-1.5"
                >
                  <p className="font-extrabold text-emerald-800 text-sm">RAK BARIS A</p>
                  <p className="text-[10px] text-emerald-600">Rak Gantung & Kebaya</p>
                  <p className="text-[10px] bg-white border border-emerald-250 py-1 rounded-sm text-slate-700">SKU: GMS-SLK, TNK-BRK</p>
                </div>

                <div 
                  onClick={() => alert("Rak B: Area Kemeja, Blouse Oversize, dan Tunik Kasual Katun.")}
                  className="bg-orange-50/50 hover:bg-orange-100/50 p-4 border-2 border-orange-300 rounded-xl text-center cursor-pointer transition-colors space-y-1.5"
                >
                  <p className="font-extrabold text-orange-800 text-sm">RAK BARIS B</p>
                  <p className="text-[10px] text-orange-600">Rak Lipat & Laci Kaca</p>
                  <p className="text-[10px] bg-white border border-orange-250 py-1 rounded-sm text-slate-700">SKU: BLS-LN-SGE</p>
                </div>

                <div 
                  onClick={() => alert("Rak C: Area Celana Kulot Linen Rami and Bawahan Jeans Baggy.")}
                  className="bg-blue-50/50 hover:bg-blue-100/50 p-4 border-2 border-blue-300 rounded-xl text-center cursor-pointer transition-colors space-y-1.5"
                >
                  <p className="font-extrabold text-blue-800 text-sm">RAK BARIS C</p>
                  <p className="text-[10px] text-blue-600">Rak Lipat Bawahan</p>
                  <p className="text-[10px] bg-white border border-blue-250 py-1 rounded-sm text-slate-700">SKU: KLT-HWT-BLK</p>
                </div>

                <div 
                  onClick={() => alert("Rak D: Area Penyimpanan Hijab Segiempat Chantilly, Voal Premium, & Bros Aksesori Jassinta.")}
                  className="bg-purple-50/50 hover:bg-purple-100/50 p-4 border-2 border-purple-300 rounded-xl text-center cursor-pointer transition-colors space-y-1.5"
                >
                  <p className="font-extrabold text-purple-800 text-sm">RAK BARIS D</p>
                  <p className="text-[10px] text-purple-600">Laci Aksesori Hijab</p>
                  <p className="text-[10px] bg-white border border-purple-250 py-1 rounded-sm text-slate-700">SKU: HJB-VOC-PNK</p>
                </div>
              </div>
            </div>

            <p className="text-[10.5px] text-slate-400 text-center border-t border-slate-100 pt-3 mt-6 italic">
              *Denah gudang disesuaikan otomatis dengan kode lokasi SKU di Katalog Produk.*
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
