import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Eye, EyeOff, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import SkeletonBackground from "@/components/SkeletonBackground";

const TOTAL_STEPS = 5;

const INJURY_OPTIONS = [
  { label: "Knee", icon: "🦵" },
  { label: "Shoulder", icon: "💪" },
  { label: "Back", icon: "🔙" },
  { label: "Post-Surgery", icon: "🏥" },
  { label: "Other", icon: "➕" },
];

const CHALLENGE_OPTIONS = ["Bending", "Lifting", "Walking", "Reaching"];

const Signup = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [animating, setAnimating] = useState(false);
  const [visible, setVisible] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Step 1
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Step 2
  const [injuryType, setInjuryType] = useState("");

  // Step 3
  const [painLevel, setPainLevel] = useState([5]);

  // Step 4
  const [challenges, setChallenges] = useState<string[]>([]);

  // Step 5
  const [recoveryGoal, setRecoveryGoal] = useState("");

  const goTo = (next: number) => {
    if (animating) return;
    setDirection(next > step ? "forward" : "back");
    setAnimating(true);
    setVisible(false);
    setTimeout(() => {
      setStep(next);
      setVisible(true);
      setAnimating(false);
    }, 250);
  };

  const toggleChallenge = (item: string) => {
    setChallenges((prev) =>
      prev.includes(item) ? prev.filter((c) => c !== item) : [...prev, item]
    );
  };

  const handleSubmit = () => {
    setSubmitting(true);
    setTimeout(() => {
      navigate("/");
    }, 1800);
  };

  const transitionClass = visible
    ? "opacity-100 translate-x-0"
    : direction === "forward"
    ? "opacity-0 translate-x-6"
    : "opacity-0 -translate-x-6";

  const ProgressDots = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i + 1 === step
              ? "w-3 h-3 bg-primary"
              : i + 1 < step
              ? "w-2.5 h-2.5 bg-primary/40"
              : "w-2.5 h-2.5 bg-border"
          }`}
        />
      ))}
    </div>
  );

  if (submitting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background relative">
        <SkeletonBackground />
        <div className="relative z-10 text-center animate-fade-up">
          <div className="relative mx-auto w-16 h-16 mb-6">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            <div className="absolute inset-2 rounded-full bg-primary/30 animate-ping" style={{ animationDelay: "300ms" }} />
            <div className="absolute inset-4 rounded-full bg-primary flex items-center justify-center">
              <Loader2 className="h-5 w-5 text-primary-foreground animate-spin" />
            </div>
          </div>
          <h2
            className="text-2xl font-bold text-foreground mb-2"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            Preparing your plan...
          </h2>
          <p className="text-muted-foreground text-sm">
            We're customizing your rehabilitation journey.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 relative">
      <SkeletonBackground />

      <div className="w-full max-w-md relative z-10">
        <ProgressDots />

        <div
          className={`transition-all duration-250 ease-out ${transitionClass}`}
          style={{ transitionDuration: "250ms" }}
        >
          {/* ── Step 1: Account ── */}
          {step === 1 && (
            <div>
              <div className="text-center mb-8">
                <h1
                  className="text-3xl font-bold text-foreground mb-2"
                  style={{ fontFamily: "'DM Serif Display', serif" }}
                >
                  Let's begin your recovery journey.
                </h1>
                <p className="text-muted-foreground text-sm">
                  We'll guide you through a few simple questions.
                </p>
              </div>

              <div
                className="bg-card/80 backdrop-blur-sm border-0 shadow-lg p-8"
                style={{ borderRadius: 14 }}
              >
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      placeholder="Jane Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="h-12 bg-background border-border focus-visible:ring-accent"
                      style={{ borderRadius: 10 }}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signupEmail">Email</Label>
                    <Input
                      id="signupEmail"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 bg-background border-border focus-visible:ring-accent"
                      style={{ borderRadius: 10 }}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signupPassword">Password</Label>
                    <div className="relative">
                      <Input
                        id="signupPassword"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-12 bg-background border-border pr-11 focus-visible:ring-accent"
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
                    onClick={() => goTo(2)}
                    disabled={!fullName || !email || !password}
                    className="w-full h-12 text-sm font-semibold tracking-wide transition-smooth"
                    style={{ borderRadius: 10 }}
                  >
                    Continue
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>

                <p className="text-center text-xs text-muted-foreground mt-4">
                  Your information stays private and secure.
                </p>

                <div className="mt-5 text-center">
                  <span className="text-sm text-muted-foreground">
                    Already have an account?{" "}
                  </span>
                  <Link
                    to="/login"
                    className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
                  >
                    Log In
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Injury Focus ── */}
          {step === 2 && (
            <div>
              <div className="text-center mb-8">
                <h1
                  className="text-3xl font-bold text-foreground mb-2"
                  style={{ fontFamily: "'DM Serif Display', serif" }}
                >
                  What area needs attention?
                </h1>
                <p className="text-muted-foreground text-sm">
                  This helps us tailor your movement guidance.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 mb-6">
                {INJURY_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => setInjuryType(opt.label)}
                    className={`flex items-center gap-4 p-5 rounded-[14px] border text-left transition-smooth ${
                      injuryType === opt.label
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-border bg-card/80 backdrop-blur-sm hover:border-primary/30 hover:shadow-sm"
                    }`}
                  >
                    <span className="text-2xl">{opt.icon}</span>
                    <span
                      className={`text-base font-medium ${
                        injuryType === opt.label
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {opt.label}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => goTo(1)}
                  className="h-12 px-5 transition-smooth"
                  style={{ borderRadius: 10 }}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
                <Button
                  onClick={() => goTo(3)}
                  disabled={!injuryType}
                  className="flex-1 h-12 text-sm font-semibold tracking-wide transition-smooth"
                  style={{ borderRadius: 10 }}
                >
                  Continue
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 3: Pain Level ── */}
          {step === 3 && (
            <div>
              <div className="text-center mb-8">
                <h1
                  className="text-3xl font-bold text-foreground mb-2"
                  style={{ fontFamily: "'DM Serif Display', serif" }}
                >
                  How would you describe your discomfort?
                </h1>
                <p className="text-muted-foreground text-sm">
                  Be honest — this helps us adjust intensity safely.
                </p>
              </div>

              <div
                className="bg-card/80 backdrop-blur-sm border-0 shadow-lg p-8"
                style={{ borderRadius: 14 }}
              >
                <div className="text-center mb-8">
                  <span
                    className="text-6xl font-bold text-primary font-mono-data"
                  >
                    {painLevel[0]}
                  </span>
                  <span className="text-xl text-muted-foreground ml-1">/ 10</span>
                </div>

                <Slider
                  value={painLevel}
                  onValueChange={setPainLevel}
                  min={1}
                  max={10}
                  step={1}
                  className="py-4"
                />

                <div className="flex justify-between text-xs text-muted-foreground mt-2 mb-6">
                  <span>Mild</span>
                  <span>Moderate</span>
                  <span>Severe</span>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => goTo(2)}
                  className="h-12 px-5 transition-smooth"
                  style={{ borderRadius: 10 }}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
                <Button
                  onClick={() => goTo(4)}
                  className="flex-1 h-12 text-sm font-semibold tracking-wide transition-smooth"
                  style={{ borderRadius: 10 }}
                >
                  Continue
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 4: Daily Challenges ── */}
          {step === 4 && (
            <div>
              <div className="text-center mb-8">
                <h1
                  className="text-3xl font-bold text-foreground mb-2"
                  style={{ fontFamily: "'DM Serif Display', serif" }}
                >
                  Which movements feel difficult?
                </h1>
                <p className="text-muted-foreground text-sm">
                  Understanding limitations helps prevent re-injury.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {CHALLENGE_OPTIONS.map((item) => (
                  <label
                    key={item}
                    className={`flex items-center gap-3 cursor-pointer rounded-[14px] border px-5 py-4 text-sm transition-smooth ${
                      challenges.includes(item)
                        ? "border-primary bg-primary/5 text-foreground shadow-md"
                        : "border-border bg-card/80 backdrop-blur-sm text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    <Checkbox
                      checked={challenges.includes(item)}
                      onCheckedChange={() => toggleChallenge(item)}
                    />
                    <span className="font-medium">{item}</span>
                  </label>
                ))}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => goTo(3)}
                  className="h-12 px-5 transition-smooth"
                  style={{ borderRadius: 10 }}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
                <Button
                  onClick={() => goTo(5)}
                  disabled={challenges.length === 0}
                  className="flex-1 h-12 text-sm font-semibold tracking-wide transition-smooth"
                  style={{ borderRadius: 10 }}
                >
                  Continue
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 5: Goal ── */}
          {step === 5 && (
            <div>
              <div className="text-center mb-8">
                <h1
                  className="text-3xl font-bold text-foreground mb-2"
                  style={{ fontFamily: "'DM Serif Display', serif" }}
                >
                  What would you like to improve?
                </h1>
                <p className="text-muted-foreground text-sm">
                  Small improvements lead to lasting recovery.
                </p>
              </div>

              <div
                className="bg-card/80 backdrop-blur-sm border-0 shadow-lg p-8"
                style={{ borderRadius: 14 }}
              >
                <div className="space-y-2">
                  <Label htmlFor="recoveryGoal">Your Recovery Goal</Label>
                  <Input
                    id="recoveryGoal"
                    placeholder="e.g., Walk without pain in 3 months"
                    value={recoveryGoal}
                    onChange={(e) => setRecoveryGoal(e.target.value)}
                    className="h-12 bg-background border-border focus-visible:ring-accent"
                    style={{ borderRadius: 10 }}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => goTo(4)}
                  className="h-12 px-5 transition-smooth"
                  style={{ borderRadius: 10 }}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!recoveryGoal}
                  className="flex-1 h-12 text-sm font-semibold tracking-wide transition-smooth"
                  style={{ borderRadius: 10 }}
                >
                  Start My Rehab Plan
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Signup;
