---
name: Neon Protocol
colors:
  surface: '#121315'
  surface-dim: '#121315'
  surface-bright: '#38393a'
  surface-container-lowest: '#0d0e0f'
  surface-container-low: '#1b1c1d'
  surface-container: '#1f2021'
  surface-container-high: '#292a2b'
  surface-container-highest: '#343536'
  on-surface: '#e3e2e3'
  on-surface-variant: '#b9cacb'
  inverse-surface: '#e3e2e3'
  inverse-on-surface: '#303032'
  outline: '#849495'
  outline-variant: '#3a494b'
  surface-tint: '#00dbe7'
  primary: '#e1fdff'
  on-primary: '#00363a'
  primary-container: '#00f2ff'
  on-primary-container: '#006a71'
  inverse-primary: '#00696f'
  secondary: '#ffdb9d'
  on-secondary: '#412d00'
  secondary-container: '#feb700'
  on-secondary-container: '#6b4b00'
  tertiary: '#fff4fb'
  on-tertiary: '#560069'
  tertiary-container: '#fbcbff'
  on-tertiary-container: '#a100c3'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#74f5ff'
  primary-fixed-dim: '#00dbe7'
  on-primary-fixed: '#002022'
  on-primary-fixed-variant: '#004f54'
  secondary-fixed: '#ffdea8'
  secondary-fixed-dim: '#ffba20'
  on-secondary-fixed: '#271900'
  on-secondary-fixed-variant: '#5e4200'
  tertiary-fixed: '#fdd6ff'
  tertiary-fixed-dim: '#f5adff'
  on-tertiary-fixed: '#340041'
  on-tertiary-fixed-variant: '#7a0094'
  background: '#121315'
  on-background: '#e3e2e3'
  surface-variant: '#343536'
  neon-teal: '#00F2FF'
  lantern-amber: '#FFB800'
  lantern-yellow: '#F9FF00'
  cyber-magenta: '#FF00C8'
  deep-violet: '#6200FF'
  surface-charcoal: '#0D0E10'
  glow-cyan: rgba(0, 242, 255, 0.4)
  light-leak-pink: rgba(255, 0, 200, 0.2)
typography:
  headline-xl:
    fontFamily: Sora
    fontSize: 64px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Sora
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Sora
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Sora
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.05em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.1em
spacing:
  unit: 4px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
  container-max: 1280px
---

## Brand & Style

This design system evolves the "Night City" aesthetic into a more atmospheric, immersive experience. It captures the sensory overload of a rain-slicked Tokyo alleyway, where high-tech interfaces meet the organic grit of the urban underground. The brand personality is enigmatic, high-fidelity, and technically sophisticated.

The design style combines **Glassmorphism** with **High-Contrast Bold** elements. It utilizes deep, charcoal surfaces that serve as a void for vibrant, multi-color neon glows and light-leak effects. The visual narrative is driven by the reflection of light on wet surfaces, using gradients and blurs to simulate the "bleeding" of neon signs into the surrounding environment. The mood is cinematic, futuristic, and intentionally moody, evoking the feeling of a secure terminal hidden within a glowing metropolis.

## Colors

The palette transition moves away from static pinks toward a dynamic, light-emissive spectrum inspired by urban signage.

- **Primary (Glowing Cyan):** The dominant "signal" color. It represents active data streams, primary actions, and high-energy focal points.
- **Secondary (Lantern Amber/Yellow):** A warm contrast to the cool tech, used for warnings, critical alerts, and highlighted navigational elements.
- **Tertiary (Magenta/Violet):** Used for decorative accents, depth-building gradients, and status variations.
- **Surface:** The foundation is a near-black charcoal (`#08090A`). Surfaces are treated with subtle cool-toned gradients (moving from deep navy to charcoal) to mimic the diffused light of a rainy night.

**Neon Effects:** Every accent color must employ a "bloom" effect. Buttons and active strokes should use multi-layered glows (outer shadows) that combine the base hue with a broader, lower-opacity light leak.

## Typography

The system maintains a sharp, high-tech hierarchy.

**Sora** remains the display powerhouse. Headlines should feel structural and heavy. For a "Night City" editorial feel, use `headline-xl` with a subtle vertical gradient that transitions from a bright white to a faint cyan or magenta tint.

**Hanken Grotesk** is used for all functional body text, ensuring legibility against high-contrast backgrounds.

**JetBrains Mono** is the utility layer. It must be used for all "metadata"—timestamps, coordinates, and system logs. Labels in this font should often be rendered in all-caps to reinforce the terminal aesthetic.

## Layout & Spacing

The layout is a **Fixed Grid** system that emphasizes rigid horizontal and vertical alignment, reflecting the structured architecture of a futuristic city.

- **The Grid:** A 12-column desktop grid with strict 24px gutters. Elements should align precisely to these gutters to maintain a "high-tech" feel.
- **The "Reflective" Margin:** On desktop, use wide 64px margins. The dead space in the margins should occasionally feature "light-leak" gradients (soft magenta or cyan blurs) that creep in from the edges of the screen, simulating off-screen neon signs.
- **Breakpoints:**
  - **Mobile (<768px):** 4-column grid, 16px margins.
  - **Tablet (768px - 1024px):** 8-column grid, 32px margins.
  - **Desktop (>1024px):** 12-column grid, 64px margins.

## Elevation & Depth

This system eschews traditional soft shadows for **Atmospheric Depth** and **Vibrant Outlines**.

- **Tonal Layering:** Objects do not "cast" shadows; they "emit" light. Surfaces use deep, semi-transparent charcoal with `backdrop-filter: blur(20px)` to create a frosted glass effect that picks up the background colors.
- **Light-Leak Overlays:** Use large, low-opacity radial gradients in the background to simulate "wet pavement" reflections. These should shift between Cyan, Magenta, and Amber as the user scrolls.
- **Edge Illumination:** Instead of elevation, use 1px inner borders. Top and left edges should use a brighter tint of the component's accent color, while bottom and right edges use a darker shade, creating a "specular highlight" effect.

## Shapes

The shape language is **Strictly Sharp (0px roundedness)**. Every component should feel like a modular piece of hardware.

- **Clipped Geometry:** Use 45-degree chamfered corners on primary buttons and high-level containers.
- **Structural Brackets:** Frame important data or images with L-shaped corner "brackets" rather than full boxes. This minimizes visual bulk while maintaining a strong high-tech container metaphor.

## Components

### Buttons

- **Style:** Sharp-edged, high-vibrancy blocks.
- **Primary:** Background in `neon-teal`, text in `neutral-black`. Apply a `15px` outer glow in `neon-teal`.
- **Secondary:** Transparent background, `lantern-amber` 1px border. On hover, the border glows and the background fills with a 10% amber tint.

### Cards

- **Style:** Charcoal glass with a top-weighted gradient.
- **Accents:** A 2px "status stripe" on the left edge using a tertiary color (Magenta or Amber).
- **Reflection:** A subtle diagonal "sheen" (light-leak) should occasionally sweep across the card face on hover.

### Input Fields

- **Style:** Underline-only or full-border sharp rectangles. Use a monospace cursor that blinks with a `neon-teal` glow.
- **Focus:** The entire input area gains a subtle cyan light-leak background at 5% opacity.

### Chips & Badges

- **Style:** Sharp, solid-color tags with black `JetBrains Mono` text.
- **Animation:** Important "System" chips should have a slight "flicker" animation, intermittently dropping opacity to 70% to mimic a failing neon sign.

### Navigation

- **Top Bar:** Fixed, 100% width, sharp bottom border. Use a "Data Stream" progress bar at the very top that pulses with cyan light as pages load.
