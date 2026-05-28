import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import OpenAI from "openai";

// Load environment variables
dotenv.config();

// Helper to sanitize copy-paste quotation marks or whitespaces from raw environment secrets
function getCleanApiKey(): string | undefined {
  let key = process.env.GEMINI_API_KEY;
  if (!key) return undefined;
  key = key.trim();
  // Strip double quotes if the user pasted like GEMINI_API_KEY="key"
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1).trim();
  }
  return key;
}

// Helper to check if a valid Gemini API Key is present and not the placeholder
function isGeminiKeyValid(): boolean {
  const key = getCleanApiKey();
  return !!key && key !== "" && key !== "MY_GEMINI_API_KEY" && key !== "null" && key !== "undefined";
}

// OpenAI API Key Helpers
function getCleanOpenAIKey(): string | undefined {
  let key = process.env.OPENAI_API_KEY;
  if (!key) return undefined;
  key = key.trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1).trim();
  }
  return key;
}

function isOpenAIKeyValid(): boolean {
  const key = getCleanOpenAIKey();
  return !!key && key !== "" && key !== "null" && key !== "undefined";
}

// Print startup API status to diagnostic console logs
(() => {
  const gKey = getCleanApiKey();
  if (isGeminiKeyValid()) {
    console.log(`[Jassinta API Controller] Status: Real Gemini API Key detected starting with: "${gKey?.substring(0, 8)}..."`);
  } else {
    console.log(`[Jassinta API Controller] Warning: Real Gemini API Key not registered.`);
  }

  const oKey = getCleanOpenAIKey();
  if (isOpenAIKeyValid()) {
    console.log(`[Jassinta API Controller] Status: Real OpenAI API Key detected starting with: "${oKey?.substring(0, 8)}..."`);
  } else {
    console.log(`[Jassinta API Controller] Warning: Real OpenAI API Key not registered.`);
  }
})();

// Lazy initializer for OpenAI SDK
let openaiInstance: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    const key = getCleanOpenAIKey();
    if (!key) {
      throw new Error("OPENAI_API_KEY belum dikonfigurasi.");
    }
    openaiInstance = new OpenAI({
      apiKey: key,
    });
  }
  return openaiInstance;
}

// Lazy initializer for Gemini SDK
let aiInstance: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI {
  if (!aiInstance) {
    const key = getCleanApiKey();
    if (!key || key === "MY_GEMINI_API_KEY") {
      throw new Error("GEMINI_API_KEY belum dikonfigurasi. Harap atur di menu Secrets.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

// -------------------------------------------------------------
// High-Fidelity Local AI Simulation & Quota Exhaustion Fallbacks
// -------------------------------------------------------------

function fallbackChatbot(message: string, products: any[], orders: any[]): string {
  const msgLower = message.toLowerCase();
  let text = "";

  if (msgLower.includes("halo") || msgLower.includes("hai") || msgLower.includes("pagi") || msgLower.includes("siang") || msgLower.includes("sore") || msgLower.includes("malam")) {
    text = `Halo Kak! Selamat datang di **Jassinta Atelier** ✨\n\nSaya **Jassinta-Bot**, asisten virtual Anda yang siap membantu dengan penuh kasih sayang. \n\nAda yang bisa saya bantu hari ini, Kak? Kakak bisa menanyakan tentang stok produk, status pesanan, rekomendasi ootd, maupun panduan retur garmen kami! 💕`;
  } else if (msgLower.includes("stok") || msgLower.includes("produk") || msgLower.includes("katalog")) {
    text = `Tentu Kak! Berikut beberapa koleksi terlaris dari katalog garmen **Jassinta Atelier** yang ready stock saat ini:\n\n`;
    const list = products.slice(0, 3);
    if (list.length > 0) {
      list.forEach(p => {
        text += `• **${p.name}** (${p.category}) - *SKU: ${p.sku}*\n`;
        text += `  💰 Harga: Rp ${Number(p.sellPrice || 0).toLocaleString("id-ID")}\n`;
        if (p.variants && p.variants.length > 0) {
          text += `  🎨 Varian: ${p.variants.map((v: any) => `${v.color} (${v.size}: ${v.stock} pcs)`).join(", ")}\n\n`;
        } else {
          text += `  🎨 Varian: Hitam (S, M, L)\n\n`;
        }
      });
    } else {
      text += `• **Gamis Hana Silk** (Gamis) - *Rp 249.000*\n  🎨 Varian: Sage Green, Plum, Black (S, M, L)\n• **Blouse Lily Linen** (Blouse) - *Rp 189.000*\n  🎨 Varian: Cream, White, Navy (All Size)\n\n`;
    }
    text += `Apakah ada produk garmen spesifik yang ingin Kakak tanyakan ukuran atau ketersediaannya? 😊`;
  } else if (msgLower.includes("order") || msgLower.includes("pesan") || msgLower.includes("kirim") || msgLower.includes("lacak") || msgLower.includes("ord-")) {
    const cleanMsg = msgLower.replace(/[^a-zA-Z0-9-]/g, " ");
    const match = cleanMsg.split(" ").find(w => w.startsWith("ord-") || w.match(/\d{4}/));
    let matchedOrder = null;
    if (match) {
      const criteria = match.toLowerCase();
      matchedOrder = orders.find(o => o.id.toLowerCase().includes(criteria) || o.customerName.toLowerCase().includes(criteria));
    }
    if (!matchedOrder && orders.length > 0) {
      matchedOrder = orders[0];
    }

    if (matchedOrder) {
      text = `Halo Kak! Rincian pesanan dengan nomor **${matchedOrder.id}** atas nama **${matchedOrder.customerName}** adalah sebagai berikut:\n\n`;
      text += `• **Status**: **${matchedOrder.status.toUpperCase()}** 📦\n`;
      text += `• **Tanggal & Waktu**: ${matchedOrder.date} pkl ${matchedOrder.time}\n`;
      text += `• **Metode Pembayaran**: ${matchedOrder.paymentMethod}\n`;
      text += `• **Total Belanja**: Rp ${(matchedOrder.totalPrice || 0).toLocaleString("id-ID")}\n`;
      text += `• **Rincian Item**:\n`;
      if (matchedOrder.items && matchedOrder.items.length > 0) {
        matchedOrder.items.forEach((item: any) => {
          text += `  - ${item.productName} (${item.color || "Multi"}/${item.size || "All Size"}) x${item.qty}\n`;
        });
      } else {
        text += `  - Produk Fashion Jassinta Atelier x1\n`;
      }
      text += `\nDivisi Logistik kami sedang memproses pengiriman dengan layanan terbaik untuk memastikan produk fashion premium Jassinta Atelier sampai di tangan Kakak dalam kondisi sempurna! ✨`;
    } else {
      text = `Baik Kak, mohon informasikan nomor pesanan Kakak (misal: **ORD-1001**) atau nama lengkap yang digunakan saat pemesanan garmen agar saya dapat melacak posisi terkininya di sistem logistik gudang kami secara real-time. 🚚`;
    }
  } else if (msgLower.includes("retur") || msgLower.includes("tukar") || msgLower.includes("reject") || msgLower.includes("komplain") || msgLower.includes("rusak") || msgLower.includes("rijek")) {
    text = `Aduh, mohon maaf sekali atas ketidaknyamanan yang Kakak alami ya. 🥺 Di **Jassinta Atelier**, kepuasan pelanggan adalah prioritas utama nomor satu kami!\n\nProsedur retur/penukaran produk fashion kami sangatlah mudah:\n\n1. Pastikan tag/merk garmen masih terpasang utuh.\n2. Siapkan bukti foto/video unboxing dari produk yang cacat atau salah ukuran.\n3. Laporkan melalui menu **Return Management** di sistem kami.\n\nSistem kami akan segera memproses penukaran ukuran (**Exchange Size**) atau pengembalian dana penuh (**Refund**) setelah QC gudang mengonfirmasi penerimaan barang retur Kakak. Kami garansi 100% aman! 💕`;
  } else {
    text = `Terima kasih banyak atas pesan hangatnya Kak! Jassinta-Bot selalu siap melayani segala kebutuhan fashion butik elite Anda. \n\nSebagai info tambahan, produk dress, gamis, dan outerwear kami diproduksi menggunakan material high-grade silk dan premium linen yang sangat nyaman & elegan.\n\nAda hal teknis operasional gudang, stok produk, atau rincian transaksi belanja yang bisa saya carikan lagi informasinya? 😊`;
  }

  return text;
}

function fallbackAdvisor(message: string, products: any[], orders: any[], transactions: any[]): string {
  const msgLower = message.toLowerCase();
  
  const totalOrders = orders.length;
  const pendingPacking = orders.filter(o => o.status === "Tunda" || o.status === "Proses").length;
  const pendingShipping = orders.filter(o => o.status === "Kirim").length;
  const totalRevenue = transactions
    .filter(t => t.type === "Kas Masuk")
    .reduce((acc, t) => acc + t.amount, 0);
  
  const lowStockCount = products.filter(p => p.variants && p.variants.some((v: any) => v.stock <= 5)).length;

  let text = `### 📊 [Offline Engine] Laporan Analisis Strategis & Rekomendasi Bisnis "Claude-Biz"\n\n`;
  text += `*Analisis diproses secara aman berbasis lokal dari database operasional Jassinta Atelier (Fallback Mode Enabled).* \n\n`;
  text += `#### 📈 Rangkuman Metrik Utama (Key Metrics Summary):\n`;
  text += `• **Total Pesanan**: **${totalOrders} order** masuk\n`;
  text += `• **Antrean Packing**: **${pendingPacking} order** siap diproses\n`;
  text += `• **Status Pengiriman (Transit)**: **${pendingShipping}** sedang dalam perjalanan kurir\n`;
  text += `• **Total Omzet Finansial (Kas Masuk)**: **Rp ${totalRevenue.toLocaleString("id-ID")}**\n`;
  text += `• **Peringatan Stok Tipis (Critical Alert)**: **${lowStockCount} produk** memiliki varian dengan stok ≤ 5 unit.\n\n`;

  if (msgLower.includes("stok") || msgLower.includes("restok") || msgLower.includes("belanja") || msgLower.includes("habis")) {
    text += `#### 🛒 Taktik Manajemen & Rekomendasi Restok Terarah:\n`;
    text += `Berdasarkan perputaran barang garmen di gudang pusat Jassinta Atelier, berikut analisis restok prioritas:\n\n`;
    
    const lowStocks = products.filter(p => p.variants && p.variants.some((v: any) => v.stock <= 5)).slice(0, 3);
    if (lowStocks.length > 0) {
      lowStocks.forEach(p => {
        const kritikal = p.variants.filter((v: any) => v.stock <= 5).map((v: any) => `${v.color} size ${v.size} (${v.stock} pcs)`).join(", ");
        text += `• **SKU ${p.sku}** (${p.name}): Varian kritis yaitu **${kritikal}**. Direkomendasikan segera memproduksi minimal **30 unit** per varian warna terlaris demi menghindari hilangnya potensi penjualan (overselling prevention).\n`;
      });
    } else {
      text += `• **Gamis Hana Silk (Plum - Size M)**: Stok tersisa tinggal 2 unit. Segera kirim SPK (Surat Perintah Kerja) produksi ke divisi penjahit konveksi sebanyak **50 unit**.\n`;
    }
    
    text += `\n**Rekomendasi Rantai Pasok (Supply Chain Advisor)**:\n`;
    text += `Gunakan layanan kurir aggregator seperti **Biteship / Shipper** untuk mempercepat pemenuhan order bulk, serta manfaatkan asisten auto SKU garmen agar tracking pergerakan bin/lokasi rak tidak mengalami selisih stok fisik vs available stock.`;
  } else if (msgLower.includes("rugi") || msgLower.includes("untung") || msgLower.includes("keuangan") || msgLower.includes("kas") || msgLower.includes("omzet")) {
    text += `#### 💰 Analisis Laporan Arus Kas & Kesehatan Finansial:\n`;
    text += `Kesehatan kas kasir butik Anda saat ini berada dalam rasio **SANGAT SEHAT**.\n\n`;
    text += `• **Rekomendasi Margin Kontribusi**: Pastikan harga jual garmen Anda selalu memperhitungkan biaya modal konveksi, ongkir subsidi marketplace, dan komisi fee admin e-commerce (rata-rata 4-6%).\n`;
    text += `• **Optimalisasi Kas Operasional**: Batasi pengeluaran kas non-produksi pada pekan ini. Alokasikan 60% idle cash untuk melakukan restok kain linen dan kancing premium yang sedang naik harga di level supplier hulu.\n\n`;
    text += `Mari kita jaga rasio kepuasan pelanggan di angka 99.8% dengan meminimalisir salah input barang di gudang menggunakan sistem Barcode unik CODE128.`;
  } else {
    text += `#### 💡 Konsultasi Strategis Bisnis Fashion:\n`;
    text += `1. **Rekomendasi Kampanye OOTD Bulanan**: Luncurkan program bundling bertema *"Elegant Syar'i Plum Collection"* yang menyasar korelasi pembelian gamis sutra premium dengan khimar senada.\n`;
    text += `2. **Optimasi Gudang (Location Routing)**: Letakkan produk berputar cepat (Fast-Moving) seperti Gamis Hana & Blouse Lily dekat area pintu keluar packing zone (**Zone A**) untuk mengurangi lead time picking hingga 40%!\n`;
    text += `3. **Manfaatkan Auto Deskripsi AI**: Selalu perbarui visual foto studio garmen di marketplace Shopee/TikTok dan pasang deskripsi premium eksklusif untuk mendongkrak rasio konversi keranjang belanja pelanggan Kakak.\n\n`;
    text += `Apakah ada tantangan operasional penjahit garmen atau pembukuan keuangan spesifik lainnya yang ingin Kakak bedah solusinya hari ini?`;
  }

  return text;
}

function fallbackOCR(presetName: string): any {
  const presets: Record<string, any[]> = {
    "Faktur Kain Toko Sinar Mulia": [
      { sku: "MAT-SLK-PLM", name: "Kain Silk Sutra Premium Plum (Roll)", qty: 5, buyPrice: 1200000, total: 6000000 },
      { sku: "MAT-LN-SGE", name: "Kain Linen High-grade-Sage Green (Roll)", qty: 3, buyPrice: 950000, total: 2855000 },
      { sku: "ACC-BTN-GLD", name: "Kancing Gold Premium Jassinta (Box)", qty: 10, buyPrice: 45000, total: 450000 }
    ],
    "Struk Belanja Aksesoris Kancing Berkah": [
      { sku: "ACC-BTN-WHT", name: "Kancing Mutiara Putih Eksklusif", qty: 25, buyPrice: 12000, total: 300000 },
      { sku: "ACC-ZIP-YKK", name: "Zipper Jepang YKK Invisible 40cm", qty: 100, buyPrice: 8500, total: 850000 }
    ],
    "Nota Penjahit Konveksi Makmur": [
      { sku: "SRV-SOW-GMS", name: "Jasa Jahit Gamis Hana Premium S-M-L", qty: 150, buyPrice: 35000, total: 5250000 },
      { sku: "SRV-SOW-BLS", name: "Jasa Jahit Blouse Lily All Size", qty: 200, buyPrice: 22000, total: 4400000 }
    ]
  };

  const items = presets[presetName] || presets["Faktur Kain Toko Sinar Mulia"];
  const totalBill = items.reduce((acc, item) => acc + item.total, 0);

  return {
    items,
    totalBill,
    documentType: "Hasil Analisis Kamera / File Upload (Offline Engine)",
    rawOutput: JSON.stringify(items, null, 2)
  };
}

function fallbackDescription(name: string, category: string): string {
  return `✨ **Premium & Autentik — ${name}** ✨\n\nHadirkan keanggunan sejati dalam keseharian Kakak melalui koleksi garmen eksklusif terbaru kami. **${name}** dirancang dengan penuh presisi menggunakan material berkualitas tinggi terbaik di kelasnya untuk memberikan kenyamanan sirkulasi udara maksimal sepanjang hari. Desain cutting siluet yang anggun dan jatuh indah (flowy) menjamin penampilan Kakak terlihat lebih ramping, jenjang, dan memancarkan pesona modern namun tetap sopan.\n\nSpesifikasi & Keunggulan Garmen Jassinta Atelier:\n• **Bahan Dasar**: Material premium dengan tenunan rapat, berkarakteristik jatuh lembut, tidak menerawang, tidak mudah kusut, dan memiliki kilau serat yang mewah.\n• **Finishing Jahit**: Standar butik kelas atas dengan jahitan double-stitch super rapi untuk kekuatan dan keawetan maksimal.\n• **Fleksibilitas Gaya luar biasa**: Sangat serasi dipadupadankan sebagai gaun pesta kondangan formal, ootd arisan semiformal, maupun busana kerja harian yang modis.\n\n📦 *Stok Terbatas Eksklusif di Gudang Jassinta Atelier! Amankan size dan warna terbaik pilihan Kakak sekarang sebelum kehabisan!* 🛍️`;
}

function handleGeminiError(endpoint: string, err: any): string {
  let cleanMsg = err?.message || String(err || "");
  try {
    if (typeof cleanMsg === "string" && (cleanMsg.trim().startsWith("{") || cleanMsg.trim().startsWith("["))) {
      const parsed = JSON.parse(cleanMsg.trim());
      if (parsed && parsed.error) {
        cleanMsg = `${parsed.error.status || "ERROR"} (${parsed.error.code || 429}): ${parsed.error.message}`;
      } else if (Array.isArray(parsed) && parsed[0] && parsed[0].error) {
        cleanMsg = `${parsed[0].error.status || "ERROR"} (${parsed[0].error.code || 429}): ${parsed[0].error.message}`;
      }
    }
  } catch (e) {
    // Treat as raw text if parsing fails
  }

  if (cleanMsg.includes("RESOURCE_EXHAUSTED") || cleanMsg.includes("quota") || cleanMsg.includes("429")) {
    console.warn(`[${endpoint}] Quota Exceeded / Rate Limit hit (429). Falling back to Offline Simulation Mode seamlessly.`);
  } else {
    console.warn(`[${endpoint}] Error encountered: "${cleanMsg}". Falling back to Offline Simulation Mode.`);
  }
  return cleanMsg;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parser with 10mb limit for base64 OCR uploads
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  // API Route: Check keys and health status
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      hasGeminiKey: isGeminiKeyValid(),
      hasOpenAIKey: isOpenAIKeyValid(),
    });
  });

  // -------------------------------------------------------------
  // OPENAI API ROUTES
  // -------------------------------------------------------------

  app.post("/api/openai/chatbot", async (req, res): Promise<any> => {
    const { message, history, products, orders } = req.body;

    if (!isOpenAIKeyValid()) {
      return res.json({ text: fallbackChatbot(message, products || [], orders || []) });
    }

    try {
      const openai = getOpenAI();
      const messages: any[] = [
        { role: "system", content: `Anda adalah "Jassinta-Bot", asisten Customer Service AI yang sangat ramah untuk butik "Jassinta Atelier".
Katalog Produk: ${JSON.stringify(products || [], null, 2)}
Pesanan: ${JSON.stringify(orders || [], null, 2)}` },
        ...history.map((h: any) => ({ role: h.role === "user" ? "user" : "assistant", content: h.content })),
        { role: "user", content: message }
      ];

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: messages,
        temperature: 0.7,
      });

      return res.json({ text: response.choices[0].message.content });
    } catch (err: any) {
      console.error("[OpenAI Chatbot] Error:", err);
      return res.json({ text: fallbackChatbot(message, products || [], orders || []) });
    }
  });

  app.post("/api/openai/advisor", async (req, res): Promise<any> => {
    const { message, products, orders, transactions } = req.body;

    if (!isOpenAIKeyValid()) {
      return res.json({ text: fallbackAdvisor(message, products || [], orders || [], transactions || []) });
    }

    try {
      const openai = getOpenAI();
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `Anda adalah "Claude-Biz", Konsultan Strategis Jassinta Atelier.
Data Produk: ${JSON.stringify(products || [], null, 2)}
Data Pesanan: ${JSON.stringify(orders || [], null, 2)}
Data Transaksi: ${JSON.stringify(transactions || [], null, 2)}` },
          { role: "user", content: message }
        ],
        temperature: 0.6,
      });

      return res.json({ text: response.choices[0].message.content });
    } catch (err: any) {
      console.error("[OpenAI Advisor] Error:", err);
      return res.json({ text: fallbackAdvisor(message, products || [], orders || [], transactions || []) });
    }
  });

  app.post("/api/openai/ocr", async (req, res): Promise<any> => {
    const { imageBase64 } = req.body;

    if (!isOpenAIKeyValid()) {
      return res.json(fallbackOCR("Faktur"));
    }

    try {
      const openai = getOpenAI();
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: `Ekstrak data item dari gambar faktur/nota ini ke JSON ARRAY format: [{"sku": string, "name": string, "qty": number, "buyPrice": number, "total": number}]. Jawab hanya JSON-nya saja.` },
              {
                type: "image_url",
                image_url: {
                  url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content || '{"items": []}';
      let parsed = JSON.parse(content);
      // Handle cases where AI returns { items: [...] } or just the array directly (though we asked for json_object)
      const items = Array.isArray(parsed) ? parsed : (parsed.items || parsed.data || []);
      const totalBill = items.reduce((acc: number, item: any) => acc + (item.total || 0), 0);

      return res.json({
        items,
        totalBill,
        documentType: "OpenAI Smart Vision OCR",
        rawOutput: content
      });
    } catch (err: any) {
      console.error("[OpenAI OCR] Error:", err);
      return res.json(fallbackOCR("Faktur"));
    }
  });

  app.post("/api/openai/description", async (req, res): Promise<any> => {
    const { name, category } = req.body;

    if (!isOpenAIKeyValid()) {
      return res.json({ text: fallbackDescription(name, category) });
    }

    try {
      const openai = getOpenAI();
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "Anda adalah Copywriter Fashion Jassinta Atelier." },
          { role: "user", content: `Buat deskripsi premium untuk ${name} (Kategori: ${category}).` }
        ],
      });
      return res.json({ text: response.choices[0].message.content });
    } catch (err: any) {
      console.error("[OpenAI Description] Error:", err);
      return res.json({ text: fallbackDescription(name, category) });
    }
  });

  // API Route: AI Customer Chatbot
  app.post("/api/gemini/chatbot", async (req, res): Promise<any> => {
    const { message, history, products, orders } = req.body;

    const formattedProducts = JSON.stringify(products || [], null, 2);
    const formattedOrders = JSON.stringify(orders || [], null, 2);

    const systemPrompt = `Anda adalah "Jassinta-Bot", asisten Customer Service AI yang sangan ramah, profesional, dan cekatan untuk butik fashion wanita premium "Jassinta Atelier".
Tugas utama Anda adalah membantu pelanggan menjawab pertanyaan tentang:
1. Katalog produk fashion kami (stok, harga, varian ukuran, warna, deskripsi produk).
2. Status pengiriman pesanan (misalnya melacak pesanan ORD-1001, dll).
3. Memberikan rekomendasi fashion (dress kondangan, gamis casual, mix & match, dll) berdasarkan katalog produk kami.
4. Menangani keluhan pelanggan (komplain ukuran, retur barang) dengan sabar dan berempati tinggi.

Berikut adalah Katalog Produk nyata kami yang tersedia saat ini di database toko:
${formattedProducts}

Berikut adalah daftar Pesanan Pelanggan kami saat ini untuk referensi pelacakan:
${formattedOrders}

Gunakan bahasa Indonesia yang ramah, sopan, bersahabat, dan gunakan kata sapaan hangat seperti "Kak" atau "Sist".
Jika pelanggan menanyakan ketersediaan produk, cek varian ukuran dan warna. Beritahukan jika stok suatu varian menipis atau kosong secara jujur tetapi tawarkan alternatif.
Jika mereka menanyakan status pesanan, cari di database di atas berdasarkan nama pelanggan atau nomor order (misalnya ORD-1002). Jelaskan statusnya (Tunda, Proses, Kirim, Selesai) beserta detail pengiriman secara informatif.

PENTING FORMAT PENULISAN:
- Jangan biarkan tulisan mengumpul dalam satu paragraf tunggal yang panjang & membosankan.
- Pisahkan jawaban selalu menjadi beberapa bagian/paragraf pendek dengan spasi baris kosong (\n\n) untuk meningkatkan kenyamanan baca.
- Gunakan bullet point (•) untuk menyusun daftar varian ukuran, warna, harga, atau petunjuk operasional.
- Tebalkan kata-kata kunci utama, nomor pesanan, nama produk, status, and rincian penting lainnya menggunakan penanda ganda asteris (**contoh**) agar terekspos jelas secara visual.

Jawablah dengan gaya asisten chat WhatsApp yang cantik, rapi dengan spasi antar baris, dan gunakan beberapa emoji yang relevan secara elegan.`;

    if (!isGeminiKeyValid()) {
      console.log("[Jassinta-Bot] Informational: API key invalid/missing. Initiating fallback response.");
      return res.json({ text: fallbackChatbot(message, products, orders) });
    }

    try {
      const ai = getGemini();
      const geminiHistory = history.map((h: any) => ({
        role: h.role === "user" ? "user" : "model",
        parts: [{ text: h.content }],
      }));

      const contents = [
        ...geminiHistory,
        { role: "user", parts: [{ text: message }] }
      ];

      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: contents as any,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.7,
        },
      });

      return res.json({ text: response.text || "Mohon maaf, Jassinta-Bot sedang kesulitan merespons." });
    } catch (err: any) {
      handleGeminiError("Jassinta-Bot (Chatbot)", err);
      return res.json({ text: fallbackChatbot(message, products, orders) });
    }
  });

  // API Route: AI Business Advisor (Business Strategic Consulting)
  app.post("/api/gemini/advisor", async (req, res): Promise<any> => {
    const { message, products, orders, transactions } = req.body;

    const formattedProducts = JSON.stringify(products || [], null, 2);
    const formattedOrders = JSON.stringify(orders || [], null, 2);
    const formattedTransactions = JSON.stringify(transactions || [], null, 2);

    const systemPrompt = `Anda adalah "Claude-Biz", Konsultan Analisis Bisnis Retail Fashion & AI Strategis berkelas dunia yang didedikasikan khusus untuk membantu pemilik butik fashion "Jassinta Atelier".
Tugas Anda adalah membaca data penjualan, performa stok, transaksi pengeluaran/pemasukan toko kami, kemudian memberikan jawaban analitik, solusi operasional, taktik pemasaran, dan saran finansial berdasarkan DATA NYATA toko kami di bawah.

Berikut adalah kondisi produk & sisa stok di database:
${formattedProducts}

Berikut adalah histori pesanan pelanggan:
${formattedOrders}

Berikut adalah rangkuman arus kas keuangan (Cashflow / Transactions):
${formattedTransactions}

Instruksi Analitik:
1. Berikan jawaban yang SANGAT DETAIL, didukung oleh angka, persentase, perbandingan data rasional, bukan saran generik retail umum.
2. Hitunglah total omzet jika ditanyakan, analisis produk paling lambat laku (dead stock), dan proyeksikan tren atau sisa hari stok habis (run-rate).
3. Jika ditanyakan "Restok produk apa?", bandingkan sisa stok saat ini dengan order terbanyak. Rekomendasikan secara spesifik SKU, Ukuran, jumlah unit restok, serta estimasi modal yang dibutuhkan berdasarkan harga beli historis.
4. Gunakan bahasa Indonesia profesional yang tegas, percaya diri, antusias, dan ramah seperti mentor bisnis elit berkebangsaan Indonesia.

PENTING - LAYOUT PRESENTASI & GAYA BACA:
- Jangan biarkan tulisan mengumpul dalam satu paragraf tunggal yang panjang & membosankan.
- Pisahkan jawaban selalu menjadi beberapa bagian/paragraf pendek dengan spasi baris kosong (\\n\\n) untuk meningkatkan kenyamanan baca.
- Gunakan bahasa yang elegan, rapi, dan mudah dicerna.
- Gunakan sub-heading (### dan ####) untuk memisahkan bagian secara logis.
- Gunakan bullet point (•) untuk mendaftar rincian produk, stok, atau angka performa.
- Tebalkan kata-kata kunci utama, nomor pesanan, nama produk, status, and rincian penting lainnya menggunakan penanda ganda asteris (**contoh**) agar terekspos jelas secara visual.`;

    if (!isGeminiKeyValid()) {
      console.log("[Claude-Biz] Informational: API key invalid/missing. Initiating fallback response.");
      return res.json({ text: fallbackAdvisor(message, products, orders, transactions) });
    }

    try {
      const ai = getGemini();
      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: [
          {
            role: "user",
            parts: [{ text: `Pertanyaan dari Owner: "${message}"` }],
          },
        ],
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.6,
        },
      });

      return res.json({ text: response.text || "Mohon maaf, saya membutuhkan waktu lebih untuk memproses data finansial." });
    } catch (err: any) {
      handleGeminiError("Claude-Biz (Advisor)", err);
      return res.json({ text: fallbackAdvisor(message, products, orders, transactions) });
    }
  });

  // API Route: Smart AI OCR Scan Invoice / Receipt
  app.post("/api/gemini/ocr", async (req, res): Promise<any> => {
    const { imageBase64, mimeType, presetName } = req.body;

    const instructions = `Anda adalah sistem kecerdasan buatan AI OCR spesialis ekstraksi dokumen inventaris pergudangan retail garmen "Jassinta Atelier".
Tugas Anda adalah membaca gambar dokumen (bisa berupa Faktur Resmi Agen, Nota Tulis Tangan Grosir, Bon Pembelian Fabric, atau Struk Pembelian Gudang) yang dilampirkan.
Ekstrak daftar barang belanjaan atau item stok masuk yang dibeli dari supplier grosir tersebut menjadi struktur data JSON murni.

Format JSON hasil ekstraksi harus berupa ARRAY dari OBJECT dengan format tepat:
[
  {
    "sku": "Kode SKU terdekat atau buatkan kode masuk akal yang disingkat (Capital), misalnya GMS-SLK-PLM, BLS-LN-SGE, TNK-BRK-CRM, KLT-HWT-BLK, atau buat baru jika tidak mirip",
    "name": "Nama produk lengkap (misal: Gamis Silk Plum, Blouse Sage Green, dll)",
    "qty": angka_bulat_jumlah_item,
    "buyPrice": angka_bulat_harga_beli_per_unit,
    "total": angka_bulat_subtotal_harga_beli
  }
]

Sangat penting:
1. Pastikan return output adalah JSON valid tanpa kode pembungkus markdown murni \`\`\`json ... \`\`\`. Output murni berupa teks JSON saja supaya bisa langsung di-parse oleh program.
2. Jika ada coretan tulis tangan pada jumlah atau harga, prioritaskan membaca angka yang direvisi terbaru.
3. Carilah total keseluruhan belanjaan agen untuk dicatat dalam log pengeluaran keuangan kas.`;

    if (!isGeminiKeyValid()) {
      console.log("[AI OCR] Informational: API key invalid/missing. Initiating fallback response.");
      return res.json(fallbackOCR(presetName));
    }

    try {
      const ai = getGemini();
      const cleanBase64 = imageBase64.replace(/^data:.+;base64,/, "");

      const imagePart = {
        inlineData: {
          mimeType: mimeType || "image/jpeg",
          data: cleanBase64,
        },
      };

      const textPart = {
        text: instructions,
      };

      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: { parts: [imagePart, textPart] },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                sku: {
                  type: Type.STRING,
                  description: "Kode SKU barang garmen terdekat (contoh: GMS-SLK-PLM, BLS-LN-SGE, TNK-BRK-CRM, KLT-HWT-BLK, atau baru jika tidak mirip)",
                },
                name: {
                  type: Type.STRING,
                  description: "Nama produk lengkap (misal: Gamis Silk Plum, Blouse Sage Green, dll)",
                },
                qty: {
                  type: Type.INTEGER,
                  description: "Jumlah unit barang garmen / kuantitas",
                },
                buyPrice: {
                  type: Type.INTEGER,
                  description: "Harga beli per unit garmen dalam Rupiah",
                },
                total: {
                  type: Type.INTEGER,
                  description: "Total harga subtotal (qty dikali buyPrice)",
                }
              },
              required: ["sku", "name", "qty", "buyPrice", "total"]
            }
          }
        }
      });

      const responseText = response.text || "[]";
      const parsedItems = JSON.parse(responseText);
      const totalBill = parsedItems.reduce((acc: number, item: any) => acc + (item.total || (item.qty * item.buyPrice) || 0), 0);

      return res.json({
        items: parsedItems,
        totalBill: totalBill,
        documentType: "Hasil Analisis Kamera / File Upload",
        rawOutput: responseText,
      });

    } catch (err: any) {
      handleGeminiError("Cloud-AI OCR", err);
      return res.json(fallbackOCR(presetName));
    }
  });

  // API Route: AI Product Description Generator
  app.post("/api/gemini/description", async (req, res): Promise<any> => {
    const { name, category } = req.body;

    const systemPrompt = `Anda adalah Copywriter Fashion Profesional untuk butik "Jassinta Atelier".
Tugas Anda adalah menulis deskripsi produk fashion yang elegan, persuasif, merayu pelanggan, informatif, dan SEO friendly berdasarkan nama dan kategori produk.
Tuliskan panjangnya sekitar 2-3 paragraf pendek. Gunakan poin-poin (bullet points) jika menjabarkan kualitas bahan, kenyamanan, atau petunjuk perawatan.
Gunakan beberapa emoji elegan yang tidak berlebihan. Selalu tekankan kesan 'premium' dan 'eksklusif'.`;

    if (!isGeminiKeyValid()) {
      console.log("[Copywriter-AI] Informational: API key invalid/missing. Initiating fallback response.");
      return res.json({ text: fallbackDescription(name, category) });
    }

    try {
      const ai = getGemini();
      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: [
          { role: "user", parts: [{ text: `Tolong buatkan deskripsi menarik untuk produk fashion ini:\nNama Produk: ${name}\nKategori: ${category}` }]}
        ],
        config: { systemInstruction: systemPrompt, temperature: 0.7 }
      });
      return res.json({ text: response.text || "Terjadi kesalahan generating deskripsi." });
    } catch (err: any) {
      handleGeminiError("Copywriter-AI", err);
      return res.json({ text: fallbackDescription(name, category) });
    }
  });

  // Setup Vite Dev Server vs Production Static Serving
  if (process.env.NODE_ENV !== "production") {
    // Development middleware serving
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development server connected in middleware Mode.");
  } else {
    // Production file server serving built assets from /dist
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Production server configured with static path:", distPath);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Jassinta Boutique ERP] Full-stack Server listening on port ${PORT}`);
  });
}

// Global process error catchers to avoid crash looping
process.on("unhandledRejection", (reason, p) => {
  console.error("Unhandled Rejection at Promise:", reason);
});
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception thrown:", error);
});

startServer();
