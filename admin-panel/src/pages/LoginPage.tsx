import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/store/auth";
import { ShieldCheck, Lock, Mail, Loader2, HeartPulse, ChevronRight } from "lucide-react";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      navigate("/");
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const [displayText, setDisplayText] = useState("");
  const fullText = "A1care Administrative Gateway";

  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      setDisplayText(fullText.substring(0, i));
      i++;
      if (i > fullText.length) clearInterval(timer);
    }, 500 / fullText.length);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#050b18] flex items-center justify-center p-6 relative overflow-hidden font-['Outfit']">
      {/* Dynamic Background */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none"></div>

      <div className="w-full max-w-[460px] space-y-10 relative z-10 animate-in fade-in duration-700">
        <header className="text-center space-y-6">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 animate-pulse"></div>
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(37,99,235,0.3)] relative group cursor-pointer transition-all duration-500 hover:scale-105 active:scale-95">
              <HeartPulse size={42} color="white" className="group-hover:rotate-12 transition-transform" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-5xl font-black tracking-tight text-white flex items-center justify-center gap-3">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-blue-400">System</span>
              <span className="text-blue-500">Access</span>
            </h1>
            <p className="text-slate-400 font-semibold tracking-[0.2em] text-xs uppercase opacity-80 h-4">
              {displayText}
              <span className="animate-pulse ml-0.5 inline-block w-1 h-3 bg-blue-500/60 align-middle"></span>
            </p>
          </div>
        </header>

        <div className="relative">
          {/* Card Border Glow */}
          <div className="absolute -inset-[1px] bg-gradient-to-b from-white/20 to-transparent rounded-[40px] pointer-events-none"></div>

          <form
            className="bg-[#0f172a]/40 backdrop-blur-[32px] border border-white/5 rounded-[40px] p-10 lg:p-12 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] space-y-8 relative overflow-hidden"
            onSubmit={onSubmit}
          >
            {/* Inner highlights */}
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Secure Identity</label>
                <div className="relative group">
                  <Mail size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors z-10" />
                  <input
                    placeholder="admin@a1care.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="off"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', color: 'white' }}
                    className="w-full h-14 !bg-white/5 border border-white/5 rounded-2xl !pl-[60px] pr-5 text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40 transition-all placeholder:text-slate-500 outline-none font-medium"
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Access Credentials</label>
                <div className="relative group">
                  <Lock size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors z-10" />
                  <input
                    placeholder="Enter your key"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', color: 'white' }}
                    className="w-full h-14 !bg-white/5 border border-white/5 rounded-2xl !pl-[60px] pr-5 text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40 transition-all placeholder:text-slate-500 outline-none font-medium"
                    required
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-xs font-bold text-center animate-in zoom-in duration-300">
                {error}
              </div>
            )}

            <button
              className="w-full h-15 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black rounded-2xl shadow-xl shadow-blue-900/40 flex items-center justify-center gap-3 transition-all active:scale-[0.98] group relative overflow-hidden"
              disabled={loading}
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              {loading ? (
                <Loader2 className="animate-spin" size={24} />
              ) : (
                <>
                  <span className="tracking-wide">Authorize Session</span>
                  <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            <div className="flex items-center gap-2.5 opacity-60 hover:opacity-100 transition-opacity cursor-help justify-center pt-4">
              <ShieldCheck size={16} className="text-blue-400" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Encrypted</span>
            </div>
          </form>
        </div>

        <footer className="text-center pt-4">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] opacity-40">© 2026 A1Care Global Operations</p>
        </footer>
      </div>
    </div>
  );
}

