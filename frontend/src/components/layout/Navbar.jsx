import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../features/auth/authStore";
import { getNotificationsApi } from "../../features/tournaments/tournamentApi";

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [menuOpen, setMenuOpen]   = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Polling léger pour le badge notifications
  useEffect(() => {
    if (!user) return;
    const fetch = () => {
      getNotificationsApi()
        .then((r) => {
          const notifs = r.data?.notifications || [];
          setUnreadCount(notifs.filter((n) => !n.is_read).length);
        })
        .catch(() => {});
    };
    fetch();
    const interval = setInterval(fetch, 60_000);
    return () => clearInterval(interval);
  }, [user, location.pathname]); // re-fetch quand on change de page

  const handleLogout = () => { logout(); navigate("/login"); };

  const links = [
    { to: "/",            label: "🏠 Accueil"    },
    { to: "/tournaments", label: "🏆 Tournois"   },
    { to: "/leaderboard", label: "📊 Classement" },
    { to: "/matchmaking", label: "📍 Match"      },
    { to: "/games",       label: "🎮 Jeux"       },
  ];

  const isActive = (to) =>
    to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);

  return (
    <nav
      style={{ borderBottom: "1px solid #1E293B", background: "rgba(15,23,42,0.95)", backdropFilter: "blur(12px)" }}
      className="sticky top-0 z-40"
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">

          {/* Logo */}
          <Link to="/" className="font-bold text-xl flex-shrink-0" style={{ fontFamily: "Poppins, sans-serif" }}>
            <span style={{ background: "linear-gradient(135deg,#7C3AED,#06B6D4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              JGAME
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {links.map((l) => (
              <Link key={l.to} to={l.to}
                className={`px-3 py-1.5 rounded-xl text-sm transition-all ${
                  isActive(l.to) ? "bg-purple-500/20 text-purple-300 font-medium" : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}>
                {l.label}
              </Link>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">

            {/* Cloche avec badge */}
            <Link to="/notifications" className="relative w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-lg">
              🔔
              {unreadCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-white font-bold"
                  style={{ fontSize: 10, background: "#EF4444", padding: "0 4px" }}
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>

            {user?.role === "admin" && (
              <Link to="/admin"
                className="hidden md:flex px-3 py-1.5 rounded-xl text-xs font-medium border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all">
                ⚙️ Admin
              </Link>
            )}

            <Link to={`/profile/${user?.id}`}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm hover:scale-105 transition-transform flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#7C3AED,#06B6D4)" }}>
              {user?.username?.[0]?.toUpperCase()}
            </Link>

            <button onClick={handleLogout}
              className="hidden md:flex px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-all">
              Déco
            </button>

            <button onClick={() => setMenuOpen((o) => !o)}
              className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-lg">
              {menuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{ borderTop: "1px solid #1E293B", background: "#0F172A" }} className="md:hidden px-4 py-3 space-y-1">
          {links.map((l) => (
            <Link key={l.to} to={l.to} onClick={() => setMenuOpen(false)}
              className={`block px-3 py-2.5 rounded-xl text-sm transition-all ${
                isActive(l.to) ? "bg-purple-500/20 text-purple-300 font-medium" : "text-slate-400 hover:text-white"
              }`}>
              {l.label}
            </Link>
          ))}
          <Link to="/notifications" onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white">
            🔔 Notifications
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 font-bold">{unreadCount}</span>
            )}
          </Link>
          {user?.role === "admin" && (
            <Link to="/admin" onClick={() => setMenuOpen(false)} className="block px-3 py-2.5 rounded-xl text-sm text-red-400">
              ⚙️ Admin
            </Link>
          )}
          <button onClick={handleLogout} className="block w-full text-left px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white">
            Déconnexion
          </button>
        </div>
      )}
    </nav>
  );
}