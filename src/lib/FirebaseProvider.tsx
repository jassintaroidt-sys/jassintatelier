import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { 
  onSnapshot, 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  addDoc,
  serverTimestamp,
  getDocs,
  writeBatch
} from "firebase/firestore";
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut, 
  User,
  signInWithPopup,
  GoogleAuthProvider
} from "firebase/auth";
import { db, auth } from "./firebase";
import { Product, Order, StockHistory, Transaction, Karyawan } from "../types";

// Operation Types for error handling
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // We can also show a toast here if we had one
}

interface FirebaseContextType {
  user: User | null | any;
  loading: boolean;
  products: Product[];
  orders: Order[];
  stockHistory: StockHistory[];
  transactions: Transaction[];
  karyawanList: Karyawan[];
  auditLogs: any[];
  brandSettings: any;
  categories: string[];
  
  // Actions
  logout: () => Promise<void>;
  loginLocally: (email: string) => void;
  updateProducts: (newProducts: Product[]) => Promise<void>;
  updateOrders: (newOrders: Order[]) => Promise<void>;
  updateStockHistory: (newHistory: StockHistory[]) => Promise<void>;
  updateTransactions: (newTransactions: Transaction[]) => Promise<void>;
  updateKaryawan: (newList: Karyawan[]) => Promise<void>;
  updateAuditLogs: (logs: any[]) => Promise<void>;
  updateBrandSettings: (settings: any) => Promise<void>;
  updateCategories: (categories: string[]) => Promise<void>;
  
  // Singular setters for more granular control (better for Firestore)
  upsertProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  upsertOrder: (order: Order) => Promise<void>;
  addTransaction: (tx: Transaction) => Promise<void>;
  addStockHistory: (history: StockHistory) => Promise<void>;
  addAuditLog: (log: any) => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stockHistory, setStockHistory] = useState<StockHistory[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [karyawanList, setKaryawanList] = useState<Karyawan[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [brandSettings, setBrandSettings] = useState({
    company_name: "Jassinta Atelier",
    logo_symbol: "🌸",
    bgColorPreset: "pink"
  });
  const [categories, setCategories] = useState<string[]>(["Gamis", "Blouse", "Tunik", "Kulot", "Hijab", "Aksesori", "Cardigan", "Rompi", "Celana", "One Set", "Dress", "Outer"]);

  // Static Login State (Local fallback)
  const [sessionUser, setSessionUser] = useState<any>(null);
  
  // Auth Status
  useEffect(() => {
    // Check localStorage for local session first
    const localSession = localStorage.getItem("jassinta_session");
    if (localSession) {
      try {
        setSessionUser(JSON.parse(localSession));
      } catch (e) {
        localStorage.removeItem("jassinta_session");
      }
    }

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      // Only set firebase user if we don't have a local session priority
      if (!localStorage.getItem("jassinta_session")) {
        setUser(u);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Real-time Collections
  useEffect(() => {
    const unsubs: (() => void)[] = [];
    const currentUser = sessionUser || user;

    // Collections
    unsubs.push(onSnapshot(collection(db, "products"), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, "products")));

    unsubs.push(onSnapshot(doc(db, "settings", "brand"), (snapshot) => {
      if (snapshot.exists()) {
        setBrandSettings(snapshot.data());
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, "settings/brand")));

    unsubs.push(onSnapshot(doc(db, "settings", "categories"), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && data.list) setCategories(data.list);
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, "settings/categories")));

    unsubs.push(onSnapshot(collection(db, "orders"), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setOrders(list.sort((a, b) => b.date.localeCompare(a.date)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, "orders")));

    unsubs.push(onSnapshot(collection(db, "stockHistory"), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StockHistory));
      setStockHistory(list.sort((a, b) => (b.date || "").localeCompare(a.date || "")));
    }, (err) => handleFirestoreError(err, OperationType.LIST, "stockHistory")));

    unsubs.push(onSnapshot(collection(db, "transactions"), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(list.sort((a, b) => (b.date || "").localeCompare(a.date || "")));
    }, (err) => handleFirestoreError(err, OperationType.LIST, "transactions")));

    unsubs.push(onSnapshot(collection(db, "karyawan"), (snapshot) => {
      setKaryawanList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Karyawan)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, "karyawan")));

    unsubs.push(onSnapshot(collection(db, "auditLogs"), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAuditLogs(list.sort((a: any, b: any) => (b.timestamp || "").localeCompare(a.timestamp || "")));
    }, (err) => handleFirestoreError(err, OperationType.LIST, "auditLogs")));

    return () => unsubs.forEach(unsub => unsub());
  }, [user, sessionUser]);

  // Actions
  const logout = async () => {
    localStorage.removeItem("jassinta_session");
    setSessionUser(null);
    await signOut(auth);
  };

  const loginLocally = (email: string) => {
    const mockUser = {
      email,
      uid: "local-admin",
      displayName: "Jassinta Admin (Local)"
    };
    localStorage.setItem("jassinta_session", JSON.stringify(mockUser));
    setSessionUser(mockUser);
  };

  // Helper for batch or bulk updates (Mapping old state-based updates to Firestore)
  // In a real app, we'd avoid passing the whole array, but for quick migration we'll handle it
  const updateProducts = async (value: Product[] | ((prev: Product[]) => Product[])) => {
    try {
      const newProducts = typeof value === 'function' ? value(products) : value;
      // For each product, upsert
      for (const p of newProducts) {
        await setDoc(doc(db, "products", p.id), p);
      }
    } catch (err) { handleFirestoreError(err, OperationType.WRITE, "products"); }
  };

  const upsertProduct = async (product: Product) => {
    try {
      await setDoc(doc(db, "products", product.id), product);
    } catch (err) { handleFirestoreError(err, OperationType.WRITE, "products"); }
  };

  const deleteProduct = async (id: string) => {
    try {
      await deleteDoc(doc(db, "products", id));
    } catch (err) { handleFirestoreError(err, OperationType.WRITE, "products"); }
  };

  const updateOrders = async (value: Order[] | ((prev: Order[]) => Order[])) => {
    const newOrders = typeof value === 'function' ? value(orders) : value;
    for (const o of newOrders) {
      await setDoc(doc(db, "orders", o.id), o);
    }
  };

  const upsertOrder = async (order: Order) => {
    try {
      await setDoc(doc(db, "orders", order.id), order);
    } catch (err) { handleFirestoreError(err, OperationType.WRITE, "orders"); }
  };

  const updateStockHistory = async (value: StockHistory[] | ((prev: StockHistory[]) => StockHistory[])) => {
    const newHistory = typeof value === 'function' ? value(stockHistory) : value;
    for (const h of newHistory) {
      await setDoc(doc(db, "stockHistory", h.id), h);
    }
  };

  const addStockHistory = async (history: StockHistory) => {
    try {
      await setDoc(doc(db, "stockHistory", history.id), history);
    } catch (err) { handleFirestoreError(err, OperationType.WRITE, "stockHistory"); }
  };

  const updateTransactions = async (value: Transaction[] | ((prev: Transaction[]) => Transaction[])) => {
    const newTransactions = typeof value === 'function' ? value(transactions) : value;
    for (const t of newTransactions) {
      await setDoc(doc(db, "transactions", t.id), t);
    }
  };

  const addTransaction = async (tx: Transaction) => {
    try {
      await setDoc(doc(db, "transactions", tx.id), tx);
    } catch (err) { handleFirestoreError(err, OperationType.WRITE, "transactions"); }
  };

  const updateKaryawan = async (value: Karyawan[] | ((prev: Karyawan[]) => Karyawan[])) => {
    const newList = typeof value === 'function' ? value(karyawanList) : value;
    for (const k of newList) {
      await setDoc(doc(db, "karyawan", k.id), k);
    }
  };

  const updateAuditLogs = async (value: any[] | ((prev: any[]) => any[])) => {
    const newList = typeof value === 'function' ? value(auditLogs) : value;
    for (const l of newList) {
      await setDoc(doc(db, "auditLogs", l.id), l);
    }
  };

  const addAuditLog = async (log: any) => {
    try {
      await setDoc(doc(db, "auditLogs", log.id), log);
    } catch (err) { handleFirestoreError(err, OperationType.WRITE, "auditLogs"); }
  };

  const updateBrandSettings = async (settings: any) => {
    try {
      await setDoc(doc(db, "settings", "brand"), settings);
    } catch (err) { handleFirestoreError(err, OperationType.WRITE, "settings/brand"); }
  };

  const updateCategories = async (newList: string[]) => {
    try {
      await setDoc(doc(db, "settings", "categories"), { list: newList });
    } catch (err) { handleFirestoreError(err, OperationType.WRITE, "settings/categories"); }
  };

  return (
    <FirebaseContext.Provider value={{
      user: sessionUser || user,
      loading,
      products,
      orders,
      stockHistory,
      transactions,
      karyawanList,
      auditLogs,
      brandSettings,
      categories,
      logout,
      loginLocally,
      updateProducts,
      updateOrders,
      updateStockHistory,
      updateTransactions,
      updateKaryawan,
      updateAuditLogs,
      updateBrandSettings,
      updateCategories,
      upsertProduct,
      deleteProduct,
      upsertOrder,
      addTransaction,
      addStockHistory,
      addAuditLog
    }}>
      {children}
    </FirebaseContext.Provider>
  );
}

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error("useFirebase must be used within a FirebaseProvider");
  }
  return context;
};
