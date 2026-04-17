import { useState, useEffect } from "react";
import { toast } from "sonner";
import { 
  Loader2, 
  Save, 
  User, 
  Stethoscope, 
  Target, 
  AlertCircle,
  Calendar,
  TrendingUp,
  Activity,
  Award,
  Dumbbell,
  ChevronRight,
  Edit3,
  Camera,
  Heart,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProfile, useUpdateProfile } from "@/hooks/use-profile";
import { useAuth } from "@/contexts/AuthContext";
import { useProgressStats } from "@/hooks/use-session";

// ─── Options (same as OnboardingModal) ────────────────────────────────────────

const injuryAreas = ["Knee", "Shoulder", "Back", "Hip", "Ankle", "Wrist", "Neck", "Elbow"];
const injuryTypes = ["Sprain", "Strain", "Fracture", "Post-Surgery", "Chronic Pain", "Tendinitis", "Dislocation"];
const durations = ["Less than 1 week", "1-4 weeks", "1-3 months", "3-6 months", "6+ months", "Over a year"];
const limitations = ["Limited bending", "Limited lifting", "Limited walking", "Limited reaching"];

// ─── Stats Card Component ─────────────────────────────────────────────────────

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  subtext,
  trend,
  color = "primary" 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string | number; 
  subtext?: string;
  trend?: "up" | "down" | "neutral";
  color?: "primary" | "emerald" | "amber" | "rose";
}) {
  const colorClasses = {
    primary: "bg-primary/10 text-primary",
    emerald: "bg-emerald-500/10 text-emerald-600",
    amber: "bg-amber-500/10 text-amber-600", 
    rose: "bg-rose-500/10 text-rose-600"
  };

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
          {trend && (
            <div className={`flex items-center gap-1 text-xs font-medium ${
              trend === "up" ? "text-emerald-600" : trend === "down" ? "text-rose-600" : "text-muted-foreground"
            }`}>
              <TrendingUp className="h-3 w-3" />
              {trend === "up" ? "+12%" : trend === "down" ? "-5%" : "0%"}
            </div>
          )}
        </div>
        <div className="mt-4">
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
          {subtext && <p className="text-xs text-muted-foreground/70 mt-1">{subtext}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

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
    <Card className="border-border/60">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Icon className="h-5 w-5 text-primary" strokeWidth={1.5} />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

// ─── Achievement Badge ────────────────────────────────────────────────────────

function AchievementBadge({ icon: Icon, title, unlocked }: { icon: React.ElementType; title: string; unlocked: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
      unlocked 
        ? "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200" 
        : "bg-muted/30 border-border opacity-50"
    }`}>
      <div className={`p-3 rounded-full ${unlocked ? "bg-amber-100 text-amber-600" : "bg-muted text-muted-foreground"}`}>
        <Icon className="h-5 w-5" />
      </div>
      <span className={`text-xs font-medium text-center ${unlocked ? "text-amber-700" : "text-muted-foreground"}`}>
        {title}
      </span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const ProfilePage = () => {
  const { user } = useAuth();
  const { data: profile, isLoading, isError } = useProfile();
  const { data: stats } = useProgressStats();
  const updateProfile = useUpdateProfile();

  // Local form state
  const [isEditing, setIsEditing] = useState(false);
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
      setIsEditing(false);
    } catch {
      toast.error("Failed to save profile. Please try again.");
    }
  };

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
        <div className="container mx-auto max-w-5xl px-6 py-8">
          <Skeleton className="h-32 w-full rounded-xl mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
          <div className="space-y-6">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-56 w-full rounded-xl" />
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

  const totalSessions = stats?.totalSessions ?? 0;
  const latestAccuracy = stats?.latestAccuracy ?? 0;
  const thisMonthSessions = stats?.thisMonthSessions ?? 0;

  // Calculate BMI if height and weight available
  const bmi = heightCm && weightKg 
    ? (Number(weightKg) / Math.pow(Number(heightCm) / 100, 2)).toFixed(1)
    : null;

  const getBmiStatus = (bmi: number) => {
    if (bmi < 18.5) return { label: "Underweight", color: "text-amber-600" };
    if (bmi < 25) return { label: "Healthy", color: "text-emerald-600" };
    if (bmi < 30) return { label: "Overweight", color: "text-amber-600" };
    return { label: "Obese", color: "text-rose-600" };
  };

  return (
    <div className="min-h-screen pt-14 bg-background">
      <div className="container mx-auto max-w-5xl px-6 py-8">
        
        {/* ─── Hero Header ───────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-primary/10 to-background border border-primary/20 p-8 mb-8">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Activity className="h-32 w-32" />
          </div>
          
          <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24 border-4 border-background shadow-xl">
                <AvatarImage src={profile?.avatar_url || ""} />
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                  {fullName ? fullName.split(" ").map(n => n[0]).join("").toUpperCase() : user?.email?.[0].toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <button className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors">
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>
            
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-foreground mb-1">
                {fullName || "Welcome Back"}
              </h1>
              <p className="text-muted-foreground flex items-center gap-2">
                <span>{user?.email}</span>
                <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {profile?.injury_area || "No injury set"}
                </span>
              </p>
              
              <div className="flex flex-wrap items-center gap-4 mt-4">
                {age && <span className="text-sm text-muted-foreground">{age} years old</span>}
                {bmi && (
                  <span className="text-sm">
                    <span className="text-muted-foreground">BMI: </span>
                    <span className="font-semibold">{bmi}</span>
                    <span className={`ml-1 text-xs ${getBmiStatus(Number(bmi)).color}`}>
                      ({getBmiStatus(Number(bmi)).label})
                    </span>
                  </span>
                )}
                {injuryDuration && (
                  <span className="text-sm text-muted-foreground">
                    Recovering for {injuryDuration.toLowerCase()}
                  </span>
                )}
              </div>
            </div>

            <Button 
              onClick={() => setIsEditing(!isEditing)}
              variant="outline"
              className="gap-2"
            >
              <Edit3 className="h-4 w-4" />
              {isEditing ? "Cancel" : "Edit Profile"}
            </Button>
          </div>
        </div>

        {/* ─── Stats Grid ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard 
            icon={Dumbbell} 
            label="Total Sessions" 
            value={totalSessions}
            subtext="All time workouts"
            trend="up"
            color="primary"
          />
          <StatCard 
            icon={Target} 
            label="Latest Accuracy" 
            value={latestAccuracy ? `${latestAccuracy}%` : "—"}
            subtext="Last workout score"
            color="emerald"
          />
          <StatCard 
            icon={Calendar} 
            label="This Month" 
            value={thisMonthSessions}
            subtext="Sessions completed"
            color="amber"
          />
          <StatCard 
            icon={Heart} 
            label="Recovery Progress" 
            value={`${Math.min(100, totalSessions * 10)}%`}
            subtext="Based on consistency"
            color="rose"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ─── Main Content ────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* ─── Basic Details ───────────────────────────────── */}
            <Section
              icon={User}
              title="Basic Information"
              description="Your personal health metrics"
            >
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="pf-name">Full Name</Label>
                  <Input
                    id="pf-name"
                    placeholder="Your name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={!isEditing}
                    className="h-11 rounded-xl bg-background disabled:opacity-60"
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
                      disabled={!isEditing}
                      className="h-11 rounded-xl bg-background disabled:opacity-60"
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
                      disabled={!isEditing}
                      className="h-11 rounded-xl bg-background disabled:opacity-60"
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
                      disabled={!isEditing}
                      className="h-11 rounded-xl bg-background disabled:opacity-60"
                    />
                  </div>
                </div>
              </div>
            </Section>

            {/* ─── Injury Information ───────────────────────────── */}
            <Section
              icon={Stethoscope}
              title="Injury Details"
              description="Helps us personalize your exercises"
            >
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label>Injury Area</Label>
                    <Select value={injuryArea} onValueChange={setInjuryArea} disabled={!isEditing}>
                      <SelectTrigger className="h-11 rounded-xl bg-background disabled:opacity-60">
                        <SelectValue placeholder="Select area" />
                      </SelectTrigger>
                      <SelectContent>
                        {injuryAreas.map((a) => (
                          <SelectItem key={a} value={a}>{a}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Injury Type</Label>
                    <Select value={injuryType} onValueChange={setInjuryType} disabled={!isEditing}>
                      <SelectTrigger className="h-11 rounded-xl bg-background disabled:opacity-60">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {injuryTypes.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Duration</Label>
                    <Select value={injuryDuration} onValueChange={setInjuryDuration} disabled={!isEditing}>
                      <SelectTrigger className="h-11 rounded-xl bg-background disabled:opacity-60">
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        {durations.map((d) => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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
                        } ${!isEditing ? "opacity-60 cursor-not-allowed" : ""}`}
                      >
                        <Checkbox
                          checked={selectedLimitations.includes(item)}
                          onCheckedChange={() => isEditing && toggleLimitation(item)}
                          disabled={!isEditing}
                        />
                        <span className="text-sm text-foreground">{item}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </Section>

            {/* ─── Recovery Goal ────────────────────────────────── */}
            <Section
              icon={Target}
              title="Recovery Goal"
              description="What would you like to achieve?"
            >
              <textarea
                value={recoveryGoal}
                onChange={(e) => setRecoveryGoal(e.target.value)}
                disabled={!isEditing}
                placeholder="e.g. I want to be able to walk without pain and return to jogging within 3 months."
                className="w-full h-28 rounded-xl border border-border bg-background p-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none disabled:opacity-60"
              />
            </Section>

            {/* ─── Save button ──────────────────────────────────── */}
            {isEditing && (
              <div className="flex items-center justify-end gap-3 sticky bottom-4 bg-background/80 backdrop-blur p-4 rounded-xl border border-border">
                {hasChanges && (
                  <span className="text-xs text-muted-foreground">Unsaved changes</span>
                )}
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
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
            )}
          </div>

          {/* ─── Sidebar ─────────────────────────────────────────── */}
          <div className="space-y-6">
            {/* ─── Achievements ─────────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-500" />
                  Achievements
                </CardTitle>
                <CardDescription>Track your milestones</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <AchievementBadge 
                    icon={Zap} 
                    title="First Session" 
                    unlocked={totalSessions >= 1} 
                  />
                  <AchievementBadge 
                    icon={Target} 
                    title="10 Reps" 
                    unlocked={totalSessions >= 3} 
                  />
                  <AchievementBadge 
                    icon={Calendar} 
                    title="Week Streak" 
                    unlocked={thisMonthSessions >= 5} 
                  />
                  <AchievementBadge 
                    icon={Award} 
                    title="Perfect Form" 
                    unlocked={latestAccuracy >= 90} 
                  />
                </div>
              </CardContent>
            </Card>

            {/* ─── Recovery Progress ────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-emerald-500" />
                  Recovery Progress
                </CardTitle>
                <CardDescription>Your journey to full health</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Sessions Completed</span>
                    <span className="font-semibold">{totalSessions}/20</span>
                  </div>
                  <Progress value={Math.min(100, (totalSessions / 20) * 100)} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Average Accuracy</span>
                    <span className="font-semibold">{latestAccuracy || 0}%</span>
                  </div>
                  <Progress value={latestAccuracy || 0} className="h-2" />
                </div>

                <div className="pt-2 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                    <span>Keep up the great work!</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ─── Quick Links ──────────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-between" asChild>
                  <a href="/session">
                    Start Workout
                    <ChevronRight className="h-4 w-4" />
                  </a>
                </Button>
                <Button variant="outline" className="w-full justify-between" asChild>
                  <a href="/progress">
                    View Progress
                    <ChevronRight className="h-4 w-4" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
