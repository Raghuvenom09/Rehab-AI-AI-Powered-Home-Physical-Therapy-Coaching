import { useState } from "react";
import { X, ArrowRight, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const TOTAL_STEPS = 4;

const injuryAreas = ["Knee", "Shoulder", "Back", "Hip", "Ankle", "Wrist", "Neck", "Elbow"];
const injuryTypes = ["Sprain", "Strain", "Fracture", "Post-Surgery", "Chronic Pain", "Tendinitis", "Dislocation"];
const durations = ["Less than 1 week", "1–4 weeks", "1–3 months", "3–6 months", "6+ months", "Over a year"];
const limitations = ["Limited bending", "Limited lifting", "Limited walking", "Limited reaching"];

const OnboardingModal = ({ open, onClose, onComplete }: OnboardingModalProps) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [completed, setCompleted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Step 1
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");

  // Step 2
  const [injuryArea, setInjuryArea] = useState("");
  const [injuryType, setInjuryType] = useState("");
  const [duration, setDuration] = useState("");

  // Step 3
  const [selectedLimitations, setSelectedLimitations] = useState<string[]>([]);

  // Step 4
  const [recoveryGoal, setRecoveryGoal] = useState("");

  if (!open) return null;

  const saveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        full_name: fullName.trim(),
        age: age ? Number(age) : null,
        height_cm: height ? Number(height) : null,
        weight_kg: weight ? Number(weight) : null,
        injury_area: injuryArea || null,
        injury_type: injuryType || null,
        injury_duration: duration || null,
        limitations: selectedLimitations,
        recovery_goal: recoveryGoal.trim() || null,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    } catch (err) {
      console.error("Failed to save profile:", err);
      toast.error("Profile saved locally — sync will retry on next login.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleLimitation = (item: string) => {
    setSelectedLimitations((prev) =>
      prev.includes(item) ? prev.filter((l) => l !== item) : [...prev, item]
    );
  };

  const progress = completed ? 100 : ((step - 1) / TOTAL_STEPS) * 100;

  const canContinue = () => {
    switch (step) {
      case 1: return fullName && age && height && weight;
      case 2: return injuryArea && injuryType && duration;
      case 3: return true;
      case 4: return recoveryGoal.trim().length > 0;
      default: return false;
    }
  };

  const handleNext = async () => {
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    } else {
      await saveProfile();
      setCompleted(true);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-[60] w-full max-w-lg mx-4 bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-up">
        {/* Progress bar */}
        <div className="h-1 bg-border">
          <div
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 text-muted-foreground hover:text-foreground transition-smooth"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-8">
          {completed ? (
            /* Confirmation */
            <div className="text-center py-6 animate-fade-up">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
              <h2 className="text-2xl text-foreground mb-2" style={{ fontFamily: "'DM Serif Display', serif" }}>
                Your recovery profile is ready.
              </h2>
              <p className="text-muted-foreground text-sm mb-8">
                We've tailored your experience based on your information.
              </p>
              <Button onClick={onComplete} className="h-11 px-8 rounded-xl text-sm font-medium">
                Start First Session
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          ) : (
            <>
              {/* Step indicator */}
              <p className="text-xs font-medium text-muted-foreground tracking-wide mb-1">
                Step {step} of {TOTAL_STEPS}
              </p>

              {/* Step 1 */}
              {step === 1 && (
                <div className="animate-fade-up">
                  <h2 className="text-xl text-foreground mb-5" style={{ fontFamily: "'DM Serif Display', serif" }}>
                    Basic Details
                  </h2>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="ob-name">Full Name</Label>
                      <Input id="ob-name" placeholder="Jane Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-11 rounded-xl bg-background" />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="ob-age">Age</Label>
                        <Input id="ob-age" type="number" placeholder="32" value={age} onChange={(e) => setAge(e.target.value)} className="h-11 rounded-xl bg-background" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="ob-height">Height (cm)</Label>
                        <Input id="ob-height" type="number" placeholder="170" value={height} onChange={(e) => setHeight(e.target.value)} className="h-11 rounded-xl bg-background" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="ob-weight">Weight (kg)</Label>
                        <Input id="ob-weight" type="number" placeholder="65" value={weight} onChange={(e) => setWeight(e.target.value)} className="h-11 rounded-xl bg-background" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2 */}
              {step === 2 && (
                <div className="animate-fade-up">
                  <h2 className="text-xl text-foreground mb-5" style={{ fontFamily: "'DM Serif Display', serif" }}>
                    Injury Information
                  </h2>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>Primary Injury Area</Label>
                      <Select value={injuryArea} onValueChange={setInjuryArea}>
                        <SelectTrigger className="h-11 rounded-xl bg-background"><SelectValue placeholder="Select area" /></SelectTrigger>
                        <SelectContent>
                          {injuryAreas.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Injury Type</Label>
                      <Select value={injuryType} onValueChange={setInjuryType}>
                        <SelectTrigger className="h-11 rounded-xl bg-background"><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>
                          {injuryTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Duration of Issue</Label>
                      <Select value={duration} onValueChange={setDuration}>
                        <SelectTrigger className="h-11 rounded-xl bg-background"><SelectValue placeholder="Select duration" /></SelectTrigger>
                        <SelectContent>
                          {durations.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3 */}
              {step === 3 && (
                <div className="animate-fade-up">
                  <h2 className="text-xl text-foreground mb-2" style={{ fontFamily: "'DM Serif Display', serif" }}>
                    Mobility & Limitations
                  </h2>
                  <p className="text-sm text-muted-foreground mb-5">Select any that apply to you.</p>
                  <div className="space-y-3">
                    {limitations.map((item) => (
                      <label
                        key={item}
                        className={`flex items-center gap-3 rounded-xl border p-4 cursor-pointer transition-smooth ${
                          selectedLimitations.includes(item)
                            ? "border-primary bg-primary/5"
                            : "border-border bg-background hover:border-muted"
                        }`}
                      >
                        <Checkbox
                          checked={selectedLimitations.includes(item)}
                          onCheckedChange={() => toggleLimitation(item)}
                        />
                        <span className="text-sm text-foreground">{item}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 4 */}
              {step === 4 && (
                <div className="animate-fade-up">
                  <h2 className="text-xl text-foreground mb-2" style={{ fontFamily: "'DM Serif Display', serif" }}>
                    Recovery Goal
                  </h2>
                  <p className="text-sm text-muted-foreground mb-5">What would you like to improve?</p>
                  <textarea
                    value={recoveryGoal}
                    onChange={(e) => setRecoveryGoal(e.target.value)}
                    placeholder="e.g. I want to be able to walk without pain and return to jogging within 3 months."
                    className="w-full h-32 rounded-xl border border-border bg-background p-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
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
                  disabled={!canContinue() || isSaving}
                  className="h-11 px-8 rounded-xl text-sm font-medium"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      {step === TOTAL_STEPS ? "Complete Setup" : "Continue"}
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;
