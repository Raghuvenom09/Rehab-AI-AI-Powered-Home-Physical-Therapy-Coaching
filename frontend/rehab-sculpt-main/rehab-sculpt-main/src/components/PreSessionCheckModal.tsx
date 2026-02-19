import { useState } from "react";
import { X, ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface PreSessionCheckModalProps {
  open: boolean;
  onClose: () => void;
}

const bodyAreas = ["Knee", "Shoulder", "Back", "Hip", "None"];
const painOptions = ["No unusual pain", "Mild sharp pain", "Severe sharp pain"];

const TOTAL_STEPS = 3;

const PreSessionCheckModal = ({ open, onClose }: PreSessionCheckModalProps) => {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);

  const [painLevel, setPainLevel] = useState([3]);
  const [sorenessAreas, setSorenessAreas] = useState<string[]>([]);
  const [sharpPain, setSharpPain] = useState("");

  if (!open) return null;

  const toggleArea = (area: string) => {
    if (area === "None") {
      setSorenessAreas(["None"]);
      return;
    }
    setSorenessAreas((prev) => {
      const without = prev.filter((a) => a !== "None");
      return without.includes(area) ? without.filter((a) => a !== area) : [...without, area];
    });
  };

  const canContinue = () => {
    switch (step) {
      case 1: return true;
      case 2: return sorenessAreas.length > 0;
      case 3: return sharpPain !== "";
      default: return false;
    }
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    } else {
      setSubmitted(true);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const level = painLevel[0];
  const isSevere = sharpPain === "Severe sharp pain";

  const getOutcome = () => {
    if (level >= 7 || isSevere) return "caution";
    if (level >= 4) return "modified";
    return "ready";
  };

  const progress = submitted ? 100 : ((step - 1) / TOTAL_STEPS) * 100;

  const outcomeScreens = {
    ready: {
      icon: CheckCircle2,
      iconBg: "bg-success/10",
      iconColor: "text-success",
      title: "You're ready to begin.",
      subtitle: "Your body feels good today. Let's make the most of it.",
      buttons: [{ label: "Start Normal Session", variant: "default" as const }],
    },
    modified: {
      icon: AlertTriangle,
      iconBg: "bg-warning/10",
      iconColor: "text-warning",
      title: "We'll start with a lighter session today.",
      subtitle: "Based on your responses, we've adjusted the intensity.",
      buttons: [{ label: "Start Modified Session", variant: "default" as const }],
    },
    caution: {
      icon: ShieldAlert,
      iconBg: "bg-destructive/10",
      iconColor: "text-destructive",
      title: "It may be safer to rest today.",
      subtitle: "Your body may need more recovery time. Listen to it.",
      buttons: [
        { label: "Reschedule Session", variant: "outline" as const },
        { label: "Start Gentle Mobility", variant: "default" as const },
      ],
    },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-[60] w-full max-w-lg mx-4 bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-up">
        {/* Progress */}
        <div className="h-1 bg-border">
          <div className="h-full bg-primary transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
        </div>

        <button onClick={onClose} className="absolute right-4 top-4 z-10 text-muted-foreground hover:text-foreground transition-smooth">
          <X className="h-5 w-5" />
        </button>

        <div className="p-8">
          {submitted ? (
            (() => {
              const outcome = getOutcome();
              const screen = outcomeScreens[outcome];
              const Icon = screen.icon;
              return (
                <div className="text-center py-6 animate-fade-up">
                  <div className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full ${screen.iconBg}`}>
                    <Icon className={`h-8 w-8 ${screen.iconColor}`} />
                  </div>
                  <h2 className="text-2xl text-foreground mb-2" style={{ fontFamily: "'DM Serif Display', serif" }}>
                    {screen.title}
                  </h2>
                  <p className="text-muted-foreground text-sm mb-8">{screen.subtitle}</p>
                  <div className="flex items-center justify-center gap-3">
                    {screen.buttons.map((btn) => (
                      <Button
                        key={btn.label}
                        variant={btn.variant}
                        onClick={onClose}
                        className="h-11 px-6 rounded-xl text-sm font-medium"
                      >
                        {btn.label}
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    ))}
                  </div>
                </div>
              );
            })()
          ) : (
            <>
              <h2 className="text-xl text-foreground mb-1" style={{ fontFamily: "'DM Serif Display', serif" }}>
                How Are You Feeling Today?
              </h2>
              <p className="text-xs font-medium text-muted-foreground tracking-wide mb-6">
                Step {step} of {TOTAL_STEPS}
              </p>

              {/* Step 1 – Pain Level */}
              {step === 1 && (
                <div className="animate-fade-up">
                  <h3 className="text-sm font-medium text-foreground mb-4">Current Pain Level</h3>
                  <div className="px-2">
                    <Slider
                      value={painLevel}
                      onValueChange={setPainLevel}
                      min={1}
                      max={10}
                      step={1}
                      className="my-4"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-2">
                      <span>Minimal</span>
                      <span className="text-lg font-semibold text-foreground">{painLevel[0]}</span>
                      <span>Severe</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2 – Muscle Soreness */}
              {step === 2 && (
                <div className="animate-fade-up">
                  <h3 className="text-sm font-medium text-foreground mb-4">Muscle Soreness Areas</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {bodyAreas.map((area) => (
                      <button
                        key={area}
                        onClick={() => toggleArea(area)}
                        className={`rounded-xl border p-3 text-sm font-medium transition-smooth ${
                          sorenessAreas.includes(area)
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border bg-background text-foreground hover:border-muted"
                        }`}
                      >
                        {area}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3 – Sharp Pain */}
              {step === 3 && (
                <div className="animate-fade-up">
                  <h3 className="text-sm font-medium text-foreground mb-4">Sharp Pain Check</h3>
                  <div className="space-y-3">
                    {painOptions.map((option) => (
                      <button
                        key={option}
                        onClick={() => setSharpPain(option)}
                        className={`w-full text-left rounded-xl border p-4 text-sm font-medium transition-smooth ${
                          sharpPain === option
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border bg-background text-foreground hover:border-muted"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between mt-8">
                {step > 1 ? (
                  <button onClick={handleBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-smooth">
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>
                ) : <div />}
                <Button
                  onClick={handleNext}
                  disabled={!canContinue()}
                  className="h-11 px-8 rounded-xl text-sm font-medium"
                >
                  {step === TOTAL_STEPS ? "Submit" : "Continue"}
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PreSessionCheckModal;
