

# Rehab AI – AI-Powered Home Physical Therapy Coaching

## Design System Foundation

### Typography
- **Headings:** Playfair Display (Google Fonts) — dramatic editorial serif with sharp contrast
- **Body:** IBM Plex Sans (Google Fonts) — technical, refined sans-serif
- **Data/Numbers:** Space Mono (Google Fonts) — geometric monospace for joint angles and metrics

### Color Palette (CSS variables, dark theme only)
- **Background:** Deep graphite / near-black (`~220° 15% 6%`)
- **Surface:** Slightly lighter dark (`~220° 12% 10%`)
- **Primary Accent:** Electric cyan (`~185° 100% 55%`)
- **Secondary Accent:** Medical lime/acid green (success states only)
- **Error:** Vibrant kinetic red
- **Text:** Off-white with muted secondary text

### Design Tokens
- Border radius: 14px
- Thin neon-accent borders (1px cyan with glow)
- No heavy drop shadows — use subtle glow effects instead
- Spacious padding throughout
- Grid-aligned layout

---

## Background & Atmosphere Layer
- Radial cyan glow behind hero section (large, soft, low opacity)
- Subtle grid overlay across the page (very low opacity geometric pattern)
- Thin geometric angle lines suggesting joint articulation as decorative accents
- Light noise/grain texture via CSS for depth and realism

---

## Page 1: Landing Page

### Hero Section
- Large commanding headline: **"Rebuild Strength. Correct Every Movement."** in Playfair Display
- Two-line sharp subtext explaining AI-powered PT coaching
- **"Start Session"** CTA button with neon cyan border and subtle pulse animation
- Radial glow backdrop behind the hero content
- **Animations:** Headline fades up (600ms), subheading staggers in (150ms delay), CTA appears last with pulse

### How It Works Section
- Three horizontal cards: **Detect → Analyze → Correct**
- Each card: dark glass surface, thin neon cyan border, icon, title, one-line description
- Hover: subtle elevation shift and border glow intensification
- Staggered reveal animation on scroll

### Visual Simulation Section
- Stylized dark camera frame with glowing cyan border
- Animated skeleton wireframe inside — a human pose silhouette with joint markers that pulse at key points (shoulders, elbows, knees, hips)
- Thin connecting lines between joints with subtle glow
- Feels like a real-time biomechanical analysis preview

---

## Page 2: Session Page

### Split Layout
- **Left panel (60%):** Large camera frame container with animated skeleton wireframe, glowing accent border, joint markers pulsing
- **Right panel (40%):** Feedback panel with:
  - Exercise name (Playfair Display heading)
  - Joint angle readouts in Space Mono (e.g., "Knee: 142°", "Hip: 87°")
  - Status indicator with color-coded badge:
    - 🟢 Green = Correct form
    - 🟡 Yellow = Needs adjustment
    - 🔴 Red = Incorrect
  - Status badge pulses/animates on state change
  - Rep counter and current set info
- Clean, minimal, high-focus layout

---

## Page 3: Progress Page

### Metric Cards Row
- Three dark glass-style cards with thin neon borders:
  - **Total Sessions** (number in Space Mono)
  - **Accuracy %** (with subtle progress ring)
  - **Improvement Score** (trending indicator)
- Cards use glassmorphism effect (backdrop blur on dark surface)
- Staggered reveal animation

### Performance Chart
- Thin neon cyan line chart using Recharts with custom dark theme
- No grid lines, minimal axes, dark background
- Glowing line effect on the data path
- Mock data showing improvement over time
- Tooltip styled to match the dark theme

---

## Navigation
- Minimal top navigation bar with Rehab AI logo/wordmark
- Three nav links: **Home / Session / Progress**
- Active state uses cyan accent underline
- Dark, slim, unobtrusive

---

## Motion & Interactions (Global)
- All transitions: 300ms with custom cubic-bezier easing
- Buttons: soft cyan glow on hover
- Cards: subtle lift + border glow on hover
- Page transitions: fade-in with slight upward movement
- Status badges: pulse animation when active
- CSS animations primarily — clean, deliberate, not scattered

