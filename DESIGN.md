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

Implemented as CSS tokens in `:root` (shared across themes): `--aurora-violet` `167, 139, 250`, `--aurora-pink` `244, 114, 182`, `--aurora-cyan` `56, 224, 232`. The transport **play orb** (the action you take all night long in a listening session) carries the full three-stop Aurora gradient (violet to pink to cyan) as its signature surface, with a soft ring that breathes outward while playing. Export, a quiet secondary action, deliberately does **not** wear the gradient: it is a dark glass pill whose identity comes from an Aurora-tinted icon.

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

Two real web faces, no system UI font. A **humanist sans** carries the working UI (labels, controls, data, body); a **display serif** carries identity and headings, so the dreamy register the wordmark sets extends to every title instead of stopping at the logo. Both are self-hosted variable fonts (no third-party request), so the brand reads consistently on every platform rather than borrowing the OS face.

**UI / body — Hanken Grotesk** (`--font-sans`):

```
'Hanken Grotesk Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif
```

**Display — Fraunces** (`--font-display`, Tailwind `font-display` utility):

```
'Fraunces Variable', Georgia, 'Times New Roman', serif
```

Both imported in `main.tsx` via `@fontsource-variable/*`. Hanken Grotesk is a warm, soft-terminal humanist sans that echoes Fraunces' SOFT axis, sturdy enough for dense labels and tabular data. Fraunces is a soft optical serif; we self-host its variable `soft` cut, and `.font-display` pins `font-variation-settings: 'SOFT' 50` to round the terminals just enough to read oneiric rather than editorial-cold.

Only the **Latin subsets** load (~35KB Hanken + ~62KB Fraunces), on demand through `unicode-range`, so non-Latin locales (ZH, JA, KO, HI, RU) download nothing and fall back per-glyph to their native system face. The trailing `system-ui` entries in `--font-sans` are a last-resort net for the brief `font-display: swap` window and those non-Latin scripts only; every Latin locale renders 100% Hanken, never a system sans.

Reserve Fraunces for identity and headings only: the wordmark, the welcome tagline, and the track title. **Never** put it on labels, buttons, sliders, metadata, or any data/control text, those stay Hanken (display serif in UI chrome reads strange, even in a dreamy product).

Smoothing: `-webkit-font-smoothing: antialiased`, `-moz-osx-font-smoothing: grayscale`.

- **Wordmark**: Fraunces, lowercase `reverie`, weight 300, letter-spacing ~0.04em, solid `#F5F3FF` on the Dream field. The serif, lightness, and spacing carry the dreamy register together; never set it in the Aurora gradient.
- **Hierarchy**: scale steps keep a ratio of at least 1.25. Large display text is Fraunces at light/regular weight; labels and controls are Hanken at medium/semibold. The face change, not just size, separates display from UI. Avoid flat scales.
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

## App shell (two states)

A single decision point, `hasSession` (true once any audio buffer or file exists), governs the whole layout:

- **Welcome stage** (no track): centered and atmospheric. Brand mark, lowercase wordmark, tagline, the hero dropzone, a row previewing the four effects, and the privacy promise on one line. A subtle ambient Aurora drift (`.aurora-stage`, disabled under `prefers-reduced-motion`) sits behind it. This stage teaches the effects, so there is no separate marketing feature grid.
- **Workspace** (track loaded): a sticky top toolbar (brand, replace-track, settings; the brand mark doubles as start-over), then a track title with a quiet metadata strip (values in body text, labels secondary, never the accent), then a two-column working area (`lg:grid-cols-[minmax(320px,360px)_1fr]`) pairing the control rail with the waveform stage, and a sticky transport bar pinned to the bottom. The chrome is the only place that holds a `.glass`-free toolbar surface (translucent + blur, single bottom/top border).

## Interaction model

The product is a late-night listening experience, not an export funnel. Effects are **live**: there is no "apply/bake" step. Moving any control calls `setEffects`, which ramps a persistent Web Audio graph (`utils/effectGraph.ts`) on the playing source with a ~40 ms time constant, so the sound reshapes smoothly as you drift through settings, DAW-style. A speed change rebases the position clock so the playhead stays accurate. Export renders the current settings offline on demand, so download is a quiet secondary action, available whenever a track is loaded. Language and theme live behind a single settings menu in the chrome; language persists to `localStorage` (never the URL), so switching never reloads or loses the session.

## Components

- **Glass surface (`.glass`)**: `rgba(surface, ~0.8)` with `backdrop-filter: saturate(180%) blur(20px)`, a 1px translucent border, and the elevation recipe above. This is the core affordance for panels that float over the ambient backdrop. Use it purposefully for genuine surfaces, not as decoration on every element, and never nest one glass panel inside another. In the workspace exactly two glass panels sit side by side: the control rail and the waveform stage.
- **iOS button (`.ios-button` + `buttonVariants`)**: press-scale (0.96) with the lift living in each variant's shadow/fill so transparent buttons react to hover too (not a brightness-only hover). Variants: `play` (the Aurora-gradient orb, `.btn-aurora`), `glass` (the quiet dark-glass export with an Aurora-tinted icon), `accent` (selected affordance, deepens on hover), `outline`/`secondary` (chrome, Aurora wash on hover), `inverse`, `ghost`, `muted`. The signature `.btn-aurora` gradient pans gently on hover (one-shot, calm); its shadow stacks a violet and a pink glow.
- **Effect mode button (`EffectModeButton`)**: one button per effect (Speed Up, Slowed + Reverb, 8D, Bass Boost), in a 2x2 grid. Not a glass surface (it lives inside the glass rail): a bordered tile that, when selected, pairs an Aurora-tinted fill and border with a Lucide icon and label, so mode is never communicated by color alone.
- **Effect slider (`EffectSlider`)**: a single clear control per effect (speed multiplier, reverb amount, rotation speed, bass intensity). Built on the `.slider` class, whose track fills with the Aurora accent up to the current value via the `--range` custom property, with a soft-halo white thumb. Value rendered large and tabular; formatted for humans (see `utils/formatters.ts`).
- **Waveform timeline (`WaveformTimeline`)**: a centered waveform of the loaded track, drawn with the Aurora stroke, that doubles as the scrub surface (click or drag anywhere, plus arrow keys; `role="slider"`). The bars are non-interactive so they never intercept a seek; each bar column is full-height so its amplitude renders as a height percentage. A slim header carries the now-playing status + clock. The visual centerpiece of the atmosphere principle, in its own glass stage.
- **Transport bar (`PlaybackControls`)**: the sticky bottom bar, laid out as a classic player: circular play/pause leads on the left, a classic timeline (`TransportTimeline`: elapsed time, thin scrubbable track with a hover/focus playhead inside a tall hit area, total time) fills the centre, and a compact volume plus the Export action sit on the right. The play/pause is the Aurora-gradient orb (the hero of a listening session); Export is the quiet dark-glass pill beside it, available whenever a track is loaded. Start-over lives once, on the toolbar brand mark, not here.
- **Volume control (`VolumeControl`)**: a compact icon-plus-short-slider on the right of the transport. The icon reflects the level (mute/low/high). The whole control is a wheel target with a generous hit area, so scrolling over it nudges the volume (and prevents the page from scrolling). Persists to `localStorage` (`reverie:volume`).
- **Settings menu (`SettingsMenu`)**: a single gear button in the chrome opens a dialog grouping appearance (light/dark segmented choice) and language (the ten-locale grid). Theme switches the `.dark` root class.
- **Focus & scrollbar**: a global `:focus-visible` accent outline on every control; custom scrollbar 8px, transparent track, border-tinted thumb (dark/light aware).

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
