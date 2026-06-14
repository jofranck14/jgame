import { clsx } from "clsx";
import { forwardRef } from "react";

const Input = forwardRef(({ label, error, icon: Icon, className, ...props }, ref) => (
  <div className="w-full">
    {label && <label className="text-sm text-slate-400 mb-1 block">{label}</label>}
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />}
      <input
        ref={ref}
        className={clsx(
          "w-full bg-slate-900/80 border border-slate-700 rounded-xl py-3 text-white placeholder-slate-500",
          "focus:outline-none focus:border-purple-500 transition-colors",
          Icon ? "pl-10 pr-4" : "px-4",
          error && "border-danger",
          className
        )}
        {...props}
      />
    </div>
    {error && <p className="text-danger text-xs mt-1">{error}</p>}
  </div>
));

Input.displayName = "Input";
export default Input;