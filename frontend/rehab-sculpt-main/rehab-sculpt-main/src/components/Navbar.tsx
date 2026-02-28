import { NavLink } from "@/components/NavLink";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, LogIn } from "lucide-react";
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

          {/* Auth button */}
          {user ? (
            <button
              onClick={handleSignOut}
              aria-label="Sign out"
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors duration-300 ${
                scrolled
                  ? "text-muted-foreground hover:text-destructive"
                  : "text-white/80 hover:text-white"
              }`}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
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

export default Navbar;
