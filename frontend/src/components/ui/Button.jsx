import { clsx } from "clsx";

export default function Button({ children, variant = "primary", size = "md", className, ...props }) {
  const base = "font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary:  "text-white",
    outline:  "border border-slate-600 text-slate-300 hover:border-primary hover:text-primary bg-transparent",
    danger:   "bg-danger text-white hover:opacity-90",
    ghost:    "text-slate-400 hover:text-white hover:bg-slate-800 bg-transparent",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-5 py-2.5 text-sm",
    lg: "px-6 py-3 text-base",
  };

  const primaryStyle = variant === "primary"
    ? { background: "linear-gradient(135deg, #7C3AED, #06B6D4)" }
    : {};

  return (
    <button
      className={clsx(base, variants[variant], sizes[size], className)}
      style={primaryStyle}
      {...props}
    >
      {children}
    </button>
  );
}