import { NavLink } from "@/components/NavLink";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, LogIn, UserCircle, Settings, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully.");
    navigate("/");
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-[10] transition-all duration-300 ${
        scrolled
          ? "bg-[hsl(214,16%,92%)]/90 backdrop-blur-md border-b border-border shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto flex h-14 items-center justify-between px-6">
        <NavLink
          to="/"
          className={`text-lg font-bold tracking-tight transition-colors duration-300 ${
            scrolled ? "text-foreground" : "text-white"
          }`}
          style={{ fontFamily: "'DM Serif Display', serif" }}
        >
          Rehab<span className={scrolled ? "text-primary" : "text-white/80"}>AI</span>
        </NavLink>

        <div className="flex items-center gap-6">
          {[
            { to: "/", label: "Home" },
            { to: "/session", label: "Session" },
            { to: "/progress", label: "Progress" },
          ].map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={`relative text-sm font-medium transition-colors duration-300 ${
                scrolled
                  ? "text-muted-foreground hover:text-foreground"
                  : "text-white/80 hover:text-white"
              }`}
              activeClassName={
                scrolled
                  ? "text-primary after:absolute after:bottom-[-18px] after:left-0 after:right-0 after:h-[2px] after:bg-primary after:content-['']"
                  : "text-white after:absolute after:bottom-[-18px] after:left-0 after:right-0 after:h-[2px] after:bg-white after:content-['']"
              }
            >
              {link.label}
            </NavLink>
          ))}

          {/* Auth / Profile */}
          {user ? (
            <ProfileDropdown scrolled={scrolled} onSignOut={handleSignOut} />
          ) : (
            <NavLink
              to="/login"
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors duration-300 ${
                scrolled
                  ? "text-muted-foreground hover:text-foreground"
                  : "text-white/80 hover:text-white"
              }`}
            >
              <LogIn className="h-4 w-4" />
              Log In
            </NavLink>
          )}
        </div>
      </div>
    </nav>
  );
};

// ─── Profile dropdown ─────────────────────────────────────────────────────────

function ProfileDropdown({
  scrolled,
  onSignOut,
}: {
  scrolled: boolean;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 text-sm font-medium transition-colors duration-300 ${
          scrolled
            ? "text-muted-foreground hover:text-foreground"
            : "text-white/80 hover:text-white"
        }`}
      >
        <UserCircle className="h-5 w-5" strokeWidth={1.5} />
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 rounded-xl border border-border bg-card shadow-lg overflow-hidden animate-fade-up z-50">
          <button
            onClick={() => {
              setOpen(false);
              navigate("/profile");
            }}
            className="flex w-full items-center gap-2.5 px-4 py-3 text-sm text-foreground hover:bg-muted/60 transition-colors"
          >
            <Settings className="h-4 w-4 text-muted-foreground" />
            Profile &amp; Settings
          </button>
          <div className="h-px bg-border" />
          <button
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
            className="flex w-full items-center gap-2.5 px-4 py-3 text-sm text-destructive hover:bg-muted/60 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

export default Navbar;
