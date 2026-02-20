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
  // { name: "Finanzas", href: "/admin/finanzas", icon: BadgeDollarSign },
  { name: "Jurisdicciones", href: "/admin/diocesis", icon: Map },
  // { name: "Roles", href: "/admin/roles", icon: UserCog },
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
    <nav className="bg-[#1E2D69] text-white sticky top-0 z-50 border-b border-[#E6E7E8]/5 backdrop-blur-md bg-[#1E2D69]/95">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo con Estilo */}
          <Link href="/admin/dashboard" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-[#009944] to-[#1E5CAA] rounded-xl flex items-center justify-center shadow-lg shadow-[#009944]/20 group-hover:rotate-6 transition-transform">
              <span className="font-black text-xl italic">S</span>
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-black tracking-tighter text-sm uppercase italic">Santa Helena</span>
              <span className="text-[10px] text-[#E6E7E8]/60 font-bold uppercase tracking-[0.2em]">Dashboard</span>
            </div>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-1 bg-[#E6E7E8]/5 p-1.5 rounded-2xl border border-[#E6E7E8]/5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href); // Cambio: startsWith para sub-rutas
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-tight transition-all ${
                    isActive 
                      ? "bg-[#009944] text-white shadow-xl shadow-[#009944]/30" 
                      : "text-[#E6E7E8]/70 hover:text-white hover:bg-[#009944]/20"
                  }`}
                >
                  <Icon size={16} strokeWidth={isActive ? 3 : 2} />
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* Perfil y Logout */}
          <div className="hidden md:flex items-center gap-6 border-l border-[#E6E7E8]/10 pl-6 ml-4">
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-[#E6E7E8]/60 uppercase tracking-widest">Conectado como</span>
                <span className="text-xs font-bold text-[#009944]">{userEmail?.split('@')[0]}</span>
              </div>
              <div className="w-10 h-10 bg-[#1E5CAA] rounded-full flex items-center justify-center border border-[#E6E7E8]/10">
                <User size={20} className="text-[#E6E7E8]" />
              </div>
            </div>

            <button 
              onClick={handleLogout}
              className="p-2 text-[#E6E7E8]/50 hover:text-[#ED1C24] hover:bg-[#ED1C24]/10 rounded-xl transition-all"
              title="Cerrar sesión"
            >
              <LogOut size={22} />
            </button>
          </div>

          {/* Mobile button */}
          <div className="md:hidden">
            <button 
              onClick={() => setIsOpen(!isOpen)} 
              className={`p-3 rounded-xl transition-all ${isOpen ? 'bg-[#ED1C24] text-white' : 'bg-[#E6E7E8]/10 text-[#E6E7E8]/70'}`}
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu con Animación */}
      {isOpen && (
        <div className="md:hidden bg-[#1E2D69] border-t border-[#E6E7E8]/5 p-4 space-y-2 animate-in slide-in-from-top duration-300">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-4 p-4 rounded-2xl font-black text-sm uppercase tracking-widest text-[#E6E7E8]/70 hover:bg-[#009944] hover:text-white transition-all"
            >
              <item.icon size={20} />
              {item.name}
            </Link>
          ))}
          <div className="pt-4 mt-4 border-t border-[#E6E7E8]/5">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl font-black text-sm uppercase tracking-widest text-[#ED1C24] bg-[#ED1C24]/10"
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