import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, X, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import SkeletonBackground from "@/components/SkeletonBackground";
import { useAuth } from "@/contexts/AuthContext";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = z.object({
  fullName: z.string().min(2, "Name is required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;
type SignupForm = z.infer<typeof signupSchema>;

// ─── Component ────────────────────────────────────────────────────────────────

const AuthModal = ({ open, onClose }: AuthModalProps) => {
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });
  const signupForm = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  });

  if (!open) return null;

  const isSubmitting =
    loginForm.formState.isSubmitting || signupForm.formState.isSubmitting;

  const handleLoginSubmit = async (data: LoginForm) => {
    const { error } = await signIn(data.email, data.password);
    if (error) {
      const msg = error.message?.toLowerCase() ?? "";
      if (msg.includes("invalid login credentials") || msg.includes("invalid_credentials")) {
        toast.error("Incorrect email or password. Please try again.");
      } else if (msg.includes("email not confirmed")) {
        toast.error("Your email is not confirmed yet. Check your inbox for the confirmation link.");
      } else if (msg.includes("too many requests") || msg.includes("rate limit")) {
        toast.error("Too many login attempts. Please wait a moment and try again.");
      } else {
        toast.error(error.message || "Something went wrong. Please try again.");
      }
      return;
    }
    toast.success("Welcome back!");
    onClose(); // parent will open PreSessionCheckModal
  };

  const handleSignupSubmit = async (data: SignupForm) => {
    const { data: { user }, error } = await signUp(data.email, data.password);
    if (error) {
      toast.error(error.message);
      return;
    }
    // If email confirmation is enabled, identities will be empty
    const needsConfirmation = user && (!user.identities || user.identities.length === 0);
    if (!user || needsConfirmation) {
      toast.success("Account created! Please check your email to confirm before logging in.");
    } else {
      toast.success("Account created!");
    }
    onClose(); // parent will open OnboardingModal
  };

  const switchMode = () => {
    setMode((m) => (m === "login" ? "signup" : "login"));
    loginForm.reset();
    signupForm.reset();
  };

  return (
    <div className="fixed inset-0 z-[50] flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-foreground/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-[60] w-full max-w-md mx-4 animate-fade-up">
        <SkeletonBackground />

        <div
          className="relative z-10 bg-card/95 backdrop-blur-md shadow-xl p-8"
          style={{ borderRadius: 14 }}
        >
          <button
            aria-label="Close"
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

          {/* ── Login Form ─────────────────────────────────────── */}
          {mode === "login" && (
            <form
              onSubmit={loginForm.handleSubmit(handleLoginSubmit)}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="modal-email">Email</Label>
                <Input
                  id="modal-email"
                  type="email"
                  placeholder="you@example.com"
                  {...loginForm.register("email")}
                  className="h-11 bg-background border-border focus-visible:ring-accent"
                  style={{ borderRadius: 10 }}
                  disabled={isSubmitting}
                />
                {loginForm.formState.errors.email && (
                  <p className="text-xs text-destructive">
                    {loginForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="modal-password">Password</Label>
                <div className="relative">
                  <Input
                    id="modal-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    {...loginForm.register("password")}
                    className="h-11 bg-background border-border pr-11 focus-visible:ring-accent"
                    style={{ borderRadius: 10 }}
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    aria-label="Toggle password visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {loginForm.formState.errors.password && (
                  <p className="text-xs text-destructive">
                    {loginForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 text-sm font-semibold tracking-wide transition-smooth"
                style={{ borderRadius: 10 }}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Resume Session <ArrowRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </form>
          )}

          {/* ── Signup Form ────────────────────────────────────── */}
          {mode === "signup" && (
            <form
              onSubmit={signupForm.handleSubmit(handleSignupSubmit)}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="modal-name">Full Name</Label>
                <Input
                  id="modal-name"
                  placeholder="Jane Doe"
                  {...signupForm.register("fullName")}
                  className="h-11 bg-background border-border focus-visible:ring-accent"
                  style={{ borderRadius: 10 }}
                  disabled={isSubmitting}
                />
                {signupForm.formState.errors.fullName && (
                  <p className="text-xs text-destructive">
                    {signupForm.formState.errors.fullName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="modal-signup-email">Email</Label>
                <Input
                  id="modal-signup-email"
                  type="email"
                  placeholder="you@example.com"
                  {...signupForm.register("email")}
                  className="h-11 bg-background border-border focus-visible:ring-accent"
                  style={{ borderRadius: 10 }}
                  disabled={isSubmitting}
                />
                {signupForm.formState.errors.email && (
                  <p className="text-xs text-destructive">
                    {signupForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="modal-signup-password">Password</Label>
                <div className="relative">
                  <Input
                    id="modal-signup-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    {...signupForm.register("password")}
                    className="h-11 bg-background border-border pr-11 focus-visible:ring-accent"
                    style={{ borderRadius: 10 }}
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    aria-label="Toggle password visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {signupForm.formState.errors.password && (
                  <p className="text-xs text-destructive">
                    {signupForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 text-sm font-semibold tracking-wide transition-smooth"
                style={{ borderRadius: 10 }}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Continue <ArrowRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </form>
          )}

          <p className="text-center text-xs text-muted-foreground mt-4">
            {mode === "login"
              ? "Recovery is a journey — consistency matters."
              : "Your information stays private and secure."}
          </p>

          <div className="mt-4 text-center">
            <span className="text-sm text-muted-foreground">
              {mode === "login"
                ? "Don't have an account? "
                : "Already have an account? "}
            </span>
            <button
              onClick={switchMode}
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
