import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Save, User, Stethoscope, Target, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProfile, useUpdateProfile } from "@/hooks/use-profile";
import { useAuth } from "@/contexts/AuthContext";

// ─── Options (same as OnboardingModal) ────────────────────────────────────────

const injuryAreas = ["Knee", "Shoulder", "Back", "Hip", "Ankle", "Wrist", "Neck", "Elbow"];
const injuryTypes = ["Sprain", "Strain", "Fracture", "Post-Surgery", "Chronic Pain", "Tendinitis", "Dislocation"];
const durations = ["Less than 1 week", "1-4 weeks", "1-3 months", "3-6 months", "6+ months", "Over a year"];
const limitations = ["Limited bending", "Limited lifting", "Limited walking", "Limited reaching"];

// ─── Section card wrapper ─────────────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-7 shadow-sm">
      <div className="flex items-center gap-3 mb-1">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/8">
          <Icon className="h-4.5 w-4.5 text-primary" strokeWidth={1.5} />
        </div>
        <h2
          className="text-lg text-foreground"
          style={{ fontFamily: "'DM Serif Display', serif" }}
        >
          {title}
        </h2>
      </div>
      <p className="mb-6 ml-12 text-sm text-muted-foreground">{description}</p>
      {children}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const ProfilePage = () => {
  const { user } = useAuth();
  const { data: profile, isLoading, isError } = useProfile();
  const updateProfile = useUpdateProfile();

  // Local form state
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [injuryArea, setInjuryArea] = useState("");
  const [injuryType, setInjuryType] = useState("");
  const [injuryDuration, setInjuryDuration] = useState("");
  const [selectedLimitations, setSelectedLimitations] = useState<string[]>([]);
  const [recoveryGoal, setRecoveryGoal] = useState("");

  // Hydrate form when profile loads
  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setAge(profile.age != null ? String(profile.age) : "");
    setHeightCm(profile.height_cm != null ? String(profile.height_cm) : "");
    setWeightKg(profile.weight_kg != null ? String(profile.weight_kg) : "");
    setInjuryArea(profile.injury_area ?? "");
    setInjuryType(profile.injury_type ?? "");
    setInjuryDuration(profile.injury_duration ?? "");
    setSelectedLimitations(profile.limitations ?? []);
    setRecoveryGoal(profile.recovery_goal ?? "");
  }, [profile]);

  const toggleLimitation = (item: string) => {
    setSelectedLimitations((prev) =>
      prev.includes(item) ? prev.filter((l) => l !== item) : [...prev, item]
    );
  };

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync({
        full_name: fullName.trim() || null,
        age: age ? Number(age) : null,
        height_cm: heightCm ? Number(heightCm) : null,
        weight_kg: weightKg ? Number(weightKg) : null,
        injury_area: injuryArea || null,
        injury_type: injuryType || null,
        injury_duration: injuryDuration || null,
        limitations: selectedLimitations,
        recovery_goal: recoveryGoal.trim() || null,
      });
      toast.success("Profile updated successfully.");
    } catch {
      toast.error("Failed to save profile. Please try again.");
    }
  };

  // Check if form has changes compared to the loaded profile
  const hasChanges = (() => {
    if (!profile) return false;
    return (
      fullName !== (profile.full_name ?? "") ||
      age !== (profile.age != null ? String(profile.age) : "") ||
      heightCm !== (profile.height_cm != null ? String(profile.height_cm) : "") ||
      weightKg !== (profile.weight_kg != null ? String(profile.weight_kg) : "") ||
      injuryArea !== (profile.injury_area ?? "") ||
      injuryType !== (profile.injury_type ?? "") ||
      injuryDuration !== (profile.injury_duration ?? "") ||
      JSON.stringify(selectedLimitations) !== JSON.stringify(profile.limitations ?? []) ||
      recoveryGoal !== (profile.recovery_goal ?? "")
    );
  })();

  if (isLoading) {
    return (
      <div className="min-h-screen pt-14 bg-background">
        <div className="container mx-auto max-w-2xl px-6 py-16">
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-5 w-72 mb-12" />
          <div className="space-y-6">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-56 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen pt-14 bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="h-10 w-10 text-destructive/60" />
          <p className="text-muted-foreground">Failed to load your profile. Please refresh.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-14 bg-background">
      <div className="container mx-auto max-w-2xl px-6 py-16">
        {/* Header */}
        <div className="mb-12 animate-fade-up">
          <h1
            className="text-3xl text-foreground md:text-4xl"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            Your Profile
          </h1>
          <p className="mt-2 text-muted-foreground">
            {user?.email}
          </p>
        </div>

        <div className="space-y-6 animate-fade-up">
          {/* ─── Basic Details ─────────────────────────────────── */}
          <Section
            icon={User}
            title="Basic Details"
            description="Your personal information."
          >
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="pf-name">Full Name</Label>
                <Input
                  id="pf-name"
                  placeholder="Jane Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-11 rounded-xl bg-background"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="pf-age">Age</Label>
                  <Input
                    id="pf-age"
                    type="number"
                    placeholder="32"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="h-11 rounded-xl bg-background"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pf-height">Height (cm)</Label>
                  <Input
                    id="pf-height"
                    type="number"
                    placeholder="170"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    className="h-11 rounded-xl bg-background"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pf-weight">Weight (kg)</Label>
                  <Input
                    id="pf-weight"
                    type="number"
                    placeholder="65"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    className="h-11 rounded-xl bg-background"
                  />
                </div>
              </div>
            </div>
          </Section>

          {/* ─── Injury Information ────────────────────────────── */}
          <Section
            icon={Stethoscope}
            title="Injury Information"
            description="Helps us personalize your exercises."
          >
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Primary Injury Area</Label>
                <Select value={injuryArea} onValueChange={setInjuryArea}>
                  <SelectTrigger className="h-11 rounded-xl bg-background">
                    <SelectValue placeholder="Select area" />
                  </SelectTrigger>
                  <SelectContent>
                    {injuryAreas.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Injury Type</Label>
                <Select value={injuryType} onValueChange={setInjuryType}>
                  <SelectTrigger className="h-11 rounded-xl bg-background">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {injuryTypes.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Duration of Issue</Label>
                <Select value={injuryDuration} onValueChange={setInjuryDuration}>
                  <SelectTrigger className="h-11 rounded-xl bg-background">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    {durations.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Mobility Limitations</Label>
                <div className="grid grid-cols-2 gap-2">
                  {limitations.map((item) => (
                    <label
                      key={item}
                      className={`flex items-center gap-3 rounded-xl border p-3.5 cursor-pointer transition-all ${
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
            </div>
          </Section>

          {/* ─── Recovery Goal ─────────────────────────────────── */}
          <Section
            icon={Target}
            title="Recovery Goal"
            description="What would you like to achieve?"
          >
            <textarea
              value={recoveryGoal}
              onChange={(e) => setRecoveryGoal(e.target.value)}
              placeholder="e.g. I want to be able to walk without pain and return to jogging within 3 months."
              className="w-full h-28 rounded-xl border border-border bg-background p-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </Section>

          {/* ─── Save button ───────────────────────────────────── */}
          <div className="flex items-center justify-end gap-3 pt-2 pb-8">
            {hasChanges && (
              <span className="text-xs text-muted-foreground">Unsaved changes</span>
            )}
            <Button
              onClick={handleSave}
              disabled={!hasChanges || updateProfile.isPending}
              className="h-11 px-8 rounded-xl text-sm font-medium gap-2"
            >
              {updateProfile.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
