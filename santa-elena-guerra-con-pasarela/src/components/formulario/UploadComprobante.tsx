import { Camera } from "lucide-react";
import { UseFormRegister } from "react-hook-form";

export const UploadComprobante = ({ register, preview, error }: any) => (
  <div className="mt-8 pt-8 border-t border-slate-200 space-y-4">
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Soporte de Pago</p>
    <div className={`relative border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center transition-all ${preview ? 'border-indigo-500 bg-white' : 'border-slate-300 bg-slate-50 hover:bg-white hover:border-indigo-300'}`}>
      <input type="file" {...register("imagen")} className="absolute inset-0 opacity-0 cursor-pointer z-20" accept="image/*,application/pdf" />
      {preview ? (
        <div className="flex items-center gap-4">
          <img src={preview} className="h-20 w-20 object-cover rounded-xl shadow-md border-2 border-white" />
          <p className="text-xs font-bold text-slate-700">Comprobante cargado</p>
        </div>
      ) : (
        <div className="text-center text-slate-400">
          <Camera className="mx-auto mb-2" size={24} />
          <p className="text-[10px] font-black uppercase">Click para subir foto</p>
        </div>
      )}
    </div>
    {error && <p className="text-center text-red-500 text-[10px] font-bold uppercase">{error}</p>}
  </div>
);