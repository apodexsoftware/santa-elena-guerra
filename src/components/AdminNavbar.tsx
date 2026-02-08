"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/clients";
import { 
  LayoutDashboard, Users, BadgeDollarSign, Map, 
  UserCog, LogOut, Menu, X, User 
} from "lucide-react";

const navItems = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Inscripciones", href: "/admin/inscripciones", icon: Users },
  { name: "Finanzas", href: "/admin/finanzas", icon: BadgeDollarSign },
  { name: "Jurisdicciones", href: "/admin/diocesis", icon: Map },
  { name: "Roles", href: "/admin/roles", icon: UserCog },
  { name: "Eventos", href: "/admin/eventos", icon: UserCog },
];

export default function AdminNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const [userEmail, setUserEmail] = React.useState<string | null>(null);
  const supabase = createClient();

  // Obtener el usuario actual para mostrar en el perfil
  React.useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserEmail(user.email ?? "Admin");
    }
    getUser();
  }, []);

  // Lógica de Logout Real
  const handleLogout = async () => {
    const confirmLogout = confirm("¿Estás seguro de que deseas cerrar sesión?");
    if (!confirmLogout) return;

    const { error } = await supabase.auth.signOut();
    if (!error) {
      router.push("/login"); // Redirigir a la página de acceso
      router.refresh();
    } else {
      alert("Error al cerrar sesión");
    }
  };

  return (
    <nav className="bg-[#0f172a] text-white sticky top-0 z-50 border-b border-white/5 backdrop-blur-md bg-[#0f172a]/95">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo con Estilo */}
          <Link href="/admin/dashboard" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:rotate-6 transition-transform">
              <span className="font-black text-xl italic">S</span>
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-black tracking-tighter text-sm uppercase italic">Santa Helena</span>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Dashboard</span>
            </div>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-1 bg-white/5 p-1.5 rounded-2xl border border-white/5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href); // Cambio: startsWith para sub-rutas
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-tight transition-all ${
                    isActive 
                      ? "bg-white text-slate-900 shadow-xl shadow-white/10" 
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon size={16} strokeWidth={isActive ? 3 : 2} />
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* Perfil y Logout */}
          <div className="hidden md:flex items-center gap-6 border-l border-white/10 pl-6 ml-4">
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Conectado como</span>
                <span className="text-xs font-bold text-indigo-400">{userEmail?.split('@')[0]}</span>
              </div>
              <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center border border-white/10">
                <User size={20} className="text-slate-400" />
              </div>
            </div>

            <button 
              onClick={handleLogout}
              className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 rounded-xl transition-all"
              title="Cerrar sesión"
            >
              <LogOut size={22} />
            </button>
          </div>

          {/* Mobile button */}
          <div className="md:hidden">
            <button 
              onClick={() => setIsOpen(!isOpen)} 
              className={`p-3 rounded-xl transition-all ${isOpen ? 'bg-rose-500 text-white' : 'bg-white/5 text-slate-400'}`}
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu con Animación */}
      {isOpen && (
        <div className="md:hidden bg-[#0f172a] border-t border-white/5 p-4 space-y-2 animate-in slide-in-from-top duration-300">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-4 p-4 rounded-2xl font-black text-sm uppercase tracking-widest text-slate-400 hover:bg-indigo-600 hover:text-white transition-all"
            >
              <item.icon size={20} />
              {item.name}
            </Link>
          ))}
          <div className="pt-4 mt-4 border-t border-white/5">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl font-black text-sm uppercase tracking-widest text-rose-400 bg-rose-400/10"
            >
              <LogOut size={20} />
              Cerrar Sesión
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}