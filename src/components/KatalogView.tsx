import React, { useState, useEffect, useRef } from "react";
import { 
  Search, Plus, Filter, Tag, Box, AlertOctagon, History, Edit, Save, X, PlusCircle, Check, QrCode, RefreshCw, Printer, AlertTriangle, Trash2, Calculator, Percent, Camera
} from "lucide-react";
import QRCode from "react-qr-code";
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip as RechartsTooltip } from "recharts";
import { format, subDays, isSameDay } from "date-fns";
import { VirtuosoGrid } from "react-virtuoso";
import { Product, StockHistory, ProductVariant } from "../types";
import { compressImage, dispatchSecurityAlert } from "../utils";

const StockSparkline = ({ product, history }: { product: Product, history: StockHistory[] }) => {
  // We want to reconstruct the DAILY closing stock for the last 7 days.
  // We start from TODAY's currentTotal and work backwards.
  const currentTotal = product.variants.reduce((acc, v) => acc + (v.physicalStock !== undefined ? v.physicalStock : v.stock), 0);
  
  // Find all changes for this product in history
  const productHistory = history.filter(h => h.productSku === product.sku);

  const chartData = [];
  let tempStock = currentTotal;
  
  // Today's point
  chartData.unshift({ date: format(new Date(), "dd/MM"), stock: tempStock });
  
  // Walk backwards for 6 more days
  for (let i = 0; i < 6; i++) {
    const dayToSubtract = subDays(new Date(), i);
    const dayBefore = subDays(new Date(), i + 1);
    
    const changesOnDay = productHistory
      .filter(h => isSameDay(new Date(h.date), dayToSubtract))
      .reduce((acc, h) => acc + h.changeQty, 0);
    
    tempStock -= changesOnDay;
    chartData.unshift({ date: format(dayBefore, "dd/MM"), stock: tempStock });
  }

  return (
    <div className="h-10 w-full min-w-[80px] bg-slate-50/30 rounded-lg p-1 border border-slate-100/50">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line 
            type="monotone" 
            dataKey="stock" 
            stroke="#db2777" 
            strokeWidth={1.5} 
            dot={false}
            isAnimationActive={false}
          />
          <RechartsTooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded shadow-lg font-mono">
                    {payload[0].value} pcs
                  </div>
                );
              }
              return null;
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

interface KatalogViewProps {
  products: Product[];
  setProducts: (val: Product[] | ((prev: Product[]) => Product[])) => void;
  upsertProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  stockHistory: StockHistory[];
  setStockHistory: (val: StockHistory[] | ((prev: StockHistory[]) => StockHistory[])) => void;
  categories: string[];
  setCategories: (val: string[]) => void;
}

export default function KatalogView({ 
  products, 
  setProducts, 
  upsertProduct,
  deleteProduct,
  stockHistory, 
  setStockHistory, 
  categories, 
  setCategories 
}: KatalogViewProps) {
  const [search, setSearch] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Semua");
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [showRejectForm, setShowRejectForm] = useState<boolean>(false);
  const [rejectForm, setRejectForm] = useState({
    productId: "",
    variantSize: "S",
    variantColor: "",
    qty: 1,
    reason: ""
  });
  const [activeCatalogTab, setActiveCatalogTab] = useState<"katalog" | "riwayat" | "kalkulator">("katalog");
  const [showQrModal, setShowQrModal] = useState<Product | null>(null);
  const [printProducts, setPrintProducts] = useState<Product[] | null>(null);
  const [selectedForPrint, setSelectedForPrint] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState<boolean>(false);
  
  // Barcode Scanner State
  const [showScanner, setShowScanner] = useState<boolean>(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  const playScannerBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // High pitch beep
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      console.warn("Audio feedback failed:", e);
    }
  };

  useEffect(() => {
    if (showScanner) {
      const scanner = new Html5QrcodeScanner(
        "barcode-scanner-region",
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          formatsToSupport: [ 
            Html5QrcodeSupportedFormats.QR_CODE, 
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8
          ]
        },
        /* verbose= */ false
      );
      
      const onScanSuccess = (decodedText: string) => {
        console.log(`Scan result: ${decodedText}`);
        // Attempt to find product by SKU or Barcode
        const foundProduct = products.find(p => 
          p.sku.toLowerCase() === decodedText.toLowerCase() || 
          p.variants.some(v => v.sku.toLowerCase() === decodedText.toLowerCase())
        );

        if (foundProduct) {
          playScannerBeep();
          // Stop scanner and close modal
          scanner.clear().then(() => {
            setShowScanner(false);
            // Open stock adjustment view for the found product
            startEditing(foundProduct);
          }).catch(err => console.error("Failed to clear scanner", err));
        } else {
          // Play a small sound or alert if not found (silent for now)
          console.warn("Product not found for SKU:", decodedText);
        }
      };

      const onScanFailure = (error: any) => {
        // Quietly fail for performance
      };

      scanner.render(onScanSuccess, onScanFailure);
      scannerRef.current = scanner;

      return () => {
        if (scannerRef.current) {
          scannerRef.current.clear().catch(e => console.error("Cleanup error", e));
        }
      };
    }
  }, [showScanner, products]);

  useEffect(() => {
    if (printProducts && printProducts.length > 0) {
      setTimeout(() => {
        window.print();
        setPrintProducts(null);
        setSelectedForPrint([]);
        setSelectionMode(false);
      }, 100);
    }
  }, [printProducts]);

  // Edit stock & info state
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editVariants, setEditVariants] = useState<ProductVariant[]>([]);
  const [editInfo, setEditInfo] = useState({
    name: "",
    category: "",
    normalPrice: 0,
    promoPrice: 0,
    rackLocation: "",
    description: ""
  });

  // Automatic page resetting upon filters or search change
  // Bulk Product Simulator to test scalability to 10,000 clothing models
  const handleSimulateBulkProducts = (count: number) => {
    const categoriesPool = ["Gamis", "Blouse", "Tunik", "Kulot", "Hijab", "Aksesori", "Cardigan", "Rompi", "Celana", "One Set", "Dress", "Outer"];
    const colorsPool = ["Plum", "Navy Blue", "Sage Green", "Dusty Rose", "Amber", "Chalk White", "Charcoal Gray", "Milky Peach", "Coral Red", "Soft Lavender"];
    const namesPool2 = ["Silk Premium", "Linen Crinkle", "Satin Velvet", "Cotton Toyobo", "Ceruty Babydoll", "Chiffon Pleated", "Jeans Stretch", "Rayon Twill", "Brocade Luxury"];
    const namesPool3 = ["Amelia", "Bianca", "Clara", "Dian", "Elena", "Fiona", "Grace", "Hana", "Indah", "Jasmine", "Kiara", "Laras", "Mawar", "Nabila", "Olivia", "Putri", "Queen", "Rania", "Sofia", "Tiara"];

    const newBulkProducts: Product[] = [];
    const now = Date.now();

    for (let i = 1; i <= count; i++) {
      const category = categoriesPool[Math.floor(Math.random() * categoriesPool.length)] as any;
      const mat = namesPool2[Math.floor(Math.random() * namesPool2.length)];
      const model = namesPool3[Math.floor(Math.random() * namesPool3.length)];
      const suffixNum = Math.floor(Math.random() * 900) + 100;
      const name = `${category} ${mat} ${model} Edition ${suffixNum}`;
      
      const normalPrice = Math.floor((Math.random() * 150000) + 150000); // 150k - 300k
      const promoPrice = Math.floor(normalPrice * 0.8 / 1000) * 1000; // 20% discount randed to nearest thousand
      const randomColor = colorsPool[Math.floor(Math.random() * colorsPool.length)];
      const randomSku = `JSS-${category.substring(0, 3).toUpperCase()}-${suffixNum}-${i}`;

      const getSimulatedVariantSku = (sz: string) => {
        const catMap: Record<string, string> = {
          "Dress": "DRS", "Hijab": "HJB", "Outer": "OUT", "Gamis": "GMS",
          "Celana": "CLN", "Blouse": "BLS", "Tunik": "TNK", "Kulot": "KLT",
          "Aksesori": "AKS", "Cardigan": "CRD", "Rompi": "RMP", "One Set": "ONS"
        };
        const catCode = catMap[category] || category.substring(0, 3).toUpperCase();
        const colCode = randomColor.substring(0, 3).toUpperCase();
        const sizeMap: Record<string, string> = {
          "One Size": "OS", "All Size": "AS", "Jumbo": "JMB", "Oversize": "OVS", "Fit to XL": "FXL"
        };
        const szCode = sizeMap[sz] || sz;
        return `${catCode}-${colCode}-${szCode}-${suffixNum}`;
      };

      const randStockVal = (max: number, min: number = 2) => Math.floor(Math.random() * max) + min;

      const makeV = (size: any, extra = {}) => {
        const sVal = randStockVal(30, 2);
        const rVal = Math.floor(Math.random() * 2);
        const phys = sVal + rVal;
        return {
          sku: getSimulatedVariantSku(size),
          size,
          color: randomColor,
          stock: sVal,
          physicalStock: phys,
          availableStock: sVal,
          reservedStock: rVal,
          damagedStock: Math.random() > 0.95 ? 1 : 0,
          transitStock: 0,
          qcHold: 0,
          ...extra
        };
      };

      newBulkProducts.push({
        id: `p-sim-${now}-${i}`,
        sku: `${category.substring(0, 3).toUpperCase()}-${randomColor.substring(0, 3).toUpperCase()}-${suffixNum}`,
        name: name,
        category: category,
        normalPrice: normalPrice,
        promoPrice: promoPrice,
        imageUrl: `https://images.unsplash.com/photo-${[
          "1595777457583-95e059d581b8",
          "1608748010899-18f300247112",
          "1551488831-00ddcb6c6bd3",
          "1515886657613-9f3515b0c78f",
          "1434389677669-e08b4cac3105"
        ][Math.floor(Math.random() * 5)]}?w=1200&auto=format&fit=crop&q=85`,
        rackLocation: `GDG1-${["A", "B", "C", "D"][Math.floor(Math.random() * 4)]}-${String(Math.floor(Math.random() * 15) + 1).padStart(2, "0")}-A-0${Math.floor(Math.random() * 9) + 1}`,
        description: `Model pakaian premium edisi spesial ${model} menggunakan bahan serat ${mat} berkualitas tinggi. Nyaman dipakai seharian, halus, adem, dan terlihat mewah.`,
        variants: [
          makeV("S"),
          makeV("M"),
          makeV("L"),
          makeV("XL"),
          makeV("XXL"),
          makeV("Jumbo"),
          makeV("All Size"),
          makeV("One Size", {
            lingkarDada: Math.floor(Math.random() * 30) + 90, // 90 to 120 cm
            lingkarPinggang: Math.floor(Math.random() * 35) + 65, // 65 to 100 cm
            lingkarPaha: Math.floor(Math.random() * 20) + 50 // 50 to 70 cm
          })
        ]
      });
    }

    setProducts(prev => [...prev, ...newBulkProducts]);
    alert(`⚡ Sukses! Berhasil menyisipkan ${count.toLocaleString("id-ID")} model pakaian baru ke dalam Katalog.`);
    dispatchSecurityAlert("STOCK", `Simulasi Massal: ${count} model pakaian baru berhasil disisipkan otomatis`, "System Simulator");
  };

  // Delete product state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Kalkulator Harga Jual State
  const [showQuickCalc, setShowQuickCalc] = useState<boolean>(false);
  const [calcCOGS, setCalcCOGS] = useState<number>(50000);
  const [calcShipping, setCalcShipping] = useState<number>(5000);
  const [calcPackaging, setCalcPackaging] = useState<number>(3000);
  const [calcAdminPercent, setCalcAdminPercent] = useState<number>(6);
  const [calcOther, setCalcOther] = useState<number>(2000);
  const [calcMarginPercent, setCalcMarginPercent] = useState<number>(30);

  const handleDeleteProduct = async (productId: string) => {
    if (deleteConfirmId === productId) {
      const targetP = products.find(p => p.id === productId);
      const pName = targetP ? targetP.name : productId;
      
      try {
        await deleteProduct(productId);
        setDeleteConfirmId(null);
        dispatchSecurityAlert("STOCK", `Menghapus produk "${pName}" secara permanen dari basis data`, "Ahmad Gudang (QC Spec)");
      } catch (err) {
        console.error("Gagal menghapus produk:", err);
        alert("Gagal menghapus produk dari database.");
      }
    } else {
      setDeleteConfirmId(productId);
      // Automatically reset confirmation state after 3 seconds of inactivity
      setTimeout(() => {
        setDeleteConfirmId(curr => curr === productId ? null : curr);
      }, 3000);
    }
  };

  // Add Product Form State
  const [newProduct, setNewProduct] = useState({
    sku: "",
    name: "",
    category: "Gamis",
    normalPrice: 199000,
    promoPrice: 159000,
    imageUrl: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500",
    rackLocation: "Rak A-01",
    description: "",
    stockS: 10,
    stockM: 10,
    stockL: 10,
    stockXL: 10,
    stockXXL: 0,
    stockJumbo: 0,
    stockAllSize: 0,
    stockOneSize: 0,
    ldOneSize: 0,
    lpOneSize: 0,
    lpHoneSize: 0,
    variantColor: "Plum"
  });

  const [showCategorySettings, setShowCategorySettings] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState("");
  const [editingCatIndex, setEditingCatIndex] = useState<number | null>(null);
  const [editCatName, setEditCatName] = useState("");

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    if (categories.includes(newCatName.trim())) {
      alert("Kategori sudah ada!");
      return;
    }
    setCategories([...categories, newCatName.trim()]);
    setNewCatName("");
  };

  const handleEditCategory = (index: number) => {
    setEditingCatIndex(index);
    setEditCatName(categories[index]);
  };

  const handleSaveEditCategory = (index: number) => {
    if (!editCatName.trim()) return;
    const oldCatName = categories[index];
    const newCatNameFormatted = editCatName.trim();
    
    const newCategories = [...categories];
    newCategories[index] = newCatNameFormatted;
    setCategories(newCategories);
    
    // Update existing products with this category
    const updatedProducts = products.map(p => 
      p.category === oldCatName ? { ...p, category: newCatNameFormatted } : p
    );
    setProducts(updatedProducts);
    
    // Also reset selectedCategory to "Semua" if the edited category is selected
    if (selectedCategory === oldCatName) {
      setSelectedCategory(newCatNameFormatted);
    }
    
    setEditingCatIndex(null);
  };

  const handleDeleteCategory = (index: number) => {
    const catToDelete = categories[index];
    if (window.confirm(`Hapus kategori "${catToDelete}"? (Produk dengan kategori ini tidak akan dihapus)`)) {
      setCategories(categories.filter((_, i) => i !== index));
      if (selectedCategory === catToDelete) {
        setSelectedCategory("Semua");
      }
    }
  };

  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
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

  const generateAIDescription = async () => {
    if (!newProduct.name || !newProduct.category) {
      alert("Isi Nama Produk dan Kategori terlebih dahulu untuk menggunakan AI!");
      return;
    }
    const apiUrl = aiStatus.hasOpenAI ? "/api/openai/description" : "/api/gemini/description";
    setIsGeneratingDesc(true);
    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newProduct.name, category: newProduct.category })
      });
      const data = await res.json();
      if (res.ok) {
        setNewProduct(prev => ({ ...prev, description: data.text }));
      } else {
        alert("Gagal merumuskan deskripsi: " + (data.error || ""));
      }
    } catch (err) {
      alert("Gagal terhubung ke server API.");
    } finally {
      setIsGeneratingDesc(false);
    }
  };

  // Filter products based on search and category
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === "Semua" || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Start Quick Edit Stock & Info Modal
  const startEditing = (p: Product) => {
    setEditingProductId(p.id);
    setEditVariants(JSON.parse(JSON.stringify(p.variants))); // Deep clone
    setEditInfo({
      name: p.name,
      category: p.category,
      normalPrice: p.normalPrice,
      promoPrice: p.promoPrice,
      rackLocation: p.rackLocation,
      description: p.description
    });
  };

  // Save variant stock
  const handleSaveStock = (productId: string) => {
    const targetProduct = products.find(p => p.id === productId);
    if (!targetProduct) return;

    // Check what changed to add to stock history log
    let batchLogs: StockHistory[] = [];

    const updatedProducts = products.map(p => {
      if (p.id === productId) {
        // Log changes for each variant
        p.variants.forEach(v => {
          const edited = editVariants.find(ev => ev.size === v.size && ev.color === v.color);
          if (edited) {
            const oldPhysical = v.physicalStock !== undefined ? v.physicalStock : v.stock;
            const newPhysical = edited.physicalStock !== undefined ? edited.physicalStock : edited.stock;
            const oldReserved = v.reservedStock || 0;
            const newReserved = edited.reservedStock || 0;
            const oldDamaged = v.damagedStock || 0;
            const newDamaged = edited.damagedStock || 0;
            const oldTransit = v.transitStock || 0;
            const newTransit = edited.transitStock || 0;
            const oldQcHold = v.qcHold || 0;
            const newQcHold = edited.qcHold || 0;

            if (newPhysical !== oldPhysical) {
              const diff = newPhysical - oldPhysical;
              batchLogs.push({
                id: "st-adj-" + Date.now() + Math.random().toString(36).substr(2, 5),
                productSku: p.sku,
                productName: p.name,
                variantSize: v.size,
                variantColor: v.color,
                date: new Date().toISOString(),
                changeQty: diff,
                type: diff > 0 ? "Stock In" : "Stock Out",
                notes: `Adjustment Physical Stock Manual (sebelumnya: ${oldPhysical}, sesudah: ${newPhysical})`,
                operator: "Putri Spv (Admin)",
                stockTypeAffected: "Physical",
                beforeQty: oldPhysical,
                afterQty: newPhysical
              });
            }

            if (newReserved !== oldReserved) {
              const diff = newReserved - oldReserved;
              batchLogs.push({
                id: "st-res-" + Date.now() + Math.random().toString(36).substr(2, 5),
                productSku: p.sku,
                productName: p.name,
                variantSize: v.size,
                variantColor: v.color,
                date: new Date().toISOString(),
                changeQty: diff,
                type: "Reservation",
                notes: `Adjustment Reserved Stock Manual (sebelumnya: ${oldReserved}, sesudah: ${newReserved})`,
                operator: "Putri Spv (Admin)",
                stockTypeAffected: "Reserved",
                beforeQty: oldReserved,
                afterQty: newReserved
              });
            }

            if (newDamaged !== oldDamaged) {
              const diff = newDamaged - oldDamaged;
              batchLogs.push({
                id: "st-dmg-" + Date.now() + Math.random().toString(36).substr(2, 5),
                productSku: p.sku,
                productName: p.name,
                variantSize: v.size,
                variantColor: v.color,
                date: new Date().toISOString(),
                changeQty: diff,
                type: "Adjustment",
                notes: `Adjustment Damaged Stock Manual (sebelumnya: ${oldDamaged}, sesudah: ${newDamaged})`,
                operator: "Putri Spv (Admin)",
                stockTypeAffected: "Damaged",
                beforeQty: oldDamaged,
                afterQty: newDamaged
              });
            }

            if (newTransit !== oldTransit) {
              const diff = newTransit - oldTransit;
              batchLogs.push({
                id: "st-tst-" + Date.now() + Math.random().toString(36).substr(2, 5),
                productSku: p.sku,
                productName: p.name,
                variantSize: v.size,
                variantColor: v.color,
                date: new Date().toISOString(),
                changeQty: diff,
                type: "Transfer",
                notes: `Manual Transit Stock Transfer (sebelumnya: ${oldTransit}, sesudah: ${newTransit})`,
                operator: "Putri Spv (Admin)",
                stockTypeAffected: "Transit",
                beforeQty: oldTransit,
                afterQty: newTransit
              });
            }

            if (newQcHold !== oldQcHold) {
              const diff = newQcHold - oldQcHold;
              batchLogs.push({
                id: "st-qch-" + Date.now() + Math.random().toString(36).substr(2, 5),
                productSku: p.sku,
                productName: p.name,
                variantSize: v.size,
                variantColor: v.color,
                date: new Date().toISOString(),
                changeQty: diff,
                type: "Transfer",
                notes: `Manual QC Hold (sebelumnya: ${oldQcHold}, sesudah: ${newQcHold})`,
                operator: "Putri Spv (Admin)",
                stockTypeAffected: "QC Hold",
                beforeQty: oldQcHold,
                afterQty: newQcHold
              });
            }
          }
        });

        // Sync main stock property with available stock (formula: physical - reserved)
        const finalVariants = editVariants.map(ev => {
          const phys = ev.physicalStock !== undefined ? ev.physicalStock : ev.stock;
          const rsv = ev.reservedStock || 0;
          const avl = phys - rsv;
          return {
            ...ev,
            physicalStock: phys,
            reservedStock: rsv,
            availableStock: avl,
            stock: avl // legacy available count
          };
        });

        return {
          ...p,
          name: editInfo.name,
          category: editInfo.category as any,
          normalPrice: editInfo.normalPrice,
          promoPrice: editInfo.promoPrice,
          rackLocation: editInfo.rackLocation,
          description: editInfo.description,
          variants: finalVariants
        };
      }
      return p;
    });

    if (batchLogs.length > 0) {
      setStockHistory(prev => [...batchLogs, ...prev]);
    }

    const updatedProduct = updatedProducts.find(p => p.id === productId);
    if (updatedProduct) {
      upsertProduct(updatedProduct);
    }
    setEditingProductId(null);
  };

  const generateUniqueSKU = (catOpt?: string, colOpt?: string) => {
    // 1. Get Category Code
    const category = catOpt || newProduct.category || "Gamis";
    const catMap: Record<string, string> = {
      "Dress": "DRS", "Hijab": "HJB", "Outer": "OUT", "Gamis": "GMS",
      "Celana": "CLN", "Blouse": "BLS", "Tunik": "TNK", "Kulot": "KLT",
      "Aksesori": "AKS", "Cardigan": "CRD", "Rompi": "RMP", "One Set": "ONS"
    };
    const catCode = catMap[category] || category.substring(0, 3).toUpperCase();

    // 2. Get Color Code
    const color = colOpt || newProduct.variantColor || "Plum";
    const colorMap: Record<string, string> = {
      "Black": "BLK", "White": "WHT", "Navy": "NVY", "Cream": "CRM", 
      "Olive": "OLV", "Pink": "PKN", "Plum": "PLM", "Bronze Gold": "BRZ"
    };
    let colCode = colorMap[color];
    if (!colCode) {
      const colorWords = color.trim().split(/\s+/);
      if (colorWords.length >= 2) {
        colCode = (colorWords[0][0] + (colorWords[1] || "").substring(0, 2)).toUpperCase();
      } else {
        const noVowels = color.replace(/[aeiouAEIOU\s]/g, "");
        colCode = (noVowels.length >= 3 ? noVowels : color + "XXX").substring(0, 3).toUpperCase();
      }
    }

    const prefix = `${catCode}-${colCode}`;
    
    // 3. Find Max Sequence Number based on Base Product SKU
    let maxSeq = 0;
    products.forEach(p => {
      // Look for format like PREFIX-XXXX or PREFIX-SIZE-XXXX
      // Easiest is to check the product-level sku: PREFIX-XXXX
      if (p.sku && p.sku.startsWith(prefix)) {
        const parts = p.sku.split('-');
        const lastPart = parts[parts.length - 1];
        if (/^\d{4}$/.test(lastPart)) {
          maxSeq = Math.max(maxSeq, parseInt(lastPart, 10));
        }
      }
    });

    const runningNum = (maxSeq + 1).toString().padStart(4, "0");
    return `${prefix}-${runningNum}`;
  };

  const handleOpenAddForm = () => {
    if (!showAddForm) {
      setNewProduct(prev => ({
        ...prev,
        sku: generateUniqueSKU()
      }));
    }
    setShowAddForm(!showAddForm);
  };
  
  // Create new product
  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.sku || !newProduct.name) {
      alert("Harap isi Kode SKU dan Nama Produk!");
      return;
    }

    const baseSku = newProduct.sku.toUpperCase();

    // Strict uniqueness check simulation
    const conflictingProduct = products.find(p => p.sku === baseSku);
    if (conflictingProduct) {
      alert(`Gagal menyimpan: Sistem menolak (DB Constraint) -> SKU ${baseSku} sudah digunakan oleh produk "${conflictingProduct.name}"! Silakan generate ulang SKU yang unik.`);
      return;
    }

    const skuParts = baseSku.split("-");
    const getVariantSku = (sz: string) => {
      const sizeMap: Record<string, string> = {
        "One Size": "OS", "All Size": "AS", "Jumbo": "JMB", "Oversize": "OVS", "Fit to XL": "FXL"
      };
      const szCode = sizeMap[sz] || sz;
      if (skuParts.length >= 3) {
        const seq = skuParts[skuParts.length - 1];
        const prefixParts = skuParts.slice(0, skuParts.length - 1);
        return `${prefixParts.join("-")}-${szCode}-${seq}`;
      }
      return `${baseSku}-${szCode}`;
    };

    const createdProduct: Product = {
      id: "p-" + Date.now(),
      sku: baseSku,
      name: newProduct.name,
      category: newProduct.category as any,
      normalPrice: Number(newProduct.normalPrice),
      promoPrice: Number(newProduct.promoPrice),
      imageUrl: newProduct.imageUrl || "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500",
      rackLocation: newProduct.rackLocation || "Rak Standar",
      description: newProduct.description || "Deskripsi produk baru.",
      variants: [
        { sku: getVariantSku("S"), size: "S", color: newProduct.variantColor, stock: Number(newProduct.stockS || 0), physicalStock: Number(newProduct.stockS || 0), availableStock: Number(newProduct.stockS || 0), reservedStock: 0, damagedStock: 0, transitStock: 0, qcHold: 0 },
        { sku: getVariantSku("M"), size: "M", color: newProduct.variantColor, stock: Number(newProduct.stockM || 0), physicalStock: Number(newProduct.stockM || 0), availableStock: Number(newProduct.stockM || 0), reservedStock: 0, damagedStock: 0, transitStock: 0, qcHold: 0 },
        { sku: getVariantSku("L"), size: "L", color: newProduct.variantColor, stock: Number(newProduct.stockL || 0), physicalStock: Number(newProduct.stockL || 0), availableStock: Number(newProduct.stockL || 0), reservedStock: 0, damagedStock: 0, transitStock: 0, qcHold: 0 },
        { sku: getVariantSku("XL"), size: "XL", color: newProduct.variantColor, stock: Number(newProduct.stockXL || 0), physicalStock: Number(newProduct.stockXL || 0), availableStock: Number(newProduct.stockXL || 0), reservedStock: 0, damagedStock: 0, transitStock: 0, qcHold: 0 },
        { sku: getVariantSku("XXL"), size: "XXL", color: newProduct.variantColor, stock: Number(newProduct.stockXXL || 0), physicalStock: Number(newProduct.stockXXL || 0), availableStock: Number(newProduct.stockXXL || 0), reservedStock: 0, damagedStock: 0, transitStock: 0, qcHold: 0 },
        { sku: getVariantSku("Jumbo"), size: "Jumbo", color: newProduct.variantColor, stock: Number(newProduct.stockJumbo || 0), physicalStock: Number(newProduct.stockJumbo || 0), availableStock: Number(newProduct.stockJumbo || 0), reservedStock: 0, damagedStock: 0, transitStock: 0, qcHold: 0 },
        { sku: getVariantSku("All Size"), size: "All Size", color: newProduct.variantColor, stock: Number(newProduct.stockAllSize || 0), physicalStock: Number(newProduct.stockAllSize || 0), availableStock: Number(newProduct.stockAllSize || 0), reservedStock: 0, damagedStock: 0, transitStock: 0, qcHold: 0 },
        { 
          sku: getVariantSku("One Size"),
          size: "One Size", 
          color: newProduct.variantColor, 
          stock: Number(newProduct.stockOneSize || 0),
          physicalStock: Number(newProduct.stockOneSize || 0),
          availableStock: Number(newProduct.stockOneSize || 0),
          reservedStock: 0,
          damagedStock: 0,
          transitStock: 0,
          qcHold: 0,
          lingkarDada: Number(newProduct.ldOneSize || 0),
          lingkarPinggang: Number(newProduct.lpOneSize || 0),
          lingkarPaha: Number(newProduct.lpHoneSize || 0)
        }
      ]
    };

    // Add logging history for each variant under WMS immutable ledger standard
    const historyEntries: StockHistory[] = createdProduct.variants.map((v, i) => ({
      id: "st-add-" + Date.now() + i,
      productSku: createdProduct.sku,
      productName: createdProduct.name,
      variantSize: v.size,
      variantColor: v.color,
      date: new Date().toISOString(),
      changeQty: v.stock,
      type: "Stock In",
      notes: `Produk Baru Ditambahkan ke Katalog - Restok Awal (${v.stock} pcs)`,
      operator: "Putri Spv (Admin)",
      stockTypeAffected: "Physical",
      beforeQty: 0,
      afterQty: v.stock
    }));

    upsertProduct(createdProduct);
    setStockHistory(prev => [...historyEntries, ...prev]);
    setShowAddForm(false);
    dispatchSecurityAlert("STOCK", `Produk baru "${createdProduct.name}" (${createdProduct.sku}) ditambahkan ke katalog oleh Admin`, "Putri Spv (Admin)");
    
    // Reset Form
    setNewProduct({
      sku: "",
      name: "",
      category: "Gamis",
      normalPrice: 199000,
      promoPrice: 159000,
      imageUrl: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500",
      rackLocation: "Rak A-01",
      description: "",
      stockS: 10,
      stockM: 10,
      stockL: 10,
      stockXL: 10,
      stockXXL: 0,
      stockJumbo: 0,
      stockAllSize: 0,
      stockOneSize: 0,
      ldOneSize: 0,
      lpOneSize: 0,
      lpHoneSize: 0,
      variantColor: "Plum"
    });
  };

  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetProductIndex = products.findIndex(p => p.id === rejectForm.productId);
    if (targetProductIndex === -1) return;
    
    const targetProduct = products[targetProductIndex];
    const targetVariantIndex = targetProduct.variants.findIndex(v => v.size === rejectForm.variantSize && v.color === rejectForm.variantColor);
    if (targetVariantIndex === -1) return;

    if (targetProduct.variants[targetVariantIndex].stock < rejectForm.qty) {
      alert("Stok tidak mencukupi untuk direject!");
      return;
    }

    const newStockHistory: StockHistory = {
      id: "st-reject-" + Date.now(),
      productSku: targetProduct.sku,
      productName: targetProduct.name,
      variantSize: rejectForm.variantSize as any,
      variantColor: rejectForm.variantColor,
      date: new Date().toISOString(),
      changeQty: -Math.abs(rejectForm.qty),
      type: "Rijek",
      notes: "Barang Rijek/Defect: " + rejectForm.reason,
      operator: "Putri Spv (Admin)"
    };

    const updatedProduct = { ...targetProduct };
    updatedProduct.variants = [...targetProduct.variants];
    updatedProduct.variants[targetVariantIndex] = {
      ...updatedProduct.variants[targetVariantIndex],
      stock: updatedProduct.variants[targetVariantIndex].stock - rejectForm.qty,
      availableStock: (updatedProduct.variants[targetVariantIndex].availableStock || updatedProduct.variants[targetVariantIndex].stock) - rejectForm.qty,
      physicalStock: (updatedProduct.variants[targetVariantIndex].physicalStock || updatedProduct.variants[targetVariantIndex].stock) - rejectForm.qty
    };

    upsertProduct(updatedProduct);
    setStockHistory(prev => [newStockHistory, ...prev]);
    setShowRejectForm(false);
    setRejectForm({
      productId: "",
      variantSize: "S",
      variantColor: "",
      qty: 1,
      reason: ""
    });
  };

  return (
    <div id="katalog-view" className="space-y-6">
      {/* Sub tabs configuration */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-3 sm:p-4 rounded-xl border border-pink-100 shadow-2xs">
        <div className="flex bg-slate-100 p-1 rounded-lg overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveCatalogTab("katalog")}
            className={`text-[10px] sm:text-xs px-3 sm:px-4 py-2 rounded-md font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${activeCatalogTab === "katalog" ? "bg-white text-slate-800 shadow-2xs" : "text-slate-500 hover:text-slate-800"}`}
          >
            <Box className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-pink-600" />
            Katalog
          </button>
          <button
            id="stock-history-tab-btn"
            onClick={() => setActiveCatalogTab("riwayat")}
            className={`text-[10px] sm:text-xs px-3 sm:px-4 py-2 rounded-md font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${activeCatalogTab === "riwayat" ? "bg-white text-slate-800 shadow-2xs" : "text-slate-500 hover:text-slate-800"}`}
          >
            <History className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-pink-600" />
            Riwayat
          </button>
          <button
            onClick={() => setActiveCatalogTab("kalkulator")}
            className={`text-[10px] sm:text-xs px-3 sm:px-4 py-2 rounded-md font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${activeCatalogTab === "kalkulator" ? "bg-white text-slate-800 shadow-2xs" : "text-slate-500 hover:text-slate-800"}`}
          >
            <Calculator className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-pink-600" />
            Kalkulator
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setShowCategorySettings(true)}
            className="flex-1 sm:flex-none justify-center bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-[10px] sm:text-xs px-2.5 sm:px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer border border-indigo-200"
          >
            <Tag className="h-3.5 w-3.5" />
            Kategori
          </button>
          <button
            onClick={() => setShowRejectForm(true)}
            className="flex-1 sm:flex-none justify-center bg-red-50 text-red-700 hover:bg-red-100 font-bold text-[10px] sm:text-xs px-2.5 sm:px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer border border-red-200"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Rijek
          </button>
          <button
            onClick={() => setShowScanner(true)}
            className="flex-1 sm:flex-none justify-center bg-slate-800 hover:bg-slate-900 text-white font-bold text-[10px] sm:text-xs px-2.5 sm:px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Camera className="h-3.5 w-3.5" />
            Scanner
          </button>
          <button
            onClick={handleOpenAddForm}
            className="flex-1 sm:flex-none justify-center bg-pink-600 hover:bg-pink-700 text-white font-bold text-[10px] sm:text-xs px-2.5 sm:px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            New
          </button>
        </div>
      </div>

      {showRejectForm && (
        <form onSubmit={handleRejectSubmit} className="bg-red-50 p-6 rounded-2xl border border-red-200 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-red-200 pb-3">
            <h3 className="font-bold text-red-800 text-base flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Pencatatan Barang Rijek / Defect
            </h3>
            <button type="button" onClick={() => setShowRejectForm(false)} className="text-red-400 hover:text-red-700">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-red-700 mb-1">Pilih Produk:</label>
              <select
                value={rejectForm.productId}
                onChange={e => setRejectForm({ ...rejectForm, productId: e.target.value })}
                className="w-full text-xs p-2.5 rounded-lg border border-red-200 focus:outline-none focus:border-red-500 bg-white"
                required
              >
                <option value="">-- Pilih Produk --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-red-700 mb-1">Ukuran:</label>
              <select
                value={rejectForm.variantSize}
                onChange={e => setRejectForm({ ...rejectForm, variantSize: e.target.value })}
                className="w-full text-xs p-2.5 rounded-lg border border-red-200 focus:outline-none focus:border-red-500 bg-white"
                required
              >
                <option value="S">S</option>
                <option value="M">M</option>
                <option value="L">L</option>
                <option value="XL">XL</option>
                <option value="XXL">XXL</option>
                <option value="Jumbo">Jumbo</option>
                <option value="All Size">All Size</option>
                <option value="One Size">One Size</option>
                <option value="Oversize">Oversize</option>
                <option value="Fit to XL">Fit to XL</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-red-700 mb-1">Warna:</label>
              <select
                value={rejectForm.variantColor}
                onChange={e => setRejectForm({ ...rejectForm, variantColor: e.target.value })}
                className="w-full text-xs p-2.5 rounded-lg border border-red-200 focus:outline-none focus:border-red-500 bg-white"
                required
              >
                <option value="">-- Warna --</option>
                {rejectForm.productId && products.find(p => p.id === rejectForm.productId)?.variants.filter((v, i, a) => a.findIndex(t => t.color === v.color) === i).map(v => (
                  <option key={v.color} value={v.color}>{v.color}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-red-700 mb-1">Jumlah Rijek:</label>
              <input
                type="number"
                min="1"
                value={rejectForm.qty}
                onChange={e => setRejectForm({ ...rejectForm, qty: Number(e.target.value) })}
                className="w-full text-xs p-2.5 rounded-lg border border-red-200 focus:outline-none focus:border-red-500 bg-white"
                required
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-red-700 mb-1">Keterangan / Alasan Rijek:</label>
              <input
                type="text"
                placeholder="Misal: Robek di bagian lengan, kancing lepas, warna luntur"
                value={rejectForm.reason}
                onChange={e => setRejectForm({ ...rejectForm, reason: e.target.value })}
                className="w-full text-xs p-2.5 rounded-lg border border-red-200 focus:outline-none focus:border-red-500 bg-white"
                required
              />
            </div>
          </div>
          
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-6 py-2.5 rounded-lg transition-colors cursor-pointer shadow-md"
            >
              Simpan Barang Rijek (Kurangi Stok)
            </button>
          </div>
        </form>
      )}

      {showCategorySettings && (
        <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-200 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-indigo-200 pb-3">
            <h3 className="font-bold text-indigo-800 text-base flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Kelola Kategori Produk
            </h3>
            <button type="button" onClick={() => setShowCategorySettings(false)} className="text-indigo-400 hover:text-indigo-700">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <input
              type="text"
              placeholder="Kategori Baru..."
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="px-3 py-2 text-sm border-indigo-200 border rounded-lg focus:outline-none focus:border-indigo-500 flex-1 bg-white"
            />
            <button
              onClick={handleAddCategory}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm px-4 py-2 rounded-lg transition-colors"
            >
              Tambah
            </button>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
            {categories.map((cat, idx) => (
              <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-lg border border-indigo-100">
                {editingCatIndex === idx ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      value={editCatName}
                      onChange={(e) => setEditCatName(e.target.value)}
                      className="px-2 py-1 text-sm border-indigo-200 border rounded-md focus:outline-none focus:border-indigo-500 flex-1"
                    />
                    <button
                      onClick={() => handleSaveEditCategory(idx)}
                      className="text-green-600 hover:text-green-800 bg-green-50 p-1.5 rounded-md"
                    >
                      <Save className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setEditingCatIndex(null)}
                      className="text-slate-400 hover:text-slate-600 bg-slate-50 p-1.5 rounded-md"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="font-medium text-slate-700 text-sm">{cat}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditCategory(idx)}
                        className="text-indigo-500 hover:text-indigo-700 p-1 bg-indigo-50 rounded-md"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(idx)}
                        className="text-red-500 hover:text-red-700 p-1 bg-red-50 rounded-md"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col border border-pink-100">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-pink-50/30">
              <div className="flex items-center gap-2">
                <div className="bg-pink-600 p-2 rounded-lg">
                  <Camera className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">Pindai Barcode Produk</h3>
                  <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Arahkan kamera ke barcode/QR Code produk</p>
                </div>
              </div>
              <button 
                onClick={() => setShowScanner(false)} 
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6">
              <div 
                id="barcode-scanner-region" 
                className="w-full aspect-square bg-slate-900 rounded-2xl overflow-hidden border-4 border-pink-100 shadow-inner relative"
              >
                {/* Visual guidance overlay */}
                <div className="absolute inset-0 border-[40px] border-black/20 pointer-events-none flex items-center justify-center">
                  <div className="w-full h-full border-2 border-dashed border-pink-400 opacity-50 rounded-lg"></div>
                </div>
              </div>
              
              <div className="mt-6 flex flex-col items-center text-center space-y-3">
                <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                  <p className="text-xs text-indigo-700 font-medium">
                    <span className="font-bold">Tips:</span> Pastikan cahaya cukup dan barcode berada di dalam kotak area pemindaian.
                  </p>
                </div>
                <button
                  onClick={() => setShowScanner(false)}
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all"
                >
                  Batalkan Pemindaian
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddForm && (
        <form onSubmit={handleAddProduct} className="bg-white p-6 rounded-2xl border border-pink-100 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 text-base">Tambah Produk Baru</h3>
            <button type="button" onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-slate-600">SKU UNIK (Barcode):</label>
                <button 
                  type="button" 
                  onClick={() => setNewProduct({ ...newProduct, sku: generateUniqueSKU() })}
                  className="text-[10px] text-pink-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" /> Auto Gen
                </button>
              </div>
              <input
                type="text"
                placeholder="E.g. JSS-XXX"
                value={newProduct.sku}
                onChange={e => setNewProduct({ ...newProduct, sku: e.target.value })}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-pink-500 font-mono"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Produk:</label>
              <input
                type="text"
                placeholder="E.g. Gamis Syari Silk Premium Plum"
                value={newProduct.name}
                onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-pink-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Kategori:</label>
              <select
                value={newProduct.category}
                onChange={e => {
                  const newCategory = e.target.value;
                  setNewProduct({
                    ...newProduct,
                    category: newCategory,
                    sku: generateUniqueSKU(newCategory, newProduct.variantColor)
                  });
                }}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-pink-500"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Harga Normal (IDR):</label>
              <input
                type="number"
                value={newProduct.normalPrice}
                onChange={e => setNewProduct({ ...newProduct, normalPrice: Number(e.target.value) })}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-pink-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Harga Coret Promo (IDR):</label>
              <input
                type="number"
                value={newProduct.promoPrice}
                onChange={e => setNewProduct({ ...newProduct, promoPrice: Number(e.target.value) })}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-pink-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Rak Lokasi Gudang:</label>
              <input
                type="text"
                placeholder="E.g. Rak A-02"
                value={newProduct.rackLocation}
                onChange={e => setNewProduct({ ...newProduct, rackLocation: e.target.value })}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-pink-500 font-mono"
              />
            </div>
          </div>

          {/* Quick Selling Price Calculator trigger & box inside 'Create Product' Form */}
          <div className="bg-pink-50/40 p-4 rounded-xl border border-pink-100 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-pink-600 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-slate-800">💡 Bingung dalam Menentukan Harga Jual?</h4>
                  <p className="text-[10px] text-slate-500">Gunakan asisten kalkulator harga jual (memperhitungkan modal bahan, ongkir, admin marketplace, packing & margin target).</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickCalc(!showQuickCalc)}
                className="bg-white hover:bg-pink-50 text-pink-600 border border-pink-200 text-[11px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all shrink-0"
              >
                {showQuickCalc ? "Sembunyikan Kalkulator" : "Buka Kalkulator Asisten"}
              </button>
            </div>

            {showQuickCalc && (
              <div className="bg-white p-4 rounded-xl border border-pink-100 space-y-4 animate-in fade-in duration-200">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">Modal Awal / COGS (IDR):</label>
                    <input
                      type="number"
                      value={calcCOGS}
                      onChange={e => setCalcCOGS(Number(e.target.value))}
                      className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded focus:outline-pink-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">Ongkir Supplier (IDR):</label>
                    <input
                      type="number"
                      value={calcShipping}
                      onChange={e => setCalcShipping(Number(e.target.value))}
                      className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded focus:outline-pink-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">Biaya Packing (IDR):</label>
                    <input
                      type="number"
                      value={calcPackaging}
                      onChange={e => setCalcPackaging(Number(e.target.value))}
                      className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded focus:outline-pink-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">Biaya Iklan/Lain (IDR):</label>
                    <input
                      type="number"
                      value={calcOther}
                      onChange={e => setCalcOther(Number(e.target.value))}
                      className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded focus:outline-pink-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">Fee Admin Platform (%):</label>
                    <input
                      type="number"
                      value={calcAdminPercent}
                      onChange={e => setCalcAdminPercent(Number(e.target.value))}
                      className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded focus:outline-pink-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">Target Margin %:</label>
                    <input
                      type="number"
                      value={calcMarginPercent}
                      onChange={e => setCalcMarginPercent(Number(e.target.value))}
                      className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded focus:outline-pink-500"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs border border-slate-100">
                  <div className="space-y-1">
                    <p className="text-slate-500 text-[11px]">
                      Total Modal Bersih: <span className="font-mono font-bold text-slate-800">Rp {(calcCOGS + calcShipping + calcPackaging + calcOther).toLocaleString("id-ID")}</span>
                    </p>
                    <p className="text-pink-600 font-semibold text-[11px]">
                      Harga Jual Rekomendasi: <span className="font-mono font-bold text-xs text-pink-700 bg-pink-100/50 px-2 py-0.5 rounded">Rp {(() => {
                        const totalModal = calcCOGS + calcShipping + calcPackaging + calcOther;
                        const factor = calcMarginPercent + calcAdminPercent >= 100 ? 99 : calcMarginPercent + calcAdminPercent;
                        return Math.round(totalModal / (1 - factor / 100)).toLocaleString("id-ID");
                      })()}</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const totalModal = calcCOGS + calcShipping + calcPackaging + calcOther;
                        const factor = calcMarginPercent + calcAdminPercent >= 100 ? 99 : calcMarginPercent + calcAdminPercent;
                        const recommended = Math.round(totalModal / (1 - factor / 100));
                        setNewProduct(prev => ({
                          ...prev,
                          promoPrice: recommended,
                          normalPrice: Math.round(recommended * 1.25)
                        }));
                      }}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] px-3 py-2 rounded-lg transition-colors cursor-pointer"
                    >
                      Terapkan (Harga Coret Promo)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const totalModal = calcCOGS + calcShipping + calcPackaging + calcOther;
                        const factor = calcMarginPercent + calcAdminPercent >= 100 ? 99 : calcMarginPercent + calcAdminPercent;
                        const recommended = Math.round(totalModal / (1 - factor / 100));
                        setNewProduct(prev => ({
                          ...prev,
                          normalPrice: recommended
                        }));
                      }}
                      className="bg-pink-600 hover:bg-pink-700 text-white font-bold text-[10px] px-3 py-2 rounded-lg transition-colors cursor-pointer"
                    >
                      Terapkan sebagai Harga Normal
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-slate-600">Deskripsi & Keunggulan Bahan:</label>
                <button 
                  type="button" 
                  onClick={generateAIDescription}
                  disabled={isGeneratingDesc}
                  className="flex items-center gap-1.5 text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2 py-1 rounded border border-indigo-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`h-3 w-3 ${isGeneratingDesc ? 'animate-spin' : ''}`} />
                  {isGeneratingDesc ? 'Memikirkan...' : 'Generate AI Deskripsi'}
                </button>
              </div>
              <textarea
                placeholder="Jelaskan karakteristik kain, keunggulan jahit, dll..."
                value={newProduct.description}
                onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-pink-500 h-24 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Foto Produk (.jpg, .jpeg, .png):</label>
              <div className="space-y-2">
                <div className="flex gap-3 items-center">
                  {newProduct.imageUrl && (
                    <div className="relative h-16 w-16 rounded-xl border border-pink-200 overflow-hidden bg-slate-50 shrink-0 shadow-2xs">
                      <img src={newProduct.imageUrl} alt="Pratinjau" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setNewProduct({ ...newProduct, imageUrl: "" })}
                        className="absolute -top-1 -right-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full p-0.5 shadow-md cursor-pointer transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="border-2 border-dashed border-pink-200 hover:border-pink-400 bg-pink-50/10 hover:bg-pink-50/25 rounded-2xl p-4 text-center transition-all cursor-pointer relative">
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 3 * 1024 * 1024) {
                              alert("Ukuran berkas terlalu besar! Maksimal 3MB.");
                              return;
                            }
                            const reader = new FileReader();
                            reader.onload = async (event) => {
                              if (event.target?.result) {
                                try {
                                  const compressed = await compressImage(event.target.result as string, 1200, 1200, 0.92);
                                  setNewProduct({ ...newProduct, imageUrl: compressed });
                                } catch (err) {
                                  console.error("Gagal kompresi:", err);
                                  setNewProduct({ ...newProduct, imageUrl: event.target.result as string });
                                }
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <div className="text-pink-600 font-bold text-xs flex flex-col items-center justify-center gap-1.5">
                        <PlusCircle className="h-5 w-5 text-pink-500 hover:scale-105 transition-transform" />
                        <span>Pilih Foto dari Perangkat</span>
                        <span className="text-[10px] text-slate-400 font-normal">Format: .jpg, .jpeg, .png (Maksimal 3MB)</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100/50 pt-2">
                  <label className="block text-[10px] font-medium text-slate-400 mb-1">Gunakan URL Web langsung (opsional):</label>
                  <input
                    type="text"
                    value={newProduct.imageUrl}
                    onChange={e => setNewProduct({ ...newProduct, imageUrl: e.target.value })}
                    placeholder="Atau tempel tautan foto di sini..."
                    className="w-full text-[11px] p-2 rounded-lg border border-slate-200 focus:outline-none focus:border-pink-500 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-4">
            <h4 className="text-xs font-bold text-slate-700 mb-1">Varian Warna Utama & Alokasi Stok Awal</h4>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <div className="col-span-2 md:col-span-1">
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">Warna:</label>
                <input
                  type="text"
                  placeholder="E.g. Navy Blue"
                  value={newProduct.variantColor}
                  onChange={e => {
                    const newColor = e.target.value;
                    setNewProduct({
                      ...newProduct,
                      variantColor: newColor,
                      sku: generateUniqueSKU(newProduct.category, newColor)
                    });
                  }}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:border-pink-500 font-semibold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">Stok S:</label>
                <input
                  type="number"
                  value={newProduct.stockS}
                  onChange={e => setNewProduct({ ...newProduct, stockS: Number(e.target.value) })}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">Stok M:</label>
                <input
                  type="number"
                  value={newProduct.stockM}
                  onChange={e => setNewProduct({ ...newProduct, stockM: Number(e.target.value) })}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">Stok L:</label>
                <input
                  type="number"
                  value={newProduct.stockL}
                  onChange={e => setNewProduct({ ...newProduct, stockL: Number(e.target.value) })}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">Stok XL:</label>
                <input
                  type="number"
                  value={newProduct.stockXL}
                  onChange={e => setNewProduct({ ...newProduct, stockXL: Number(e.target.value) })}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">Stok XXL:</label>
                <input
                  type="number"
                  value={newProduct.stockXXL}
                  onChange={e => setNewProduct({ ...newProduct, stockXXL: Number(e.target.value) })}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">Stok Jumbo:</label>
                <input
                  type="number"
                  value={newProduct.stockJumbo}
                  onChange={e => setNewProduct({ ...newProduct, stockJumbo: Number(e.target.value) })}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">Stok All Size:</label>
                <input
                  type="number"
                  value={newProduct.stockAllSize}
                  onChange={e => setNewProduct({ ...newProduct, stockAllSize: Number(e.target.value) })}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200"
                />
              </div>
            </div>

            {/* Custom section for One Size containing measurements */}
            <div className="bg-pink-50/40 p-4 rounded-xl border border-pink-100/70 space-y-3">
              <div className="flex items-center justify-between border-b border-pink-100/40 pb-2">
                <span className="text-[11px] font-bold text-pink-700 uppercase tracking-wider flex items-center gap-1.5">
                  📐 Dimensi & Stok Khusus "One Size"
                </span>
                <span className="text-[10px] text-pink-500 font-normal">Isi ukuran lingkar tubuh bila produk berukuran One Size</span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">Stok One Size:</label>
                  <input
                    type="number"
                    value={newProduct.stockOneSize}
                    onChange={e => setNewProduct({ ...newProduct, stockOneSize: Number(e.target.value) })}
                    className="w-full text-xs p-2 rounded-lg border border-pink-200 focus:ring-1 focus:ring-pink-500 focus:outline-none bg-white font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">Lingkar Dada (LD) - cm:</label>
                  <input
                    type="number"
                    placeholder="Contoh: 110"
                    value={newProduct.ldOneSize || ""}
                    onChange={e => setNewProduct({ ...newProduct, ldOneSize: Number(e.target.value) || 0 })}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:border-pink-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">Lingkar Pinggang (LP) - cm:</label>
                  <input
                    type="number"
                    placeholder="Contoh: 95"
                    value={newProduct.lpOneSize || ""}
                    onChange={e => setNewProduct({ ...newProduct, lpOneSize: Number(e.target.value) || 0 })}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:border-pink-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">Lingkar Paha (LPh) - cm:</label>
                  <input
                    type="number"
                    placeholder="Contoh: 65"
                    value={newProduct.lpHoneSize || ""}
                    onChange={e => setNewProduct({ ...newProduct, lpHoneSize: Number(e.target.value) || 0 })}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:border-pink-500 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs font-semibold px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="text-xs bg-pink-600 hover:bg-pink-700 text-white font-bold px-5 py-2 rounded-lg cursor-pointer"
            >
              Simpan Katalog
            </button>
          </div>
        </form>
      )}

      {activeCatalogTab === "katalog" && (
        <>
          {/* Filtering and Search Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 bg-white p-3 sm:p-4 rounded-xl border border-pink-100 shadow-2xs">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </span>
              <input
                type="text"
                placeholder="Cari SKU atau nama baju..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full text-xs pl-9 pr-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:border-pink-500 shadow-sm"
              />
            </div>

            {/* Filter tags */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full lg:w-auto">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 w-full scrollbar-hide">
                <div className="flex bg-slate-50 p-1 rounded-lg w-full sm:w-auto overflow-x-auto scrollbar-hide">
                  {["Semua", ...categories].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`text-[10px] sm:text-xs px-3 sm:px-4 py-1.5 rounded-md font-bold transition-all cursor-pointer whitespace-nowrap ${selectedCategory === cat ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bulk Action Bar */}
          <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectionMode(!selectionMode);
                  if (selectionMode) setSelectedForPrint([]);
                }}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium cursor-pointer transition-colors border ${selectionMode ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"}`}
              >
                Pilih Beberapa Produk
              </button>
              {selectionMode && (
                <span className="text-xs text-slate-500 font-medium">
                  {selectedForPrint.length} terpilih
                </span>
              )}
            </div>
            {selectionMode && selectedForPrint.length > 0 && (
              <button
                onClick={() => {
                  const toPrint = products.filter(p => selectedForPrint.includes(p.id));
                  setPrintProducts(toPrint);
                }}
                className="bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold px-4 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <Printer className="h-4 w-4" /> Cetak Label Sekaligus
              </button>
            )}
          </div>

          {/* Bulk Generation / Developer Tools to Simulate 10k Models */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 border border-pink-950/20 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold tracking-tight flex items-center gap-1.5 text-pink-400 uppercase">
                🚀 Dukungan Skala Besar (Maks 10.000 Model Pakaian)
              </h4>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                Katalog dioptimalkan memakai <b>Virtual Scrolling (Modern Rendering)</b> agar sistem tetap responsif meski terisi sepuluh ribu produk. Coba simulasi di bawah:
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handleSimulateBulkProducts(100)}
                className="bg-slate-800 hover:bg-slate-700 text-pink-300 border border-pink-900/30 text-[10px] font-bold px-2.5 py-1.5 rounded-lg cursor-pointer transition-all"
              >
                +100 Model
              </button>
              <button
                type="button"
                onClick={() => handleSimulateBulkProducts(1000)}
                className="bg-pink-950/40 hover:bg-pink-900/40 text-pink-400 border border-pink-500/10 text-[10px] font-bold px-2.5 py-1.5 rounded-lg cursor-pointer transition-all"
              >
                +1.000 Model
              </button>
              <button
                type="button"
                onClick={() => handleSimulateBulkProducts(10000)}
                className="bg-pink-600 hover:bg-pink-700 text-white text-[10px] font-extrabold px-3 py-1.5 rounded-lg cursor-pointer transition-all shadow-md active:scale-95 duration-100"
              >
                🔥 +10.000 Model
              </button>
            </div>
          </div>

          {/* Catalog virtual grid */}
          <div className="min-h-[600px]">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-pink-100/45 text-slate-400 text-xs font-medium">
                Tidak ada model baju dalam katalog yang cocok dengan filter atau pencarian Anda.
              </div>
            ) : (
              <VirtuosoGrid
                useWindowScroll
                data={filteredProducts}
                totals={filteredProducts.length}
                listClassName="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-6"
                itemClassName="flex flex-col"
                itemContent={(index, product) => {
                  const sizesTotal = product.variants.reduce((acc, v) => acc + v.stock, 0);
                  const isMinimalStock = product.variants.some(v => v.stock < 5);
                  const isEditingThis = editingProductId === product.id;
                  const isSelected = selectedForPrint.includes(product.id);

                  return (
                    <div 
                      key={product.id} 
                      className={`bg-white rounded-2xl border ${isSelected ? 'border-pink-500 ring-2 ring-pink-500/20' : 'border-pink-100'} shadow-2xs overflow-hidden flex flex-col justify-between hover:shadow-xs transition-all relative h-full mb-6 ${selectionMode ? 'cursor-pointer' : ''}`}
                      onClick={() => {
                        if (selectionMode) {
                          if (isSelected) {
                            setSelectedForPrint(prev => prev.filter(id => id !== product.id));
                          } else {
                            setSelectedForPrint(prev => [...prev, product.id]);
                          }
                        }
                      }}
                    >
                      {selectionMode && (
                        <div className="absolute top-3 right-3 z-20">
                          <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-pink-500 border-pink-500 text-white' : 'bg-white/80 border-slate-300'}`}>
                            {isSelected && <Check className="h-3.5 w-3.5" />}
                          </div>
                        </div>
                      )}
                      <div className="relative h-32 sm:h-48 bg-slate-100 overflow-hidden shrink-0">
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                          referrerPolicy="no-referrer"
                        />

                        {isEditingThis && (
                          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center p-3 text-center transition-all">
                            <label className="bg-white/95 hover:bg-white text-slate-800 text-[10px] font-extrabold px-3 py-2 rounded-lg cursor-pointer flex items-center gap-1.5 shadow-md hover:scale-105 transition-all relative">
                              <input
                                type="file"
                                accept=".jpg,.jpeg,.png"
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    if (file.size > 3 * 1024 * 1024) {
                                      alert("Ukuran berkas terlalu besar! Maksimal 3MB.");
                                      return;
                                    }
                                    const reader = new FileReader();
                                    reader.onload = async (event) => {
                                      if (event.target?.result) {
                                        try {
                                          const compressed = await compressImage(event.target.result as string, 1200, 1200, 0.92);
                                          const targetProduct = products.find(p => p.id === product.id);
                                          if (targetProduct) {
                                            upsertProduct({ ...targetProduct, imageUrl: compressed });
                                          }
                                        } catch (err) {
                                          console.error("Gagal kompresi edit:", err);
                                          const targetProduct = products.find(p => p.id === product.id);
                                          if (targetProduct) {
                                            upsertProduct({ ...targetProduct, imageUrl: event.target.result as string });
                                          }
                                        }
                                      }
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                              <span>Ganti Foto (.jpg/.png)</span>
                            </label>
                            <p className="text-[9px] text-pink-200 mt-2 font-medium">Unggah file lokal untuk mengganti gambar katalog</p>
                          </div>
                        )}

                        <div className="absolute top-3 left-3 flex gap-1.5">
                          <span className="bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full tracking-wide">
                            {product.category}
                          </span>
                          <span className="bg-pink-600 text-white text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full">
                            {product.rackLocation}
                          </span>
                        </div>

                        {!isEditingThis && isMinimalStock && (
                          <div className="absolute bottom-3 right-3 bg-rose-600 text-white text-[9px] font-bold px-2.5 py-1 rounded-sm flex items-center gap-1 shadow-sm">
                            <AlertOctagon className="h-3 w-3 animate-bounce" />
                            STOK MENIPIS!
                          </div>
                        )}
                      </div>

                      <div className="p-3 sm:p-5 flex-1 flex flex-col justify-between space-y-3 sm:space-y-4">
                        <div>
                          <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                            <div className="flex flex-col">
                              <span className="font-mono text-[9px] sm:text-[10px] font-bold text-pink-600 tracking-wider block">
                                {product.sku}
                              </span>
                              <div className="mt-1">
                                <StockSparkline product={product} history={stockHistory} />
                                <span className="text-[8px] text-slate-400 font-medium uppercase tracking-tighter">Tren Stok</span>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <button 
                                onClick={(e) => { e.stopPropagation(); setPrintProducts([product]); }}
                                className="bg-slate-50 hover:bg-slate-100 text-slate-600 p-1.5 rounded-lg cursor-pointer transition-colors"
                                title="Cetak Label"
                              >
                                <Printer className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setShowQrModal(product); }}
                                className="bg-pink-50 hover:bg-pink-100 text-pink-600 p-1.5 rounded-lg cursor-pointer transition-colors"
                                title="Tampilkan QR Code"
                              >
                                <QrCode className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
                              </button>
                            </div>
                          </div>
                          <h4 className="font-bold text-slate-800 text-[11px] sm:text-sm mt-1 sm:mt-2 leading-snug line-clamp-1 sm:line-clamp-2">
                            {product.name}
                          </h4>
                          <p className="hidden sm:block text-slate-500 text-xs mt-1.5 line-clamp-2 leading-relaxed">
                            {product.description}
                          </p>

                          <div className="flex flex-wrap items-baseline gap-1.5 sm:gap-2 mt-2 sm:mt-3">
                            <span className="text-pink-600 font-extrabold text-xs sm:text-[15px]">
                              IDR {product.promoPrice.toLocaleString("id-ID")}
                            </span>
                            <span className="text-slate-400 line-through text-[9px] sm:text-xs font-medium">
                              IDR {product.normalPrice.toLocaleString("id-ID")}
                            </span>
                          </div>
                        </div>

                        <div className="bg-slate-50/50 p-2 sm:p-3.5 rounded-lg sm:rounded-xl border border-slate-100 mt-2 sm:mt-0">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-1.5 sm:pb-2.5 border-b border-slate-200/60 mb-1.5 sm:mb-2 gap-1 sm:gap-0">
                            <span className="text-[9px] sm:text-[11px] font-bold text-slate-600">Alokasi Stok</span>
                            <span className="text-[9px] font-mono font-bold bg-slate-200 px-1.5 py-0.5 rounded text-slate-700">
                              {sizesTotal} pcs
                            </span>
                          </div>

                          {isEditingThis ? (
                            <div className="space-y-3 mt-2" onClick={(e) => e.stopPropagation()}>
                              <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-3xs bg-white">
                                <table className="w-full text-[9.5px] text-slate-700 font-mono text-center min-w-[500px] divide-y divide-slate-150">
                                  <thead className="bg-slate-50 text-[9px] font-bold text-slate-550 uppercase tracking-normal">
                                    <tr className="divide-x divide-slate-150">
                                      <th className="p-1 px-2 text-left font-sans text-slate-600 bg-slate-100">Varian</th>
                                      <th className="p-1 text-slate-700">Fisik (Physical)</th>
                                      <th className="p-1 text-slate-700">Reservasi (Reserved)</th>
                                      <th className="p-1 text-pink-600 bg-pink-50/70 font-black">Tersedia (Available)</th>
                                      <th className="p-1 text-rose-600">Rijek (Damaged)</th>
                                      <th className="p-1 text-blue-650">Transit</th>
                                      <th className="p-1 text-indigo-600">QC Hold</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-150">
                                    {editVariants.map((v, i) => {
                                      const cPhysical = v.physicalStock !== undefined ? v.physicalStock : v.stock;
                                      const cReserved = v.reservedStock || 0;
                                      const cAvailable = cPhysical - cReserved;
                                      const cDamaged = v.damagedStock || 0;
                                      const cTransit = v.transitStock || 0;
                                      const cQcHold = v.qcHold || 0;

                                      return (
                                        <tr key={v.size} className="divide-x divide-slate-150 hover:bg-slate-50/50">
                                          <td className="p-1 px-2 font-sans font-extrabold text-slate-700 text-left bg-slate-50">{v.size}</td>
                                          <td className="p-1 text-center">
                                            <input
                                              type="number"
                                              min="0"
                                              value={cPhysical}
                                              onChange={e => {
                                                const val = Math.max(0, Number(e.target.value));
                                                const copied = [...editVariants];
                                                copied[i] = {
                                                  ...copied[i],
                                                  physicalStock: val,
                                                  availableStock: val - cReserved,
                                                  stock: val - cReserved
                                                };
                                                setEditVariants(copied);
                                              }}
                                              className="w-12 text-center p-0.5 border border-slate-200 rounded font-bold bg-white text-slate-800 focus:border-pink-500 focus:outline-none"
                                            />
                                          </td>
                                          <td className="p-1 text-center">
                                            <input
                                              type="number"
                                              min="0"
                                              value={cReserved}
                                              onChange={e => {
                                                const val = Math.max(0, Number(e.target.value));
                                                const copied = [...editVariants];
                                                copied[i] = {
                                                  ...copied[i],
                                                  reservedStock: val,
                                                  availableStock: cPhysical - val,
                                                  stock: cPhysical - val
                                                };
                                                setEditVariants(copied);
                                              }}
                                              className="w-12 text-center p-0.5 border border-slate-200 rounded bg-white text-slate-600 focus:border-pink-500 focus:outline-none"
                                            />
                                          </td>
                                          <td className={`p-1 font-extrabold text-center ${cAvailable < 5 ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-800"}`}>
                                            {cAvailable}
                                          </td>
                                          <td className="p-1 text-center">
                                            <input
                                              type="number"
                                              min="0"
                                              value={cDamaged}
                                              onChange={e => {
                                                const val = Math.max(0, Number(e.target.value));
                                                const copied = [...editVariants];
                                                copied[i] = {
                                                  ...copied[i],
                                                  damagedStock: val
                                                };
                                                setEditVariants(copied);
                                              }}
                                              className="w-10 text-center p-0.5 border border-slate-200 rounded bg-white text-rose-700 focus:border-rose-500 focus:outline-none"
                                            />
                                          </td>
                                          <td className="p-1 text-center">
                                            <input
                                              type="number"
                                              min="0"
                                              value={cTransit}
                                              onChange={e => {
                                                const val = Math.max(0, Number(e.target.value));
                                                const copied = [...editVariants];
                                                copied[i] = {
                                                  ...copied[i],
                                                  transitStock: val
                                                };
                                                setEditVariants(copied);
                                              }}
                                              className="w-10 text-center p-0.5 border border-slate-200 rounded bg-white text-blue-700 focus:border-blue-500 focus:outline-none"
                                            />
                                          </td>
                                          <td className="p-1 text-center">
                                            <input
                                              type="number"
                                              min="0"
                                              value={cQcHold}
                                              onChange={e => {
                                                const val = Math.max(0, Number(e.target.value));
                                                const copied = [...editVariants];
                                                copied[i] = {
                                                  ...copied[i],
                                                  qcHold: val
                                                };
                                                setEditVariants(copied);
                                              }}
                                              className="w-10 text-center p-0.5 border border-slate-200 rounded bg-white text-indigo-700 focus:border-indigo-500 focus:outline-none"
                                            />
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>

                              {editVariants.some(v => v.size === "One Size") && (
                                <div className="bg-pink-50/30 p-2.5 rounded-lg border border-pink-100/40 space-y-1.5 mt-2">
                                  <span className="text-[9.5px] font-bold text-pink-700 block uppercase tracking-wider">
                                    📐 Edit Ukuran One Size
                                  </span>
                                  <div className="grid grid-cols-3 gap-1.5 font-mono">
                                    {editVariants.map((v, i) => {
                                      if (v.size !== "One Size") return null;
                                      return (
                                        <React.Fragment key="dims-inline-edit">
                                          <div>
                                            <span className="text-[8px] text-slate-500 block text-center">LD (cm)</span>
                                            <input
                                              type="number"
                                              placeholder="LD"
                                              value={v.lingkarDada || ""}
                                              onChange={e => {
                                                const copied = [...editVariants];
                                                copied[i].lingkarDada = Number(e.target.value) || 0;
                                                setEditVariants(copied);
                                              }}
                                              className="w-full text-[10px] p-1 text-center border rounded font-mono focus:border-pink-500 focus:outline-none bg-white"
                                            />
                                          </div>
                                          <div>
                                            <span className="text-[8px] text-slate-500 block text-center">LP (cm)</span>
                                            <input
                                              type="number"
                                              placeholder="LP"
                                              value={v.lingkarPinggang || ""}
                                              onChange={e => {
                                                const copied = [...editVariants];
                                                copied[i].lingkarPinggang = Number(e.target.value) || 0;
                                                setEditVariants(copied);
                                              }}
                                              className="w-full text-[10px] p-1 text-center border rounded font-mono focus:border-pink-500 focus:outline-none bg-white"
                                            />
                                          </div>
                                          <div>
                                            <span className="text-[8px] text-slate-500 block text-center">LPh (cm)</span>
                                            <input
                                              type="number"
                                              placeholder="LPh"
                                              value={v.lingkarPaha || ""}
                                              onChange={e => {
                                                const copied = [...editVariants];
                                                copied[i].lingkarPaha = Number(e.target.value) || 0;
                                                setEditVariants(copied);
                                              }}
                                              className="w-full text-[10px] p-1 text-center border rounded font-mono focus:border-pink-500 focus:outline-none bg-white"
                                            />
                                          </div>
                                        </React.Fragment>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              <div className="bg-white p-3 rounded-xl border border-slate-200 mt-3 space-y-3 shadow-sm">
                                <span className="text-[10px] font-bold text-slate-700 block uppercase tracking-wider border-b border-slate-100 pb-1.5">
                                  📝 Edit Informasi Dasar Produk
                                </span>
                                
                                <div className="space-y-2.5">
                                  <div>
                                    <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Nama Produk</label>
                                    <input
                                      type="text"
                                      value={editInfo.name}
                                      onChange={e => setEditInfo({ ...editInfo, name: e.target.value })}
                                      className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:outline-none bg-slate-50/50"
                                    />
                                  </div>

                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Harga Normal</label>
                                      <input
                                        type="number"
                                        value={editInfo.normalPrice}
                                        onChange={e => setEditInfo({ ...editInfo, normalPrice: Number(e.target.value) })}
                                        className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:outline-none bg-slate-50/50 font-mono"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Harga Promo</label>
                                      <input
                                        type="number"
                                        value={editInfo.promoPrice}
                                        onChange={e => setEditInfo({ ...editInfo, promoPrice: Number(e.target.value) })}
                                        className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:outline-none bg-slate-50/50 font-mono font-bold text-pink-600"
                                      />
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Kategori</label>
                                      <select
                                        value={editInfo.category}
                                        onChange={e => setEditInfo({ ...editInfo, category: e.target.value })}
                                        className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:outline-none bg-slate-50/50"
                                      >
                                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Lokasi Rak</label>
                                      <input
                                        type="text"
                                        value={editInfo.rackLocation}
                                        onChange={e => setEditInfo({ ...editInfo, rackLocation: e.target.value })}
                                        className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:outline-none bg-slate-50/50"
                                      />
                                    </div>
                                  </div>

                                  <div>
                                    <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Deskripsi</label>
                                    <textarea
                                      value={editInfo.description}
                                      onChange={e => setEditInfo({ ...editInfo, description: e.target.value })}
                                      className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:outline-none bg-slate-50/50 h-20 resize-none"
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="flex gap-1.5 mt-2.5">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleSaveStock(product.id); }}
                                  className="flex-1 bg-pink-600 hover:bg-pink-700 text-white font-bold p-1.5 rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-center gap-1"
                                >
                                  <Save className="h-3 w-3" />
                                  Simpan Alokasi WMS
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setEditingProductId(null); }}
                                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 p-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                                >
                                  Batal
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="grid grid-cols-2 gap-2 mt-1.5">
                                {product.variants.map(v => {
                                  const phys = v.physicalStock !== undefined ? v.physicalStock : v.stock;
                                  const rsv = v.reservedStock || 0;
                                  const avl = phys - rsv;
                                  const dmg = v.damagedStock || 0;
                                  const trn = v.transitStock || 0;
                                  const qch = v.qcHold || 0;

                                  return (
                                    <div 
                                      key={v.size} 
                                      className={`p-2 rounded-xl border text-left flex flex-col justify-between shadow-3xs transition-all hover:bg-slate-50/50 ${
                                        avl < 5 
                                          ? "bg-rose-50/60 border-rose-100 text-rose-850" 
                                          : "bg-white border-slate-200 text-slate-700"
                                      }`}
                                    >
                                      <div className="flex justify-between items-center pb-1 border-b border-slate-100 mb-1.5">
                                        <span className="text-[10px] font-sans font-black text-slate-500 uppercase tracking-wide">{v.size}</span>
                                        <span className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded-full ${
                                          avl < 5 
                                            ? "bg-rose-100 text-rose-700" 
                                            : "bg-emerald-100 text-emerald-800"
                                        }`}>
                                          Sedia: {avl}
                                        </span>
                                      </div>
                                      
                                      <div className="grid grid-cols-2 gap-x-1.5 gap-y-0.5 text-[8.5px] text-slate-500 font-mono leading-tight">
                                        <div>Fisik: <strong className="text-slate-700 font-extrabold">{phys}</strong></div>
                                        <div className={rsv > 0 ? "text-amber-600.font-bold" : ""}>Booked: <strong className={rsv > 0 ? "text-amber-700 font-extrabold font-mono" : "text-slate-700 font-bold"}>{rsv}</strong></div>
                                        {dmg > 0 ? <div className="text-rose-600">Rijek: <strong className="text-rose-750 font-extrabold">{dmg}</strong></div> : null}
                                        {trn > 0 ? <div className="text-blue-600">Transit: <strong className="text-blue-750 font-extrabold">{trn}</strong></div> : null}
                                        {qch > 0 ? <div className="text-indigo-600">QC: <strong className="text-indigo-750 font-extrabold">{qch}</strong></div> : null}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {(() => {
                                const os = product.variants.find(v => v.size === "One Size");
                                if (!os || (!os.lingkarDada && !os.lingkarPinggang && !os.lingkarPaha)) return null;
                                return (
                                  <div className="mt-2.5 pt-2 border-t border-dashed border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500 bg-pink-50/25 px-2 py-1 rounded-md">
                                    <span className="font-extrabold text-pink-700 text-[9px] uppercase tracking-wide">Dimensi OS:</span>
                                    <div className="flex gap-2 font-mono text-[9px]">
                                      {os.lingkarDada ? <span>LD: <strong className="text-slate-800 font-bold">{os.lingkarDada}</strong></span> : null}
                                      {os.lingkarPinggang ? <span>LP: <strong className="text-slate-800 font-bold">{os.lingkarPinggang}</strong></span> : null}
                                      {os.lingkarPaha ? <span>LPh: <strong className="text-slate-800 font-bold">{os.lingkarPaha}</strong></span> : null}
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                        </div>

                        {!isEditingThis && (
                          <div className="pt-2 flex gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); startEditing(product); }}
                              className="flex-1 text-center bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-lg text-xs transition-colors border border-slate-200/50 cursor-pointer flex items-center justify-center gap-1"
                            >
                              <Edit className="h-3.5 w-3.5 text-pink-600" />
                              Update / Opname Stok Varian
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteProduct(product.id);
                              }}
                              className={`px-3 py-2 rounded-lg text-xs transition-all border flex items-center justify-center gap-1.5 font-bold cursor-pointer ${
                                deleteConfirmId === product.id
                                  ? "bg-red-600 text-white border-red-600 animate-pulse"
                                  : "bg-red-50 hover:bg-red-100 text-red-600 border-red-200"
                              }`}
                              title={deleteConfirmId === product.id ? "Klik sekali lagi untuk menghapus" : "Hapus dari katalog"}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              {deleteConfirmId === product.id && <span className="text-[10px]">Yakin?</span>}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }}
              />
            )}
          </div>

          {/* Virtual scrolling handles pagination internally by not needing it */}
        </>
      )}

      {activeCatalogTab === "riwayat" && (
        /* Stock History Log */
        <div className="bg-white p-6 rounded-2xl border border-pink-100 shadow-xs">
          <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Log Historis Perubahan Stok</h3>
              <p className="text-xs text-slate-400">Jajak rekam audit keluar-masuk barang pergudangan Jassinta Atelier secara terperinci.</p>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">Terekam: {stockHistory.length} entri</span>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="text-left text-slate-400 text-xs font-semibold border-b border-slate-100 pb-2 bg-slate-50">
                  <th className="p-3 font-medium">Tanggal</th>
                  <th className="p-3 font-medium">SKU</th>
                  <th className="p-3 font-medium">Produk</th>
                  <th className="p-3 font-medium text-center">Varian</th>
                  <th className="p-3 font-medium text-center">Jumlah</th>
                  <th className="p-3 font-medium text-center">Tipe</th>
                  <th className="p-3 font-medium">Keterangan</th>
                  <th className="p-3 font-medium">Operator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {stockHistory.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-mono text-[10.5px] text-slate-500">
                      {new Date(log.date).toLocaleString("id-ID")}
                    </td>
                    <td className="p-3 font-mono font-bold text-pink-600">{log.productSku}</td>
                    <td className="p-3 font-medium max-w-xs truncate">{log.productName}</td>
                    <td className="p-3 text-center">
                      <span className="p-1 bg-slate-100 rounded-sm font-mono text-[10px] font-bold">
                        {log.variantSize} - {log.variantColor}
                      </span>
                    </td>
                    <td className="p-3 text-center font-bold font-mono">
                      <span className={log.changeQty > 0 ? "text-emerald-600" : "text-rose-600"}>
                        {log.changeQty > 0 ? `+${log.changeQty}` : log.changeQty}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        log.type === "Restok" ? "bg-emerald-100 text-emerald-800" :
                        log.type === "Penjualan" ? "bg-blue-100 text-blue-800" :
                        log.type === "Opname" ? "bg-amber-100 text-amber-800" :
                        log.type === "Rijek" ? "bg-red-100 text-red-800" :
                        "bg-indigo-100 text-indigo-800"
                      }`}>
                        {log.type}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600 select-all max-w-[200px] truncate" title={log.notes}>
                      {log.notes}
                    </td>
                    <td className="p-3 font-medium text-slate-500">{log.operator}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeCatalogTab === "kalkulator" && (
        <div className="bg-white p-6 rounded-2xl border border-pink-100 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <Calculator className="h-5 w-5 text-pink-600" />
              Kalkulator Harga Jual Profesional Jassinta Atelier
            </h3>
            <p className="text-xs text-slate-400">
              Analisis struktur harga produk dengan memperhitungkan biaya produksi, logistik supplier, biaya admin e-commerce, biaya packing, dan target keuntungan bersih (net profit margin).
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Input Form Column */}
            <div className="lg:col-span-7 bg-slate-50/50 p-6 rounded-2xl border border-slate-100 space-y-4">
              <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-2">Konfigurasi Komponen Biaya</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center justify-between">
                    <span>Biaya Produksi / COGS (HPP):</span>
                    <span className="text-[10px] text-slate-400 font-normal">Harga dasar dari konveksi</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-semibold text-slate-400">Rp</span>
                    <input
                      type="number"
                      value={calcCOGS}
                      onChange={e => setCalcCOGS(Number(e.target.value))}
                      className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-pink-500 text-slate-700 font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center justify-between">
                    <span>Ongkir Supplier & Cargo:</span>
                    <span className="text-[10px] text-slate-400 font-normal text-slate-500">Biaya kirim per item</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-semibold text-slate-400">Rp</span>
                    <input
                      type="number"
                      value={calcShipping}
                      onChange={e => setCalcShipping(Number(e.target.value))}
                      className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-pink-500 text-slate-700 font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center justify-between">
                    <span>Biaya Pengemasan (Packing):</span>
                    <span className="text-[10px] text-slate-400 font-normal font-sans">Polymailer, ziplock, label tag</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-semibold text-slate-400">Rp</span>
                    <input
                      type="number"
                      value={calcPackaging}
                      onChange={e => setCalcPackaging(Number(e.target.value))}
                      className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-pink-500 text-slate-700 font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center justify-between">
                    <span>Biaya Operasional & Iklan:</span>
                    <span className="text-[10px] text-slate-400 font-normal">Marketing fee per unit</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-semibold text-slate-400">Rp</span>
                    <input
                      type="number"
                      value={calcOther}
                      onChange={e => setCalcOther(Number(e.target.value))}
                      className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-pink-500 text-slate-700 font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center justify-between">
                    <span>Komisi & Fee Admin (%):</span>
                    <span className="text-[10px] text-slate-400 font-normal text-slate-500">Potongan ecommerce</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={calcAdminPercent}
                      onChange={e => setCalcAdminPercent(Number(e.target.value))}
                      className="w-full pr-8 pl-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-pink-500 text-slate-700 font-mono font-bold"
                    />
                    <span className="absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-400">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center justify-between">
                    <span>Target Margin Keuntungan (%):</span>
                    <span className="text-[10px] text-slate-400 font-normal text-slate-500">Net profit margin target</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={calcMarginPercent}
                      onChange={e => setCalcMarginPercent(Number(e.target.value))}
                      className="w-full pr-8 pl-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-pink-500 text-slate-700 font-mono font-bold"
                    />
                    <span className="absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-400">%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Calculations & Summary Output Column */}
            <div className="lg:col-span-5 border border-pink-100 rounded-2xl bg-gradient-to-br from-pink-50/20 to-white p-6 flex flex-col justify-between">
              <div className="space-y-4">
                <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Hasil Analisis Keuangan</h4>
                
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-100 text-slate-600">
                    <span>HPP/Modal Produksi Dasar:</span>
                    <span className="font-mono font-bold">Rp {calcCOGS.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-100 text-slate-600">
                    <span>Overhead (Ongkir + Packing + Iklan):</span>
                    <span className="font-mono font-bold">Rp {(calcShipping + calcPackaging + calcOther).toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100 font-semibold text-slate-800">
                    <span>Total HPP Bersih (Modal Pokok):</span>
                    <span className="font-mono font-extrabold text-slate-900">Rp {(calcCOGS + calcShipping + calcPackaging + calcOther).toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-100 text-slate-600">
                    <span>Estimasi Potongan Admin ({calcAdminPercent}%):</span>
                    <span className="font-mono text-rose-600 font-semibold">
                      Rp {(() => {
                        const totalModal = calcCOGS + calcShipping + calcPackaging + calcOther;
                        const factor = calcMarginPercent + calcAdminPercent >= 100 ? 99 : calcMarginPercent + calcAdminPercent;
                        const recommended = Math.round(totalModal / (1 - factor / 100));
                        return Math.round(recommended * (calcAdminPercent / 100)).toLocaleString("id-ID");
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-100 text-slate-600">
                    <span>Estimasi Keuntungan Bersih ({calcMarginPercent}%):</span>
                    <span className="font-mono text-emerald-600 font-bold">
                      Rp {(() => {
                        const totalModal = calcCOGS + calcShipping + calcPackaging + calcOther;
                        const factor = calcMarginPercent + calcAdminPercent >= 100 ? 99 : calcMarginPercent + calcAdminPercent;
                        const recommended = Math.round(totalModal / (1 - factor / 100));
                        return Math.round(recommended * (calcMarginPercent / 100)).toLocaleString("id-ID");
                      })()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-100 space-y-4">
                <div className="bg-pink-600 text-white p-4 rounded-xl text-center space-y-1">
                  <p className="text-[9.5px] uppercase tracking-wider font-semibold opacity-90">Harga Jual Minimum yang Disarankan</p>
                  <p className="text-xl font-mono font-extrabold text-white">
                    Rp {(() => {
                      const totalModal = calcCOGS + calcShipping + calcPackaging + calcOther;
                      const factor = calcMarginPercent + calcAdminPercent >= 100 ? 99 : calcMarginPercent + calcAdminPercent;
                      return Math.round(totalModal / (1 - factor / 100)).toLocaleString("id-ID");
                    })()}
                  </p>
                </div>

                <div className="text-[10.5px] text-slate-400 bg-slate-50 p-3 rounded-lg leading-relaxed">
                  💡 <b>Strategi Harga Coret:</b> Anda direkomendasikan untuk memasang harga normal sebesar <b className="text-slate-700">Rp {(() => {
                    const totalModal = calcCOGS + calcShipping + calcPackaging + calcOther;
                    const factor = calcMarginPercent + calcAdminPercent >= 100 ? 99 : calcMarginPercent + calcAdminPercent;
                    const recommended = Math.round(totalModal / (1 - factor / 100));
                    return Math.round(recommended * 1.25).toLocaleString("id-ID");
                  })()}</b> di Shopee/Tokopedia, lalu terapkan nominal diskon promo senilai <b className="text-pink-600">Rp {(() => {
                    const totalModal = calcCOGS + calcShipping + calcPackaging + calcOther;
                    const factor = calcMarginPercent + calcAdminPercent >= 100 ? 99 : calcMarginPercent + calcAdminPercent;
                    return Math.round(totalModal / (1 - factor / 100)).toLocaleString("id-ID");
                  })()}</b> untuk meningkatkan konversi pemasaran.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <QrCode className="h-4 w-4 text-pink-600" />
                QR Code Produk
              </h3>
              <button onClick={() => setShowQrModal(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-8 flex flex-col items-center justify-center text-center space-y-4 bg-white">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm inline-block">
                <QRCode
                  value={showQrModal.sku}
                  size={180}
                  level="H"
                  fgColor="#0f172a" /* slate-900 */
                />
              </div>
              
              <div>
                <h4 className="font-bold text-slate-800">{showQrModal.name}</h4>
                <p className="font-mono text-sm text-pink-600 font-bold tracking-widest mt-1 uppercase">
                  {showQrModal.sku}
                </p>
                <div className="mt-2 text-xs text-slate-500 font-medium bg-slate-100 px-3 py-1 rounded-full inline-block">
                  Lokasi: {showQrModal.rackLocation}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100">
              <button
                onClick={() => {
                  /* Basic print logic for QR (or alert that it would print) */
                  window.print();
                }}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cetak / Print QR Code
              </button>
              <p className="text-[10px] text-slate-400 text-center mt-3 leading-tight">
                Gunakan scanner barcode atau smartphone untuk memindai kode ini dan menarik data produk di menu kasir/opname.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Print Container */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-label-container, #print-label-container * {
            visibility: visible;
          }
          #print-label-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100vw;
            display: block !important;
            background: white;
            z-index: 9999;
          }
          .print-page {
            width: 100vw;
            height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            page-break-after: always;
            box-sizing: border-box;
            background: white;
          }
        }
      `}</style>
      
      {printProducts && printProducts.length > 0 && (
        <div id="print-label-container" className="hidden print:block">
          {printProducts.map((product, idx) => (
            <div key={`${product.id}-${idx}`} className="print-page p-8 text-center bg-white">
              <QRCode
                value={product.sku}
                size={160}
                level="H"
                fgColor="#000000"
              />
              <h2 className="mt-6 font-bold text-lg text-slate-900 uppercase tracking-wide">{product.name}</h2>
              <p className="font-mono text-2xl text-slate-900 font-extrabold tracking-widest mt-2">{product.sku}</p>
              <p className="text-sm font-medium text-slate-600 border border-slate-300 px-4 py-1.5 rounded-full mt-4">
                Rak: {product.rackLocation}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
