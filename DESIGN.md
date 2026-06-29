# Design

The visual system for Reverie. It has two layers that share one accent: a saturated **Dream field** (indigo and violet) that carries the brand identity (icon, social card, hero atmosphere), and a quieter **Workspace** surface (tinted neutrals, light or dark) that hosts the app shell. The **Aurora** gradient ties them together.

Source of truth for implemented tokens: `src/index.css` (CSS custom properties). Brand tokens below extend that system toward the indigo/violet identity introduced with the Reverie rename.

## Mood

Dark-first, with a clean light mode - but theming has grown past a binary toggle into a **mood system** (see "Moods" below).

Scene that forces the choice: a music fan at night, headphones on, lights dimmed, losing themselves in a slowed + reverb edit. That is the home of the brand, so the identity surfaces (icon, OG card, ambient backdrop) live in deep indigo. The in-app workspace still offers a polished light mode for daytime and bright rooms. The interface is always the immersive HUD; a mood only swaps the palette and the animated background.

## Moods

The mood system is a first-class, always-visible control, not a buried setting. The registry lives in `src/contexts/moods.ts`; `MoodContext` writes three things to `<html>` per active mood: `data-mood="<id>"` (selects the colour-token block in `index.css`), `.dark` (kept on every dark-based mood so existing `dark:` utilities and `.dark` rules keep working), and `.immersive` (always on - gates the holographic chrome and mounts the ambient scene). The choice persists to `localStorage` under `mood`; default is **Aurora**.

A mood = **palette + animated ambient scene**, over the one shared HUD. Six moods in two families:

| Mood | Family (`kind`) | Base | Scene |
| --- | --- | --- | --- |
| Light | workspace (calm) | light | daybreak (CSS sun + clouds) |
| Dark | workspace (calm) | dark | dusk |
| Tidal | immersive (vibey) | dark | tidal |
| Nocturne | immersive (vibey) | dark | nocturne |
| Aurora *(default)* | immersive (vibey) | dark | aurora/nebula |
| Horizon | immersive (vibey) | dark | horizon |

Each `MoodDef` carries an `id`, an i18n `labelKey`, a Lucide `icon`, its `kind`, `base`, `scene`, and a `preview` CSS gradient (the gallery thumbnail / live swatch). Two surfaces let users switch it:

- **Mood rail (`MoodRail`)** - inline in the workspace cockpit (right column). A featured **Mood** chip (opens the full gallery), then the five vibey ambiances one tap away (`MOOD_ORDER`: aurora, nocturne, tidal, dark, horizon), then **More moods** → the settings dialog. The fastest way to re-skin the whole atmosphere mid-listen.
- **Settings gallery (`SettingsMenu`)** - a 2-column gallery of all six moods (`MOOD_ORDER`) plus the ten-locale language grid.

## HUD language

The immersive chrome borrows a holographic heads-up-display register (curved rails, instrument dials, scanlines). It is driven by per-mood tokens and a set of `hud-*` classes in `index.css`:

- **`--hud-line`** (RGB hairline) and **`--hud-glow`** are set in each `[data-mood]` block, so the chrome recolours with the mood.
- **`.hud-rail` / `.hud-rail-top` / `.hud-rail-bottom`** - the sticky header and transport, skinned as curved HUD bars; **`.hud-bow` / `.hud-bow-inner`** give them the bowed edge.
- **`.hud-frame`** - the panel framing for the control rail and mood rail; its `::after` glow and border breathe with the audio (see below).
- **`.hud-readout`** - small monospaced telemetry labels (e.g. "Mood", "FX").
- **`.hud-scanlines` / `.hud-vignette`** - full-viewport overlays that sit over the ambient scene.
- **`HudDial`** (`components/hud/HudDial.tsx`) - a memoised SVG instrument dial (concentric rings, graduated tick rim, accent arc) wrapping the transport play orb; its rings rotate while a track plays. Pure decoration, coloured by `--hud-line` / `--color-accent`.

## Audio reactivity (breathe with the music)

The signature: the interface swells and pulses with the playing track - subconscious emotional feedback, not a gamer RGB visualiser. `useAudioReactivity` (`src/hooks`) reads the live playback analyser each frame and publishes normalised energies as CSS custom properties on `<html>`:

| Variable | Meaning |
| --- | --- |
| `--audio-level` | overall loudness (time-domain RMS, fast attack / slow release) |
| `--audio-bass` | low-band energy (kick/bass weight) |
| `--audio-mid` | mid-band energy |
| `--audio-treble` | high-band energy (air/transients) |
| `--audio-pulse` | onset flash - spikes on a kick, decays fast |

Stylesheets consume them so different surfaces react to different parts of the music: `.scene-breath` bloom swells with level/mid, `.scene-particles` brighten with treble, `.hud-frame` borders/glow pulse with mid/level, the play orb halo (`.audio-orb-glow`) and `play-pulse` punch on bass + onset, and the waveform aura (`.wf-aura`) lifts. Panel *positions* never move: reactivity stays on non-positional cues (glow, borders, backdrop scale), so the layout never drifts. The hook only runs while a track plays, eases everything back to rest on stop, and **clears to flat under `prefers-reduced-motion`** - the values default to `0`, so the whole effect is simply absent in the reduced-motion / idle state. The `SpectrumMeter` (`components/SpectrumMeter.tsx`) is the one explicit instrument: a compact Canvas-2D live spectrum in the transport that settles to a calm baseline when idle or reduced-motion.

## Ambient scene

`AmbientScene` mounts the active mood's `scene` full-viewport behind the glass. The current "wallpaper-engine" approach paints a real cosmic image as the full-bleed base (`.scene-photo`, from `public/backgrounds/*.jpg`) with only a slow CSS drift; `light`/daybreak keeps CSS sun + cloud layers instead. The orphaned procedural scenes (`scenes/NebulaScene`, `scenes/TidalScene`, and the `scenes/webgl/*` shaders) are retired from the render but kept for a future animated layer. Over the base sit `.scene-veil`, `.scene-breath`, `.scene-particles`, and the HUD overlays - all silenced to a still frame under `prefers-reduced-motion`. The cockpit's translucent panels - and the raked side consoles that angle the view toward the centre - let this scene breathe through the interface.

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

Implemented as CSS tokens in `:root` (shared across moods): `--aurora-violet` `167, 139, 250`, `--aurora-pink` `244, 114, 182`, `--aurora-cyan` `56, 224, 232`. The Aurora gradient still signs the brand mark, the waveform stroke, and the `default` button (welcome CTA). The transport **play orb** (the action you take all night long in a listening session) used to wear that fixed gradient, but under the immersive-moods system it stayed violet/pink/cyan in every palette and read as a foreign body. It now wears the **active mood's accent** (`.btn-orb`): a glossy sphere lit at the crown in `--color-accent`, easing to a deep Dream-Indigo base, with an accent hairline rim and a `--hud-glow` halo, plus the soft ring that breathes outward while playing. The Dream-Indigo anchor (`13, 9, 31`, shared by every palette, light included) keeps the white play/pause glyph at AA contrast however bright the accent is, so the orb recolours with the rest of the HUD while staying the focal control. The breathing ring (`.play-pulse`) and the audio-reactive halo are accent-tinted too. Export, a quiet secondary action, deliberately does **not** wear a fill: it is a dark glass pill whose identity comes from an Aurora-tinted icon.

Usage rule: apply Aurora to **strokes, fills, the mark, and active-state indicators**. Never to body text. `background-clip: text` on a gradient is banned here; emphasize with weight and size instead.

**Accent as type - `--color-accent-text`.** The bright accent reads as a fill/stroke colour; on the light workspace it is far too pale to use as text (~2.2:1). So accent-coloured **type and icons** (slider values, the upload link, the processing %, active labels, active mode/mood labels) use a dedicated `--color-accent-text` token instead of `--color-accent`. In light it is a deep rose (`178, 30, 81`) brought to AA on both the surface and the pale accent tints; on dark palettes it tracks `--color-accent` (already AA), except `aurora`, which lifts it to a brighter lilac (`196, 140, 252`) so it clears AA on the active-chip tints. `--color-accent` itself stays the bright value for fills, borders, strokes, the slider track, and the focus ring.

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

**UI / body - Hanken Grotesk** (`--font-sans`):

```
'Hanken Grotesk Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif
```

**Display - Fraunces** (`--font-display`, Tailwind `font-display` utility):

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
- **Mood switch**: background and color transition at 300ms ease.
- **Never** animate layout properties (width, height, top, left). Animate transform and opacity.
- **Reduced motion**: honor `prefers-reduced-motion`. The waveform and any ambient drift must fall back to a static state; the app stays fully usable without motion.

## App shell (desktop gate + two states)

Before either stage, a **desktop gate** guards the whole app. Reverie is desktop-only: the cockpit needs a wide canvas, so viewports under `VIEWPORT.MIN_DESKTOP_WIDTH` (1024px, matching Tailwind's `lg` where the three-column grid activates) render `DesktopOnlyGate` instead - a branded, AmbientScene-backed "open on a larger screen" stage (brand mark, a monitor glyph in the Aurora well, an invitation to switch to a computer). There is **no bypass**: we send phone visitors to a real screen rather than ship a cramped layout. The check (`useIsViewportTooNarrow`) tracks `matchMedia`, so the app reveals or hides itself live as the window is resized - no reload.

Once the viewport is wide enough, a single decision point, `hasSession` (true once any audio buffer or file exists), governs the layout:

Both stages mount the `AmbientScene` behind everything; the chrome (header + transport) is the HUD-skinned `.hud-rail`.

- **Welcome stage** (no track): centered and atmospheric. Brand mark, lowercase wordmark, tagline, the hero dropzone, a row previewing the four effects, and the privacy promise on one line. A subtle ambient Aurora drift (`.aurora-stage`, disabled under `prefers-reduced-motion`) sits behind it. This stage teaches the effects, so there is no separate marketing feature grid.
- **Workspace** (track loaded): a sticky top HUD rail (brand, replace-track, settings; the brand mark doubles as start-over), then a **three-column cockpit** (`lg:grid-cols-[minmax(320px,400px)_minmax(0,1fr)_minmax(280px,340px)]`). The two side columns are **raked 3D consoles**: the effects control rail (left) and the **mood rail** (`MoodRail`, right) each sit in their own `.hud-console` perspective wrapper and tilt inward toward the viewer (a cockpit-visor "V" - `rotateY ±18°`, hinged on the inner edge, desktop-only and static, so it never drives positional drift). The **centre column stays flat** (a 3D ancestor would flatten its glass blur) and stacks two HUD plates: the **track-identity panel** (title + format telemetry) directly above the **waveform** (`WaveformTimeline`). A sticky HUD transport bar is pinned to the bottom.

## Interaction model

The product is a late-night listening experience, not an export funnel. Effects are **live**: there is no "apply/bake" step. Moving any control calls `setEffects`, which ramps a persistent Web Audio graph (`utils/effectGraph.ts`) on the playing source with a ~40 ms time constant, so the sound reshapes smoothly as you drift through settings, DAW-style. A speed change rebases the position clock so the playhead stays accurate. Export renders the current settings offline on demand, so download is a quiet secondary action, available whenever a track is loaded. Language and mood live behind a single settings menu in the chrome; language persists to `localStorage` (never the URL), so switching never reloads or loses the session.

## Components

- **Glass surface (`.glass`)**: `rgba(surface, ~0.8)` with `backdrop-filter: saturate(180%) blur(20px)`, a 1px translucent border, and the elevation recipe above. This is the core affordance for panels that float over the ambient backdrop. Use it purposefully for genuine surfaces, not as decoration on every element, and never nest one glass panel inside another. In the workspace cockpit, two `.hud-frame` glass panels flank the centre as raked 3D consoles (see App shell) - the effects control rail (left) and the mood rail (right) - while the flat centre stacks the track-identity panel over the waveform. In the immersive moods the glass is reskinned to the HUD treatment (`.immersive .glass`): a thinner fill, a luminous `--hud-line` hairline, and inner + outer glow.
- **iOS button (`.ios-button` + `buttonVariants`)**: press-scale (0.96) with the lift living in each variant's shadow/fill so transparent buttons react to hover too (not a brightness-only hover). Variants: `play` (the mood-accent orb, `.btn-orb`, recolours per mood over a deep Dream-Indigo base), `glass` (the quiet dark-glass export with an Aurora-tinted icon), `accent` (selected affordance, deepens on hover), `outline`/`secondary` (chrome, Aurora wash on hover), `inverse`, `ghost`, `muted`. The signature `.btn-aurora` gradient pans gently on hover (one-shot, calm); its shadow stacks a violet and a pink glow.
- **Effect mode button (`EffectModeButton`)**: one button per effect (Speed Up, Slowed + Reverb, 8D, Bass Boost), in a 2x2 grid. Not a glass surface (it lives inside the glass rail): a bordered tile that, when selected, pairs an Aurora-tinted fill and border with a Lucide icon and label, so mode is never communicated by color alone.
- **Effect slider (`EffectSlider`)**: a single clear control per effect (speed multiplier, reverb amount, rotation speed, bass intensity). Built on the `.slider` class, whose track fills with the Aurora accent up to the current value via the `--range` custom property, with a soft-halo white thumb. Value rendered large and tabular; formatted for humans (see `utils/formatters.ts`).
- **Waveform (`WaveformTimeline`)**: the centre instrument - a `.hud-frame` glass plate holding the loaded track's mirrored, Aurora-stroked envelope with a glowing white playhead. A header reads status + clock (`Now playing` / `0:00 / total`), a footer reads the live effect (`STANDBY` / `0.70× · 50% RV`), and the envelope reshapes live to preview the active effect. Click, drag, or arrow-key to seek (`role="slider"`); the bars are non-interactive so they never intercept a seek, played bars glow with the accent, the rest stay faint. Its aura (`.wf-aura`) lifts with level + treble.
- **Track-identity panel**: a flat `.hud-frame` plate in the centre column, directly above the waveform. A `hud-readout` tab (the localized "Track"), the title, a `.hud-ruler` divider, then the format telemetry spread edge-to-edge as equal readout columns (Format, Size, Bitrate, Sample rate, Channels, Bit depth - labels in the `hud-readout` register, values tabular; both carry a `title` so a clipped readout reveals in full on hover). The title scrolls (`MarqueeText`) only when it would clip, at a calm constant px/s, and falls back to a static ellipsis under reduced motion; the file extension is lifted out of the title into the **Format** readout.
- **Transport seekbar (`TransportTimeline`)**: the thin scrubbable track in the bottom transport - elapsed time, a draggable playhead in a tall transparent hit area, total duration.
- **Transport bar (`PlaybackControls`)**: the sticky bottom HUD rail, laid out as a classic player: the play/pause orb leads on the left, the transport seekbar (`TransportTimeline`) fills the centre, then a compact live spectrum (`SpectrumMeter`, `lg`+ only), the volume, and the Export action on the right. The play/pause is the mood-accent orb (the hero of a listening session, recoloured per mood), wrapped in a holographic instrument dial (`HudDial`) whose rings spin while playing and whose halo punches with the beat; Export is the quiet dark-glass pill, available whenever a track is loaded. Start-over lives once, on the toolbar brand mark, not here.
- **Mood rail (`MoodRail`)**: the right column of the cockpit - an always-visible mood picker (see "Moods"). A featured Mood chip opens the full gallery; the five vibey ambiances sit one tap below; "More moods" drops into the settings dialog for the calm faces + language.
- **HUD dial (`HudDial`)**: a memoised SVG instrument dial (concentric rings, graduated tick rim, accent arc) decorating the play orb; coloured by `--hud-line` / `--color-accent`, rings spin under `is-spinning` while playing, frozen under reduced-motion.
- **Spectrum meter (`SpectrumMeter`)**: a small Canvas-2D live spectrum (28 bars, ambient→accent vertical gradient) in the transport. Draws real frequency data while playing; settles to a calm static baseline when idle or under reduced-motion (never fakes motion).
- **Volume control (`VolumeControl`)**: a compact icon-plus-short-slider on the right of the transport. The icon reflects the level (mute/low/high). The whole control is a wheel target with a generous hit area, so scrolling over it nudges the volume (and prevents the page from scrolling). Persists to `localStorage` (`reverie:volume`).
- **Settings menu (`SettingsMenu`)**: a single gear button in the chrome opens a dialog with a 2-column gallery of all six moods (`MOOD_ORDER`, each a live `preview` swatch) and the ten-locale language grid. Selecting a mood drives `data-mood` + `.dark` + `.immersive` on the root (see "Moods").
- **Focus & scrollbar**: a global `:focus-visible` accent outline on every control; custom scrollbar 8px, transparent track, border-tinted thumb (dark/light aware).

## Iconography & Brand Assets

- **UI icons**: [Lucide](https://lucide.dev) (`lucide-react`). Consistent stroke weight, no mixed icon families.
- **Brand mark** (`public/favicon.svg`): a reverberating Aurora sound wave on the Dream field. A bold main wave, a lower-opacity "ghost" wave (the reverb tail), and radiating echo arcs (reverb and 8D spatiality), with violet/cyan pulse dots at each end. Rounded-square badge.
- **Generated assets** (rendered from SVG): `icon-192.png`, `icon-512.png` (full-bleed, mark kept inside the maskable safe zone with ~18% padding), `apple-touch-icon.png` (180px), `og-image.png` (1200x630: badge + `reverie` wordmark + tagline "Slowed + reverb · 8D audio · speed · bass boost"). Regenerate from the source SVGs if the mark changes.
- **Gradient direction**: Aurora runs left to right (violet to cyan) across the mark and accents; the Dream field runs diagonally (top-left to bottom-right).

## Accessibility

- WCAG 2.1 AA contrast for text and interactive states in both moods. Validate Aurora-on-Dream combinations; reserve the gradient for non-text elements where contrast is harder to guarantee.
- Visible focus states on every interactive control; full keyboard operability.
- Meaning never by color alone: effect modes and states pair hue with labels and icons.
- `prefers-reduced-motion` respected throughout (see Motion).
- Layouts tolerate text expansion and non-Latin scripts across all 10 locales.
