"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/clients";
import { useRouter } from "next/navigation";
import { Lock, Mail, Loader2, ArrowRight, Shield, Eye, EyeOff, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

// Colores EN CAR
const colors = {
  verde: "#009944",      // Letra E
  azul: "#1E5CAA",      // Letra N
  amarillo: "#FFF200",   // Llama
  rojo: "#ED1C24",       // Letra A / Llama
  rosa: "#EC008C",       // Letra R
  azulOscuro: "#1E2D69", // Banner texto
  rojoOscuro: "#B41919", // Cúpulas iglesia
  grisClaro: "#E6E7E8",  // Fondo texturizado
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();

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
        if (authError.message === "Invalid login credentials") {
          setError("Correo o contraseña incorrectos.");
        } else {
          setError(authError.message);
        }
        setLoading(false);
        return;
      }

      if (data.user) {
        router.refresh();
        router.push("/admin/inscripciones");
      }
    } catch (err) {
      setError("Error de conexión. Inténtalo de nuevo.");
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ backgroundColor: colors.azulOscuro }}
    >
      {/* Fondo decorativo sutil */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          background: `radial-gradient(circle at 20% 50%, ${colors.verde} 0%, transparent 50%),
                       radial-gradient(circle at 80% 50%, ${colors.azul} 0%, transparent 50%)`
        }}
      />

      {/* Logo Superior */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-8 left-8 z-10 flex items-center gap-3"
      >
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
          style={{ 
            background: `linear-gradient(135deg, ${colors.verde} 0%, ${colors.azul} 100%)`
          }}
        >
          <Shield className="text-white" size={20} />
        </div>

      </motion.div>

      {/* Card Principal */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10"
      >
        <div 
          className="rounded-2xl shadow-2xl overflow-hidden"
          style={{ backgroundColor: 'white' }}
        >
          {/* Header */}
          <div 
            className="p-8 text-center"
            style={{ 
              background: `linear-gradient(135deg, ${colors.azul} 0%, ${colors.azulOscuro} 100%)`
            }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 12 }}
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
              style={{ 
                background: `linear-gradient(135deg, ${colors.verde} 0%, ${colors.azul} 100%)`
              }}
            >
              <Lock className="text-white" size={28} />
            </motion.div>
            <h1 
              className="text-2xl font-bold text-white tracking-tight"
              style={{ color: 'white' }}
            >
              Bienvenido
            </h1>
            <p className="text-sm mt-1" style={{ color: colors.grisClaro }}>
              Ingresa tus credenciales de administrador
            </p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleLogin} className="p-8 space-y-5">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 p-3 rounded-lg text-sm"
                  style={{ 
                    backgroundColor: `${colors.rojo}15`,
                    color: colors.rojo 
                  }}
                >
                  <AlertTriangle size={16} />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <label 
                className="text-xs font-bold uppercase tracking-wider ml-1"
                style={{ color: colors.azulOscuro }}
              >
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail 
                  className="absolute left-3 top-1/2 -translate-y-1/2" 
                  size={18} 
                  style={{ color: colors.azulOscuro, opacity: 0.5 }}
                />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border focus:outline-none focus:ring-2 transition-all"
                  style={{ 
                    borderColor: colors.grisClaro,
                    color: colors.azulOscuro
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.azul;
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.azul}20`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = colors.grisClaro;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  placeholder="ejemplo@correo.com"
                  required 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label 
                className="text-xs font-bold uppercase tracking-wider ml-1"
                style={{ color: colors.azulOscuro }}
              >
                Contraseña
              </label>
              <div className="relative">
                <Lock 
                  className="absolute left-3 top-1/2 -translate-y-1/2" 
                  size={18} 
                  style={{ color: colors.azulOscuro, opacity: 0.5 }}
                />
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 rounded-lg border focus:outline-none focus:ring-2 transition-all"
                  style={{ 
                    borderColor: colors.grisClaro,
                    color: colors.azulOscuro
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.azul;
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.azul}20`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = colors.grisClaro;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  placeholder="••••••••"
                  required 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors hover:opacity-70"
                  style={{ color: colors.azulOscuro, opacity: 0.5 }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white font-bold py-3 rounded-lg mt-4 transition-all disabled:opacity-50 flex items-center justify-center gap-2 hover:shadow-lg"
              style={{ 
                background: `linear-gradient(135deg, ${colors.rojo} 0%, ${colors.rosa} 100%)`
              }}
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <span>ENTRAR AL SISTEMA</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <Link 
                href="/" 
                className="text-xs font-bold uppercase tracking-wider transition-colors hover:opacity-70"
                style={{ color: colors.azulOscuro }}
              >
                ← Volver al Portal Público
              </Link>
            </div>
          </form>
        </div>

        <p 
          className="mt-6 text-center text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2"
          style={{ color: colors.grisClaro, opacity: 0.7 }}
        >
          <Shield size={12} /> Acceso Restringido y Encriptado
        </p>
      </motion.div>
    </div>
  );
}