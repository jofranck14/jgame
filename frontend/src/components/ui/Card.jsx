import { clsx } from "clsx";

export default function Card({ children, className, glow = false, ...props }) {
  return (
    <div
      className={clsx(
        "bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 backdrop-blur-sm",
        "transition-all duration-200",
        glow && "hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}