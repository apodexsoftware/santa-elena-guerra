import { useState } from 'react';
import { createClient } from '../utils/supabase/clients';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("Credenciales inválidas o error de conexión");
      setLoading(false);
      return;
    }

    // Si el login es exitoso, redirigimos al dashboard de admin
    router.push('/admin/dashboard'); 
    router.refresh();
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return { login, logout, loading, error };
}