import { Link } from "react-router-dom";
import {
  Scan,
  Activity,
  CheckCircle,
  Shield,
  Zap,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import demoVideo from "@/assets/kaia_msk_loop_web_02.mp4";
import demoPreview from "@/assets/demo-preview.mov";
import AuthModal from "@/components/AuthModal";
import OnboardingModal from "@/components/OnboardingModal";
import PreSessionCheckModal from "@/components/PreSessionCheckModal";

const howItWorks = [
  {
    icon: Scan,
    title: "Detect",
    description:
      "Real-time pose estimation using computer vision tracks your body position and joint alignment.",
  },
  {
    icon: Activity,
    title: "Analyze",
    description:
      "Joint angles evaluated against correct rehabilitation standards with clinical precision.",
  },
  {
    icon: CheckCircle,
    title: "Correct",
    description:
      "Instant AI-generated posture feedback guides you to perfect form on every rep.",
  },
];

const features = [
  {
    icon: Shield,
    title: "Clinical-Grade Tracking",
    description:
      "Joint angle precision within 2° of professional motion capture systems.",
  },
  {
    icon: Zap,
    title: "Real-Time Feedback",
    description:
      "Sub-100ms latency ensures corrections arrive before the next rep.",
  },
  {
    icon: BarChart3,
    title: "Progress Intelligence",
    description:
      "Track recovery trends, range of motion gains, and adherence over time.",
  },
];

const Index = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { user } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isPreSessionOpen, setIsPreSessionOpen] = useState(false);

  const handleStartSession = () => {
    if (user) {
      setIsPreSessionOpen(true);
    } else {
      setIsAuthModalOpen(true);
    }
  };

  const handleOnboardingComplete = () => {
    setIsOnboardingOpen(false);
    setIsPreSessionOpen(true);
  };

  // Lock scroll when any modal is open
  const anyModalOpen = isAuthModalOpen || isOnboardingOpen || isPreSessionOpen;
  useEffect(() => {
    document.body.style.overflow = anyModalOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [anyModalOpen]);

  return (
    <div className="min-h-screen">
      <AuthModal
        open={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setIsOnboardingOpen(true);
        }}
      />
      <OnboardingModal
        open={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onComplete={handleOnboardingComplete}
      />
      <PreSessionCheckModal
        open={isPreSessionOpen}
        onClose={() => setIsPreSessionOpen(false)}
      />
      {/* Hero Section */}
      <section className="relative flex min-h-screen overflow-hidden">
        <video
          ref={videoRef}
          src={demoVideo}
          className="absolute inset-0 z-0 h-full w-full object-cover"
          autoPlay
          loop
          muted
          playsInline
        />

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/40 to-foreground/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/50 via-transparent to-transparent" />

        {/* Hero content — bottom left */}
        <div className="relative z-[1] mt-auto mb-16 ml-8 md:ml-16 lg:ml-24 max-w-2xl">
          {/* Vertical accent line + badge */}
          <div className="animate-fade-up flex items-center gap-3 mb-7">
            <div className="w-[3px] h-6 rounded-full bg-accent" />
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 backdrop-blur-sm px-4 py-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-accent" />
              <span className="font-mono-data text-[11px] uppercase tracking-widest text-white/80">
                AI-Powered Rehabilitation
              </span>
            </div>
          </div>

          <h1 className="animate-fade-up text-5xl font-normal leading-[1.08] tracking-tight text-white md:text-6xl lg:text-7xl">
            Rebuild
            <br />
            Strength.
            <br />
            <span className="text-accent italic">Correct Every</span>
            <br />
            <span className="text-accent italic">Movement.</span>
          </h1>

          <p className="animate-fade-up-delay-1 mt-6 max-w-sm text-sm font-light leading-relaxed text-white/65">
            AI-powered posture detection and real-time rehabilitation guidance
            from home. No equipment. No appointments.
          </p>

          <div className="animate-fade-up-delay-2 mt-8 flex items-center gap-3">
            <button
              onClick={handleStartSession}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-7 text-sm font-medium text-primary-foreground shadow-md shadow-primary/20 transition-smooth hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25"
            >
              Start Session
              <ArrowRight className="h-4 w-4" />
            </button>
            <a
              href="#how-it-works"
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-6 text-sm font-medium text-white backdrop-blur-sm transition-smooth hover:bg-white/20 hover:border-white/30"
            >
              Learn More
            </a>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* How It Works */}
      <section
        id="how-it-works"
        className="relative z-10 px-6 py-24 bg-background"
      >
        <div className="mx-auto max-w-5xl">
          <p className="animate-fade-up mb-2 text-center font-mono-data text-xs uppercase tracking-[0.2em] text-accent">
            The Process
          </p>
          <h2 className="animate-fade-up mb-14 text-center text-3xl text-foreground md:text-4xl">
            How It Works
          </h2>

          <div className="grid gap-5 md:grid-cols-3">
            {howItWorks.map((item, i) => (
              <div
                key={item.title}
                className={`animate-fade-up-delay-${i + 1} group flex flex-col items-start gap-4 rounded-xl border border-border bg-card p-7 shadow-sm transition-smooth hover:-translate-y-1 hover:shadow-md hover:border-primary/20`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/8">
                  <item.icon
                    className="h-5 w-5 text-primary"
                    strokeWidth={1.5}
                  />
                </div>
                <h3 className="text-xl text-foreground">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Interface Preview */}
      <section
        className="relative z-10 px-6 py-24"
        style={{ backgroundColor: "hsl(var(--section-alt))" }}
      >
        <div className="mx-auto max-w-4xl">
          <p className="animate-fade-up mb-2 text-center font-mono-data text-xs uppercase tracking-[0.2em] text-accent">
            Live Preview
          </p>
          <h2 className="animate-fade-up mb-10 text-center text-3xl text-foreground md:text-4xl">
            See It in Action
          </h2>
          <div className="animate-fade-up-delay-1 overflow-hidden rounded-2xl border border-border shadow-xl">
            <video
              src={demoPreview}
              className="w-full"
              autoPlay
              loop
              muted
              playsInline
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 px-6 py-24 bg-background">
        <div className="mx-auto max-w-5xl">
          <p className="animate-fade-up mb-2 text-center font-mono-data text-xs uppercase tracking-[0.2em] text-accent">
            Capabilities
          </p>
          <h2 className="animate-fade-up mb-14 text-center text-3xl text-foreground md:text-4xl">
            Built for Precision Recovery
          </h2>

          <div className="grid gap-5 md:grid-cols-3">
            {features.map((item, i) => (
              <div
                key={item.title}
                className={`animate-fade-up-delay-${i + 1} group flex flex-col items-start gap-4 rounded-xl border border-border bg-card p-7 shadow-sm transition-smooth hover:-translate-y-1 hover:shadow-md hover:border-accent/30`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                  <item.icon
                    className="h-5 w-5 text-accent"
                    strokeWidth={1.5}
                  />
                </div>
                <h3 className="text-xl text-foreground">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-6 py-24 bg-background">
        <div className="mx-auto max-w-2xl text-center">
          <div className="rounded-2xl border border-border bg-card p-12 shadow-sm md:p-16">
            <h2 className="text-3xl text-foreground md:text-4xl">
              Start Your Recovery Today
            </h2>
            <p className="mx-auto mt-4 max-w-md text-muted-foreground">
              No equipment needed. No appointments. Just your camera and our AI.
            </p>
            <div className="mt-8">
              <button
                onClick={handleStartSession}
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-8 text-sm font-medium text-primary-foreground shadow-md shadow-primary/20 transition-smooth hover:bg-primary/90 hover:shadow-lg"
              >
                Begin First Session
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border px-6 py-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <span
            className="text-sm text-muted-foreground"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            © 2026 Rehab<span className="text-primary">AI</span>
          </span>
          <div className="flex gap-6">
            {["Privacy", "Terms", "Contact"].map((label) => (
              <span
                key={label}
                className="cursor-pointer text-xs text-muted-foreground transition-smooth hover:text-foreground"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
