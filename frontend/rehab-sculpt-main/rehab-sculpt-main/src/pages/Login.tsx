import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import SkeletonBackground from "@/components/SkeletonBackground";
import { useAuth } from "@/contexts/AuthContext";

// ─── Schema ───────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

// ─── Component ────────────────────────────────────────────────────────────────

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);
  const [resending, setResending] = useState(false);
  const [lastEmail, setLastEmail] = useState("");
  const { signIn, resendConfirmation } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? "/";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const handleResendConfirmation = async () => {
    if (!lastEmail) return;
    setResending(true);
    const { error } = await resendConfirmation(lastEmail);
    setResending(false);
    if (error) {
      toast.error("Could not resend confirmation email. Please try again later.");
    } else {
      toast.success("Confirmation email sent! Check your inbox (and spam folder).");
    }
  };

  const onSubmit = async (data: LoginForm) => {
    setEmailNotConfirmed(false);
    setLastEmail(data.email);

    const { error } = await signIn(data.email, data.password);
    if (error) {
      const msg = error.message?.toLowerCase() ?? "";

      // Email not confirmed — show banner with resend option
      if (msg.includes("email not confirmed")) {
        setEmailNotConfirmed(true);
        toast.error("Please confirm your email before logging in.");
        return;
      }

      // Invalid credentials — could also be unconfirmed email (Supabase
      // sometimes returns "Invalid login credentials" for unconfirmed accounts)
      if (
        msg.includes("invalid login credentials") ||
        msg.includes("invalid_credentials")
      ) {
        setEmailNotConfirmed(true); // Show resend option just in case
        toast.error(
          "Invalid email or password. If you just signed up, you may need to confirm your email first."
        );
        return;
      }

      if (msg.includes("too many requests") || msg.includes("rate limit")) {
        toast.error("Too many attempts. Please wait a moment and try again.");
        return;
      }

      toast.error(error.message || "Something went wrong. Please try again.");
      return;
    }

    setEmailNotConfirmed(false);
    toast.success("Welcome back!");
    navigate(from, { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative">
      <SkeletonBackground />

      <div className="w-full max-w-md animate-fade-up relative z-10">
        <div className="text-center mb-8">
          <h1
            className="text-3xl font-bold text-foreground mb-2"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            Welcome back.
          </h1>
          <p className="text-muted-foreground text-sm">
            Let's continue where you left off.
          </p>
        </div>

        <div
          className="bg-card/80 backdrop-blur-sm border-0 shadow-lg p-8"
          style={{ borderRadius: 14 }}
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...register("email")}
                className="h-12 bg-background border-border focus-visible:ring-accent"
                style={{ borderRadius: 10 }}
                disabled={isSubmitting}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground font-medium">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  {...register("password")}
                  className="h-12 bg-background border-border pr-11 focus-visible:ring-accent"
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
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
              <div className="text-right">
                <Link
                  to="#"
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 text-sm font-semibold tracking-wide transition-smooth"
              style={{ borderRadius: 10 }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Resume Session"
              )}
            </Button>
          </form>

          {/* Email confirmation banner */}
          {emailNotConfirmed && (
            <div
              className="mt-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30"
              style={{ borderRadius: 10 }}
            >
              <MailCheck className="h-5 w-5 mt-0.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div className="flex-1 space-y-2">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  Email not confirmed
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Check your inbox (and spam folder) for the confirmation link we
                  sent to <strong>{lastEmail}</strong>.
                </p>
                <button
                  type="button"
                  onClick={handleResendConfirmation}
                  disabled={resending}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                >
                  {resending ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Resend confirmation email"
                  )}
                </button>
              </div>
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground mt-4">
            Recovery is a journey — consistency matters.
          </p>

          <div className="mt-5 text-center">
            <span className="text-sm text-muted-foreground">
              Don't have an account?{" "}
            </span>
            <Link
              to="/signup"
              className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
