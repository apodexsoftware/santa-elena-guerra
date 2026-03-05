interface FormFieldProps {
  label: string;
  error?: string;
  children: React.ReactNode;
}

export const FormField = ({ label, error, children }: FormFieldProps) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">{label}</label>
    {children}
    {error && <p className="text-[10px] font-bold text-red-500 px-2 italic">{error}</p>}
  </div>
);