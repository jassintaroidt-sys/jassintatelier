import React, { useState } from "react";
import { Lock, User, Sparkles } from "lucide-react";
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useFirebase } from "../lib/FirebaseProvider";

interface LoginViewProps {
  onLoginSuccess: () => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const { brandSettings, loginLocally } = useFirebase() as any;
  const [email, setEmail] = useState("jassintaatelier@gmail.com");
  const [password, setPassword] = useState("APtx4869#");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showConfigHelp, setShowConfigHelp] = useState(false);

  const getThemeClass = () => {
    switch (brandSettings.bgColorPreset) {
      case "gold":
        return {
          headerBg: "bg-amber-100 text-amber-800",
          button: "bg-amber-950 hover:bg-amber-900 shadow-amber-950/20",
          ring: "focus:ring-amber-500",
          text: "text-amber-600"
        };
      case "emerald":
        return {
          headerBg: "bg-emerald-100 text-emerald-800",
          button: "bg-emerald-700 hover:bg-emerald-800 shadow-emerald-500/20",
          ring: "focus:ring-emerald-500",
          text: "text-emerald-700"
        };
      case "stone":
        return {
          headerBg: "bg-stone-200 text-stone-800",
          button: "bg-stone-850 hover:bg-stone-900 shadow-stone-500/20",
          ring: "focus:ring-stone-500",
          text: "text-stone-750"
        };
      default: // pink
        return {
          headerBg: "bg-pink-100 text-pink-600",
          button: "bg-pink-600 hover:bg-pink-700 shadow-pink-500/30",
          ring: "focus:ring-pink-500",
          text: "text-pink-600"
        };
    }
  };

  const themeStyle = getThemeClass();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    // Check hardcoded credentials first
    if (email === "jassintaatelier@gmail.com" && password === "APtx4869#") {
      loginLocally(email);
      onLoginSuccess();
      setLoading(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      onLoginSuccess();
    } catch (err: any) {
      let errorMessage = "Login gagal. Pastikan email dan password benar.";
      
      if (err.code === "auth/operation-not-allowed") {
        errorMessage = "Error: Metode login Email/Password belum diaktifkan di Firebase Console.";
        setShowConfigHelp(true);
      } else if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        errorMessage = "Email atau password salah. Pastikan Anda sudah membuat User di Firebase Console dengan password yang tepat.";
        setShowConfigHelp(true);
      } else if (err.code === "auth/network-request-failed") {
        errorMessage = "Koneksi internet bermasalah. Periksa jaringan Anda.";
      } else {
        errorMessage = `Terjadi kesalahan: ${err.message} (${err.code})`;
      }
      
      setError(errorMessage);
      console.error("Firebase Auth Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      onLoginSuccess();
    } catch (err: any) {
      if (err.code === "auth/operation-not-allowed") {
        setError("Error: Metode login Google belum diaktifkan di Firebase Console.");
      } else {
        setError("Login Google gagal.");
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl overflow-hidden p-8">
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${themeStyle.headerBg} mb-4 animate-bounce overflow-hidden`}>
            {brandSettings.logo_img_base64 ? (
              <img src={brandSettings.logo_img_base64} className="h-full w-full object-contain p-2" alt="Logo" referrerPolicy="no-referrer" />
            ) : (
              <span className="text-2xl">{brandSettings.logo_symbol}</span>
            )}
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">{brandSettings.company_name}</h1>
          <p className="text-xs text-slate-500 mt-2 font-semibold">Sistem WMS Multi-Tenant Real-time v3.0</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100 text-center animate-pulse font-bold">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Email Administrator</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <User className="h-5 w-5" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 ${themeStyle.ring} focus:bg-white transition-all`}
                placeholder="Masukkan email"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="h-5 w-5" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 ${themeStyle.ring} focus:bg-white transition-all`}
                placeholder="Masukkan password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full ${themeStyle.button} text-white font-bold py-3.5 rounded-xl transition-colors shadow-lg flex justify-center items-center gap-2 mt-4 cursor-pointer disabled:opacity-50`}
          >
            {loading ? "Menghubungkan..." : "Masuk ke Sistem"} <Sparkles className="h-4 w-4" />
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-slate-50">
          <p className="text-[10px] text-center text-slate-400 mb-3 uppercase tracking-tighter font-bold">— ATAU GUNAKAN AKUN GOOGLE —</p>
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 font-bold py-3.5 rounded-xl transition-all shadow-sm flex justify-center items-center gap-3 cursor-pointer disabled:opacity-50"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
            Lanjutkan dengan Google
          </button>
          <p className="text-[9px] text-center text-slate-400 mt-2 italic px-4">
            (Pastikan Anda login ke Google dengan email <b>jassintaatelier@gmail.com</b>)
          </p>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-[10px] text-slate-300 font-medium tracking-widest uppercase">Master System Cloud Sync v3.0</p>
        </div>
      </div>
    </div>
  );
}
