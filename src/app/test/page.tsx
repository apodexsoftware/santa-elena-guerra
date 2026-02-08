'use client';
import { useState } from 'react';

export default function PruebaWompiPage() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    amount: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Llamamos a NUESTRA API (la que creamos en el paso 2)
      const res = await fetch('/api/wompi/crear-link', {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.url) {
        // Si todo sale bien, redirigir a Wompi
        window.location.href = data.url;
      } else {
        alert('Error: ' + JSON.stringify(data));
      }

    } catch (error) {
      alert('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-blue-600">
          Prueba de Pagos Wompi
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Input Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Nombre Diócesis / Concepto</label>
            <input
              type="text"
              required
              className="mt-1 block w-full p-2 border border-gray-300 rounded text-black"
              placeholder="Ej: Parroquia San José"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          {/* Input Monto */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Monto a Pagar (COP)</label>
            <input
              type="number"
              required
              min="1500" // Wompi requiere mínimo ~1500 pesos
              className="mt-1 block w-full p-2 border border-gray-300 rounded text-black"
              placeholder="Ej: 50000"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            />
            <p className="text-xs text-gray-500 mt-1">* Mínimo $1.500 pesos</p>
          </div>

          {/* Botón */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-4 rounded font-bold text-white transition-colors
              ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {loading ? 'Generando Link...' : 'Pagar Ahora'}
          </button>

        </form>
      </div>
    </div>
  );
}