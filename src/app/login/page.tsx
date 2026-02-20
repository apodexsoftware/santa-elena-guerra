"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/clients";
import { useRouter } from "next/navigation";
import { Lock, Mail, Loader2, ArrowRight, Shield, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Particles from "react-tsparticles";
import { loadFull } from "tsparticles";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();

  // Inicialización de partículas
  const particlesInit = async (main: any) => {
    await loadFull(main);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        // Manejo de errores amigable
        if (authError.message === "Invalid login credentials") {
          setError("Correo o contraseña incorrectos.");
        } else {
          setError(authError.message);
        }
        setLoading(false);
        return;
      }

      if (data.user) {
        // Forzamos la actualización de las cookies de sesión y redirigimos
        router.refresh();
        router.push("/admin/dashboard");
      }
    } catch (err) {
      setError("Error de conexión. Inténtalo de nuevo.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1E2D69] via-[#1E5CAA] to-[#1E2D69] flex items-center justify-center p-4 overflow-hidden relative">
      
      {/* Fondo de Partículas */}
      <div className="absolute inset-0 z-0">
        <Particles
          id="tsparticles"
          init={particlesInit}
          options={{
            background: { color: { value: "transparent" } },
            fpsLimit: 120,
            interactivity: {
              events: {
                onHover: { enable: true, mode: "repulse" },
                resize: true,
              },
            },
            particles: {
              color: { value: "#E6E7E8" }, // Gris Claro
              links: {
                color: "#009944", // Verde
                distance: 150,
                enable: true,
                opacity: 0.2,
                width: 1,
              },
              move: {
                enable: true,
                speed: 0.8,
                direction: "none",
                outModes: { default: "bounce" },
              },
              number: {
                density: { enable: true, area: 800 },
                value: 60,
              },
              opacity: { value: 0.3 },
              size: { value: { min: 1, max: 3 } },
            },
            detectRetina: true,
          }}
        />
      </div>

      {/* Glow Decorativo con Rosa y Amarillo */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[#EC008C]/10 via-transparent to-[#FFF200]/10 blur-3xl" />

      {/* Logo Superior */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-8 left-8 z-10 flex items-center gap-3"
      >
        <div className="w-10 h-10 bg-gradient-to-br from-[#009944] to-[#1E5CAA] rounded-xl flex items-center justify-center shadow-lg">
          <Shield className="text-white" size={20} />
        </div>
        <div className="hidden sm:block">
          <h2 className="text-lg font-bold text-white leading-none">AdminSecure</h2>
          <p className="text-xs text-[#E6E7E8]">Control Panel</p>
        </div>
      </motion.div>

      {/* Card Principal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md z-10"
      >
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden">
          
          {/* Header de la Card */}
          <div className="p-10 text-center border-b border-white/5 bg-white/5">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 12 }}
              className="w-20 h-20 bg-gradient-to-br from-[#009944] to-[#1E5CAA] rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-[#009944]/40"
            >
              <Lock className="text-white" size={32} />
            </motion.div>
            <h1 className="text-3xl font-black text-white tracking-tight uppercase italic">
              Bienvenido
            </h1>
            <p className="text-[#E6E7E8] text-sm mt-2 font-medium">
              Ingresa tus credenciales de administrador
            </p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleLogin} className="p-8 space-y-5">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-[#ED1C24]/10 border border-[#ED1C24]/20 text-[#ED1C24] p-4 rounded-2xl text-sm font-medium text-center"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#E6E7E8] uppercase tracking-[0.2em] ml-1">
                Correo Electrónico
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#E6E7E8] group-focus-within:text-[#009944] transition-colors" size={18} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#009944]/50 transition-all"
                  placeholder="ejemplo@correo.com"
                  required 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#E6E7E8] uppercase tracking-[0.2em] ml-1">
                Contraseña
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#E6E7E8] group-focus-within:text-[#009944] transition-colors" size={18} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#009944]/50 transition-all"
                  placeholder="••••••••"
                  required 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#E6E7E8] hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#ED1C24] to-[#EC008C] text-white font-black py-4 rounded-2xl mt-4 hover:shadow-xl hover:shadow-[#ED1C24]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <div className="flex items-center justify-center gap-2">
                {loading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    <span className="tracking-widest">ENTRAR AL SISTEMA</span>
                    <ArrowRight className="group-hover:translate-x-1 transition-transform" size={18} />
                  </>
                )}
              </div>
            </button>

            <div className="text-center pt-2">
              <Link 
                href="/" 
                className="text-[#E6E7E8] text-xs font-bold hover:text-[#FFF200] transition-colors uppercase tracking-widest"
              >
                ← Volver al Portal Público
              </Link>
            </div>
          </form>
        </div>

        <p className="mt-8 text-center text-[10px] text-[#E6E7E8] font-bold uppercase tracking-[0.3em] flex items-center justify-center gap-2">
          <Shield size={10} /> Acceso Restringido y Encriptado
        </p>
      </motion.div>
    </div>
  );
}