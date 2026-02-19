import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, X, ArrowRight } from "lucide-react";
import SkeletonBackground from "@/components/SkeletonBackground";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

const AuthModal = ({ open, onClose }: AuthModalProps) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Both login and signup close the auth modal (parent handles next step)
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[50] flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-foreground/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative z-[60] w-full max-w-md mx-4 animate-fade-up"
      >
        <SkeletonBackground />

        <div
          className="relative z-10 bg-card/95 backdrop-blur-md shadow-xl p-8"
          style={{ borderRadius: 14 }}
        >
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="text-center mb-6">
            <h2
              className="text-2xl font-bold text-foreground mb-1"
              style={{ fontFamily: "'DM Serif Display', serif" }}
            >
              {mode === "login" ? "Welcome back." : "Let's begin your recovery."}
            </h2>
            <p className="text-muted-foreground text-sm">
              {mode === "login"
                ? "Let's continue where you left off."
                : "Create an account to start your journey."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="modal-name">Full Name</Label>
                <Input
                  id="modal-name"
                  placeholder="Jane Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-11 bg-background border-border focus-visible:ring-accent"
                  style={{ borderRadius: 10 }}
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="modal-email">Email</Label>
              <Input
                id="modal-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 bg-background border-border focus-visible:ring-accent"
                style={{ borderRadius: 10 }}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="modal-password">Password</Label>
              <div className="relative">
                <Input
                  id="modal-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 bg-background border-border pr-11 focus-visible:ring-accent"
                  style={{ borderRadius: 10 }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-sm font-semibold tracking-wide transition-smooth"
              style={{ borderRadius: 10 }}
            >
              {mode === "login" ? "Resume Session" : "Continue"}
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-4">
            {mode === "login"
              ? "Recovery is a journey — consistency matters."
              : "Your information stays private and secure."}
          </p>

          <div className="mt-4 text-center">
            <span className="text-sm text-muted-foreground">
              {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            </span>
            <button
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              {mode === "login" ? "Create Account" : "Log In"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
