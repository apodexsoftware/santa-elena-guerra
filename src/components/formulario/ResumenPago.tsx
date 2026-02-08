import { DollarSign } from "lucide-react";

interface Props {
  resumen: { base: number; dto: number; hospedaje: number; total: number };
}

export const ResumenPago = ({ resumen }: Props) => (
  <div className="bg-[#f1f5f9] rounded-[2rem] p-8 border border-slate-200 animate-in fade-in slide-in-from-bottom-4">
    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
      <div className="flex items-center gap-5">
        <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-200">
          <DollarSign />
        </div>
        <div>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Total Pactado</p>
          <h3 className="text-4xl font-black text-slate-900">${resumen.total.toLocaleString()}</h3>
        </div>
      </div>
      <div className="flex gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-tighter text-right">
        <div className="flex flex-col"><span>Base</span><span className="text-slate-900">${resumen.base.toLocaleString()}</span></div>
        {resumen.dto > 0 && <div className="flex flex-col"><span>Dcto</span><span className="text-emerald-500">-${resumen.dto.toLocaleString()}</span></div>}
        {resumen.hospedaje > 0 && <div className="flex flex-col"><span>Hosp</span><span className="text-indigo-500">+${resumen.hospedaje.toLocaleString()}</span></div>}
      </div>
    </div>
  </div>
);