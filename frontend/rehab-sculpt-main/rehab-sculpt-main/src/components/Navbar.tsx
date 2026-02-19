import { NavLink } from "@/components/NavLink";
import { useState, useEffect } from "react";

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

        <div className="flex items-center gap-8">
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
              activeClassName={scrolled
                ? "text-primary after:absolute after:bottom-[-18px] after:left-0 after:right-0 after:h-[2px] after:bg-primary after:content-['']"
                : "text-white after:absolute after:bottom-[-18px] after:left-0 after:right-0 after:h-[2px] after:bg-white after:content-['']"
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
