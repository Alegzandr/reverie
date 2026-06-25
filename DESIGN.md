# Design

The visual system for Reverie. It has two layers that share one accent: a saturated **Dream field** (indigo and violet) that carries the brand identity (icon, social card, hero atmosphere), and a quieter **Workspace** surface (tinted neutrals, light or dark) that hosts the app shell. The **Aurora** gradient ties them together.

Source of truth for implemented tokens: `src/index.css` (CSS custom properties). Brand tokens below extend that system toward the indigo/violet identity introduced with the Reverie rename.

## Theme

Dark-first, with a clean light mode.

Scene that forces the choice: a music fan at night, headphones on, lights dimmed, losing themselves in a slowed + reverb edit. That is the home of the brand, so the identity surfaces (icon, OG card, ambient backdrop) live in deep indigo. The in-app workspace still offers a polished light mode for daytime and bright rooms, detected automatically with a manual toggle (`.dark` class on the root).

## Color

**Strategy: Committed on brand surfaces, Restrained in the workspace.** Identity surfaces let a saturated indigo/violet field own 40 to 60% of the canvas, with the Aurora gradient as the signature accent. The app shell pulls back to tinted neutrals plus the Aurora accent on interactive and active states only.

Colors are authored in OKLCH (chroma eased toward 0 as lightness nears the extremes). Hex/RGB are the currently implemented values. No pure `#000` or `#fff`: every neutral is tinted toward the indigo brand hue (~270 to 290).

### Dream field (brand identity)

| Role | OKLCH (approx) | Hex |
| --- | --- | --- |
| Dream Indigo (deepest) | `oklch(0.19 0.08 292)` | `#160C36` |
| Dream Indigo 800 | `oklch(0.22 0.10 290)` | `#1C0F44` |
| Dream Violet 700 | `oklch(0.26 0.12 293)` | `#241152` |
| Dream Violet 600 | `oklch(0.34 0.16 305)` | `#46176E` |
| Halo Violet (glow) | `oklch(0.53 0.24 293)` | `#7C3AED` |

Background is a diagonal Indigo 800 to Violet 600 gradient, lifted by a soft radial Halo Violet glow (the dreamy bloom behind the mark). On the OG card a second, fainter pink halo (`#EC4899` at low alpha) warms the lower-right.

### Aurora accent (shared signature)

The gradient that runs across the brand mark, active controls, and the waveform. Left to right:

| Stop | OKLCH (approx) | Hex |
| --- | --- | --- |
| Aurora Violet | `oklch(0.72 0.15 295)` | `#A78BFA` |
| Aurora Pink | `oklch(0.73 0.17 351)` | `#F472B6` |
| Aurora Cyan | `oklch(0.84 0.12 195)` | `#38E0E8` |

Implemented as CSS tokens in `:root` (shared across themes): `--aurora-violet` `167, 139, 250`, `--aurora-pink` `244, 114, 182`, `--aurora-cyan` `56, 224, 232`. The primary action button (Apply Effects) uses the full three-stop Aurora gradient (violet to pink to cyan) as its signature surface.

Usage rule: apply Aurora to **strokes, fills, the mark, and active-state indicators**. Never to body text. `background-clip: text` on a gradient is banned here; emphasize with weight and size instead.

### Workspace tokens (implemented, `src/index.css`)

RGB triplets, consumed as `rgb(var(--token))` / `rgba(var(--token), a)`.

**Dark (default brand mood)**

| Token | OKLCH (approx) | RGB | Hex |
| --- | --- | --- | --- |
| `--color-background` | `oklch(0.16 0.045 290)` | `13, 9, 31` | `#0D091F` |
| `--color-surface` | `oklch(0.225 0.04 288)` | `27, 24, 45` | `#1B182D` |
| `--color-text` | `oklch(0.95 0.01 274)` | `236, 240, 252` | `#ECF0FC` |
| `--color-text-secondary` | `oklch(0.74 0.03 268)` | `162, 175, 197` | `#A2AFC5` |
| `--color-border` | `oklch(0.42 0.055 285)` | `74, 73, 106` | `#4A496A` |
| `--color-accent` | `oklch(0.79 0.13 5)` | `255, 151, 178` | `#FF97B2` |
| `--color-ambient` | `oklch(0.76 0.13 230)` | `56, 189, 248` | `#38BDF8` |

**Light**

| Token | OKLCH (approx) | RGB | Hex |
| --- | --- | --- | --- |
| `--color-background` | `oklch(0.97 0.006 285)` | `244, 245, 249` | `#F4F5F9` |
| `--color-surface` | `oklch(0.995 0.003 285)` | `253, 253, 255` | `#FDFDFF` |
| `--color-text` | `oklch(0.22 0.04 277)` | `18, 23, 44` | `#12172C` |
| `--color-text-secondary` | `oklch(0.51 0.04 270)` | `94, 105, 130` | `#5E6982` |
| `--color-border` | `oklch(0.89 0.018 285)` | `217, 217, 231` | `#D9D9E7` |
| `--color-accent` | `oklch(0.77 0.14 12)` | `255, 138, 163` | `#FF8AA3` |
| `--color-ambient` | `oklch(0.79 0.10 220)` | `72, 199, 236` | `#48C7EC` |

The body backdrop layers two radial gradients (ambient at 20% 20%, accent at 80% 10%) over the base background, echoing the Dream halo at workspace intensity.

**Hue alignment (applied):** the workspace now shares the Dream hue. `--color-background`, `--color-surface`, and `--color-border` were shifted to hue ~285 to 290 at their original lightness, so the app shell reads as the same family as the icon and OG card. The workspace stays deliberately calmer: lower chroma than the saturated brand field, so it recedes behind content instead of competing with it.

## Typography

System font stack (no web-font payload, instant render):

```
-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif
```

Smoothing: `-webkit-font-smoothing: antialiased`, `-moz-osx-font-smoothing: grayscale`.

- **Wordmark**: lowercase `reverie`, weight 300, generous letter-spacing (~0.06em), solid `#F5F3FF` on the Dream field. The lightness and spacing carry the dreamy register; never set it in the Aurora gradient.
- **Hierarchy**: scale steps keep a ratio of at least 1.25. Pair a light or regular weight for large display text with medium/semibold for labels and controls. Avoid flat scales.
- **Body**: cap measure at 65 to 75ch. Secondary/technical text (bitrate, sample rate) uses `--color-text-secondary`.

## Radius & Spacing

- **Radius scale**: sm 8px, md 12px, lg 16px, xl 24px, pill 9999px. Glass surfaces use lg to xl. The app badge corner is ~22% of its size (rounded-square superellipse feel), matching the icon's `rx="22"` on a 100-unit canvas.
- **Spacing**: vary padding for rhythm rather than applying one uniform value. Group related controls tightly; let effect sections breathe. Do not wrap every element in a container, and never nest glass surfaces.

## Elevation

Depth comes from the glass treatment plus a colored, directional shadow rather than flat gray drop shadows.

```css
/* light */
box-shadow: 0 1px 2px -1px rgba(0,0,0,0.06),
            0 18px 50px -24px rgba(var(--color-accent), 0.35);
/* dark */
box-shadow: 0 1px 2px -1px rgba(0,0,0,0.30),
            0 18px 50px -24px rgba(var(--color-ambient), 0.28);
```

The tinted secondary shadow (accent in light, ambient in dark) is what makes surfaces feel like they float over the ambient gradient.

## Motion

- **Easing**: button feedback uses `cubic-bezier(0.4, 0, 0.2, 1)` at ~200ms. For entrances and reveals prefer ease-out-expo/quint. No bounce, no elastic.
- **Press**: `.ios-button:active` scales to `0.96`; hover lifts brightness (1.05 light, 1.15 dark).
- **Theme switch**: background and color transition at 300ms ease.
- **Never** animate layout properties (width, height, top, left). Animate transform and opacity.
- **Reduced motion**: honor `prefers-reduced-motion`. The waveform and any ambient drift must fall back to a static state; the app stays fully usable without motion.

## Components

- **Glass surface (`.glass`)**: `rgba(surface, ~0.8)` with `backdrop-filter: saturate(180%) blur(20px)`, a 1px translucent border, and the elevation recipe above. This is the core affordance for panels that float over the ambient backdrop. Use it purposefully for genuine surfaces, not as decoration on every element, and never nest one glass panel inside another.
- **iOS button (`.ios-button`)**: relative, overflow-hidden, the press-scale and brightness-hover transitions above. Primary actions read as the most prominent controls. Apply Effects carries the three-stop Aurora gradient (the brand signature on the hero action); its shadow is tinted with Aurora Pink.
- **Effect mode button (`EffectModeButton`)**: one button per effect (Speed Up, Slowed + Reverb, 8D, Bass Boost). Selected state is marked with the Aurora accent plus a label and Lucide icon, so mode is never communicated by color alone.
- **Effect slider (`EffectSlider`)**: a single clear control per effect (speed multiplier, reverb amount, rotation speed, bass intensity). Track filled with the Aurora accent; value formatted for humans (see `utils/formatters.ts`).
- **Waveform timeline (`WaveformTimeline`)**: real-time waveform for original ("raw") and processed ("fx") audio, drawn with the Aurora stroke. The visual centerpiece of the atmosphere principle.
- **Playback & export controls (`PlaybackControls`)**: play/pause/seek/volume plus export. Volume persists to `localStorage` (`reverie:volume`).
- **Language selector & theme toggle**: unobtrusive, in the app chrome. Theme toggle switches the `.dark` root class.
- **Custom scrollbar**: 8px, transparent track, translucent thumb (dark/light aware).

## Iconography & Brand Assets

- **UI icons**: [Lucide](https://lucide.dev) (`lucide-react`). Consistent stroke weight, no mixed icon families.
- **Brand mark** (`public/favicon.svg`): a reverberating Aurora sound wave on the Dream field. A bold main wave, a lower-opacity "ghost" wave (the reverb tail), and radiating echo arcs (reverb and 8D spatiality), with violet/cyan pulse dots at each end. Rounded-square badge.
- **Generated assets** (rendered from SVG): `icon-192.png`, `icon-512.png` (full-bleed, mark kept inside the maskable safe zone with ~18% padding), `apple-touch-icon.png` (180px), `og-image.png` (1200x630: badge + `reverie` wordmark + tagline "Slowed + reverb · 8D audio · speed · bass boost"). Regenerate from the source SVGs if the mark changes.
- **Gradient direction**: Aurora runs left to right (violet to cyan) across the mark and accents; the Dream field runs diagonally (top-left to bottom-right).

## Accessibility

- WCAG 2.1 AA contrast for text and interactive states in both themes. Validate Aurora-on-Dream combinations; reserve the gradient for non-text elements where contrast is harder to guarantee.
- Visible focus states on every interactive control; full keyboard operability.
- Meaning never by color alone: effect modes and states pair hue with labels and icons.
- `prefers-reduced-motion` respected throughout (see Motion).
- Layouts tolerate text expansion and non-Latin scripts across all 10 locales.
