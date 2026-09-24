# Design

The visual system for Reverie. It has two layers that share one accent: a saturated **Dream field** (indigo and violet) that carries the brand identity (icon, social card, hero atmosphere), and a quieter **Workspace** surface (tinted neutrals, light or dark) that hosts the app shell. The **Aurora** gradient ties them together.

Source of truth for implemented tokens: `src/index.css` (CSS custom properties). Brand tokens below extend that system toward the indigo/violet identity introduced with the Reverie rename.

## Mood

Dark-first, with a clean light mode - but theming has grown past a binary toggle into a **mood system** (see "Moods" below).

Scene that forces the choice: a music fan at night, headphones on, lights dimmed, losing themselves in a slowed + reverb edit. That is the home of the brand, so the identity surfaces (icon, OG card, the default world) live in deep indigo. Daybreak keeps a polished light mood for daytime and bright rooms. The metaphor holding it together: **you are looking out through a spacesuit visor**. The interface is a holographic HUD projected on that glass; a mood swaps its palette and the living world beyond it.

## Moods

The mood system is a first-class, always-visible control, not a buried setting. The registry lives in `src/contexts/moods.ts`; `MoodContext` writes three things to `<html>` per active mood: `data-mood="<id>"` (selects the colour-token block in `index.css`), `.dark` (on every mood but `light`, so `dark:` utilities and `.dark` rules keep working), and `.immersive` (always on). The choice persists to `localStorage` under `mood`; default is **aurora**. ("Mood" is the product term; never "theme".)

A mood = **palette + living world**, under the one shared visor HUD:

| Mood id | Label (EN) | World | Base |
| --- | --- | --- | --- |
| `aurora` *(default)* | Nebula Drift | `nebula` - the Veil: a supernova shell drawn as fine luminous filaments, a low canopy across the sky | dark |
| `dark` | Borealis | `borealis` - green aurora arcs over snowy crests and a mirror lake | dark |
| `tidal` | Moon Tide | `tide` - a stylised mirror sea under the moon | dark |
| `horizon` | Echo Valley | `valley` - layered mountains round a still lake at dusk | dark |
| `nocturne` | Singularity | `singularity` - a black hole bending its own spectrum disk | dark |
| `light` | Daybreak | `daybreak` - a sunlit sea of clouds | light |

Each `MoodDef` carries an `id`, an i18n `labelKey`, a Lucide `icon`, its `base` and its `world`; `worldPoster()` / `worldThumb()` resolve the stills in `public/worlds/`. One surface switches it: the **world switcher** (`WorldSwitcher`), centred in the top bar and on the welcome stage - a radiogroup of round world thumbnails where the active one opens out to show its name. Arrow keys walk it like any radiogroup.

## HUD language (the visor)

Everything in the chrome reads as light projected on a helmet visor: see-through plates, lit hairlines, instrument labels, a gentle rake toward the eye. It is driven by per-mood colour tokens (`--hud-line` hairline, `--hud-glow` bloom, `--scene-veil` legibility wash, all set in each `[data-mood]` block) and a few geometry tokens on `:root`: `--hud-curve` (visor bow depth), `--hud-rake` / `--hud-rake-depth` (console angle and perspective), `--hud-bracket` (corner bracket size), `--visor-radius` / `--visor-rim` / `--visor-rim-alpha` (the helmet opening).

- **`.pane`** - the holographic plate: a near-clear surface tint that thins toward the bottom, 4px scanlines in `--hud-line`, a luminous hairline, an inner bloom in `--hud-glow`, over `blur(22px) saturate(170%)`. `::before` masks a hairline frame down to four lit **corner brackets**; `::after` is the inner glow that breathes with the music's mids.
- **Visor rails** - `.top-bar::before` and `.dock-wrap::before` paint full-width plates whose elliptical corner radii sum to the whole width, so the top bar and the dock bow toward the centre like the rim of a visor, each with a lit hairline edge. The bow overhangs only the open centre.
- **Consoles** - `.console-left` / `.console-right` are perspective wrappers around the side panes, which swing their outer edge toward the viewer (`rotateY(±var(--hud-rake))`, hinged on the inner edge): a cockpit "V" around the view. Each console is its own perspective root (never the grid, which would flatten the centre's glass), and the raked plates carry a raised fill because backdrop blur flattens under a 3D pose.
- **`.helmet`** - a fixed overlay above the interface (below every popover, never taking a pointer): the visor's rounded rim, a breath of glare at the top-left, and two graduated horizon rulers on the side edges. Its hairline brightens faintly with `--audio-level`.
- **`.pane-title`** - section heads as instrument labels: small caps, 0.2em tracking, a lit diamond tick. **`.hud-readout`** - small uppercase labels (11px, `--color-text-secondary`, full opacity: they must read at AA on every mood).

## Audio reactivity (breathe with the music)

The signature: the world and the interface swell with the playing track - subconscious emotional feedback, not a gamer RGB visualiser. `useAudioReactivity` (`src/hooks`) reads the live playback analyser each frame and publishes normalised energies as CSS custom properties on `<html>`:

| Variable | Meaning |
| --- | --- |
| `--audio-level` | overall loudness (time-domain RMS, fast attack / slow release) |
| `--audio-bass` | low-band energy (kick/bass weight) |
| `--audio-mid` | mid-band energy |
| `--audio-treble` | high-band energy (air/transients) |
| `--audio-pulse` | onset flash - spikes on a kick, decays fast |

Stylesheets consume them so different surfaces react to different parts of the music: pane glows (`.pane::after`) breathe with mid/level, the helmet hairline with the level, the play orb halo (`.audio-orb-glow`) and `play-pulse` punch on bass + onset, and the waveform aura (`.wf-aura`) lifts. Every consumer eases over hundreds of milliseconds and the values are published in hundredths, only when they change. The living world listens on its own, richer feed (see below). Panel *positions* never move: reactivity stays on non-positional cues (glow, borders, light), so the layout never drifts. The hook only runs while a track plays, eases everything back to rest on stop, and **clears to flat under `prefers-reduced-motion`**. The `SpectrumMeter` is the one explicit instrument: a compact Canvas-2D live spectrum in the dock that settles to a calm baseline when idle or under reduced motion.

## Living worlds

`AmbientScene` is mounted once at the app root (above the welcome/workspace split, so starting a session never recompiles or blinks the world). Bottom to top: the **posters** (a 1920x1080 still of every world in `public/worlds/`, stacked, the active one faded in), the **living world** (`SceneWorld`), `.scene-veil` (a wash of `--scene-veil` behind the top bar and dock), `.scene-vignette`, and - above the interface - the `.helmet`.

- **Engine** (`scenes/world/engine.ts`): WebGL2, one fragment shader per world (`scenes/world/shaders/`), over a shared prelude (tileable 3D/2D noise textures, starfield, ACES tonemap, palette uniforms linearised from the mood tokens). Quality comes from temporal anti-aliasing (Halton jitter into RGBA16F history, neighbourhood clamp) and a present pass with a light sharpen + dither, at an adaptive render scale (`SCENE_WORLD.RENDER_SCALE_*`). It idles at about 30fps without music, pauses when the tab hides, and a mood switch cross-fades in-engine from a snapshot of the outgoing world.
- **Music** (`audioFeed.ts`): a tee analyser off the playback graph (`analyserSource.ts`) folds 64 log bands into a scrolling spectrum-history texture (60 rows/s), plus level/bass/mid/treble and kick detection. Each world spends it in its own way (ripples across the moon's glade, aurora curtains flaring, the accretion disk printing the spectrum) - contemplative, never a visualiser.
- **Art direction**: stylised, not realistic (the sea is a simplified mirror, not a simulation); clean silhouettes, no noisy or smeared textures, one focal light per world. Regenerate the posters from the engine whenever a world changes.
- **Gates**: live rendering needs a desktop fine pointer, a non-software GPU tier and WebGL2, and the *Living world* setting on; anywhere else the posters are the backdrop. Under reduced motion the world accumulates one calm frame per change and stops. Never call `loseContext` in a React cleanup (a dead context composites as a white sheet under StrictMode's effect replay).

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

Implemented as CSS tokens in `:root` (shared across moods): `--aurora-violet` `167, 139, 250`, `--aurora-pink` `244, 114, 182`, `--aurora-cyan` `56, 224, 232`. The Aurora gradient still signs the brand mark, the waveform stroke, and the `default` button (welcome CTA). The transport **play orb** (the action you take all night long in a listening session) used to wear that fixed gradient, but under the immersive-moods system it stayed violet/pink/cyan in every palette and read as a foreign body. It now wears the **active mood's accent** (`.btn-orb`): a glossy sphere lit at the crown in `--color-accent`, easing to a deep Dream-Indigo base, with an accent hairline rim and a `--hud-glow` halo, plus the soft ring that breathes outward while playing. The Dream-Indigo anchor (`13, 9, 31`, shared by every palette, light included) keeps the white play/pause glyph at AA contrast however bright the accent is, so the orb recolours with the rest of the HUD while staying the focal control. The breathing ring (`.play-pulse`) and the audio-reactive halo are accent-tinted too. Export, a quiet secondary action, deliberately does **not** wear a fill: it is a dark glass pill whose identity comes from an accent-tinted icon (`--color-accent-text`). It answers in place: a spinner while rendering, then a check, "Saved" and the file's name for `EXPORT_NOTICE.VISIBLE_MS`. The Dream-Indigo anchor is the `--dream-deep` token.

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

One face: **Geist Mono**, the instrument voice of a visor readout, for every label, control, value and title. Self-hosted variable font (`@fontsource-variable/geist-mono/wght.css`, imported in `main.tsx`; no third-party request). Latin, Latin Extended and Cyrillic subsets load on demand through `unicode-range`; CJK and Devanagari fall back per-glyph to the system face. `--font-sans` and `--font-display` both resolve to it (with `ui-monospace` / `SF Mono` / `Menlo` / `Consolas` as the swap net), so the `font-display` utility still works but no longer switches face.

Hierarchy comes from weight, size and case, not a second family:

- **Wordmark** (`.wordmark`): lowercase `reverie`, weight 300, letter-spacing 0.14em. Never in the Aurora gradient.
- **Display** (track title, welcome wordmark): light (300) with slightly negative tracking - mono is wide, so display sizes run a step smaller than a proportional face would.
- **Instrument labels** (`.pane-title`, the now-playing kicker, `.hud-readout`): small caps with wide tracking (0.16 to 0.2em).
- **Controls and data**: regular to semibold; numbers are naturally tabular.
- Scale steps keep a ratio of at least 1.25. Secondary/technical text uses `--color-text-secondary`.

Smoothing: `-webkit-font-smoothing: antialiased`, `-moz-osx-font-smoothing: grayscale`.

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
- **Press**: `.ios-button:active` scales to `0.96`.
- **Mood switch**: the palette cross-fades (`.mood-shifting`) while the living world cross-fades in-engine (the posters cross-fade wherever it isn't running).
- **Cockpit power-on (`.cockpit-boot`)**: starting a session brings the interface in once - the visor rails slide into place (transform on the bar, fade on its plate and content, so the glass keeps its blur), the consoles fade up (opacity only: they carry the rake), the now-playing readout rises and the waveform focuses in. One orchestrated second; App toggles the class straight on the shell element and never under reduced motion.
- **Resting interface - fullscreen only** (`useFullscreenAutoHide`, preference in `useUiRest`): windowed, the interface never rests. In fullscreen, after `FULLSCREEN_CHROME.IDLE_HIDE_DELAY_MS` without input the consoles and centre fade, the rails glide out and the cursor hides; what stays is the `IdleReadout` - title and artist on one line and a hairline of progress, set straight on the visor (no plate, no controls). Any movement brings the cockpit back. Fades land on each glass or its content, never on a glass's ancestor (that would switch its blur off). Opt-out in settings.
- **Never** animate layout properties (width, height, top, left), and never move a section: animate transform and opacity on one-shot entrances only.
- **Reduced motion**: honor `prefers-reduced-motion`. The world paints still frames, the waveform a static ribbon, audio reactivity clears to flat; the app stays fully usable without motion.

## App shell (desktop gate + stages)

Before anything, a **desktop gate** guards the whole app. Reverie is desktop-only: the cockpit needs a wide canvas, so viewports under `VIEWPORT.MIN_DESKTOP_WIDTH` (1024px) render `DesktopOnlyGate` instead - a branded "open on a larger screen" stage. There is **no bypass**, with one exception: browser zoom. A fine-pointer desktop whose window is still desktop-wide (`outerWidth`, which ignores zoom) keeps the app when zooming in to read; under 1024 CSS px the cockpit keeps its proportions and the root scrolls sideways. The check (`useIsViewportTooNarrow`) follows resizes and zoom live.

The world and the helmet are always there (`AmbientScene` at the root). Over them, one of three stages:

- **Boot veil** - while the stored playlist is read and the last track decoded: the world alone for that half-second, never a flash of the welcome stage.
- **Welcome stage** (no session): the world switcher and settings on top; the brand mark, wordmark and tagline; the hero dropzone (files or whole folders); when a playlist is remembered on this device, a **resume** card straight back into it; the four effects as a plain line of type (not pills: they read as buttons); the privacy promise. A static radial pool of `--scene-veil` behind the column keeps the type legible over any sky.
- **Workspace** (`.app-shell`, a session is loaded):
  - **Top visor rail** (`.top-bar`): the brand mark (doubles as start-over), the world switcher centred, then Add music, fullscreen and settings.
  - **Stage** (`.stage-grid`): the raked **effects console** (left), the open **centre** where the world shows through - the now-playing readout and the waveform set over its lower part - and the raked **playlist console** (right).
  - **Bottom visor rail** (`.dock-wrap`): the transport.
  - Dropping files anywhere opens `FileDropOverlay`: left half plays them now, right half queues them.

## Interaction model

The product is a late-night listening experience, not an export funnel. Effects are **live**: there is no "apply/bake" step. Moving any control calls `setEffects`, which ramps a persistent Web Audio graph (`utils/effectGraph.ts`) on the playing source with a ~40 ms time constant. Export renders the current settings offline on demand, a quiet secondary action.

Listening is playlist-first. Load one file or a whole folder and every track joins a **playlist remembered on this device** (IndexedDB, files included), with the active track and position restored on the next visit. Tracks advance on their own; repeat cycles off / playlist / this track; shuffle plays laps without repeats. Keyboard: space plays/pauses, left/right seek, up/down set the volume, Shift+left/right step through the playlist, media keys and the OS media controls (Media Session) work too. Language, EQ and scene preferences live behind one settings dialog and persist to `localStorage`.

## Components

- **Pane (`.pane`)**: the holographic plate (see "HUD language"). Used for genuine surfaces only - the two consoles, the hero dropzone, the resume card - and never nested. Dialogs and popovers use the denser `.immersive .glass`.
- **iOS button (`.ios-button` + `buttonVariants`)**: press-scale (0.96) with the lift living in each variant's shadow/fill. Variants: `play` (the mood-accent orb, `.btn-orb`, over a deep Dream-Indigo base so the glyph holds AA), `glass`, `accent`, `outline`/`secondary`, `inverse`, `ghost`, `muted`.
- **World switcher (`WorldSwitcher`)**: see "Moods".
- **Effects console (`EffectControls` + `EffectRow` + `EffectSlider`)**: the four effects as a `radiogroup` (icon, name, a radio mark; one tab stop, arrows select via `useRadioGroupKeys`; pressing the checked row again lets the original track through), then a static tick ruler and the checked effect's one or two sliders with large tabular values, min/max markers and human formatting (`utils/formatters.ts`). Sliders announce their formatted value (`aria-valuetext`); double-click resets, with no hover hint.
- **Now playing (`NowPlaying`)**: over the world, bottom-left of the centre. When the selected track can't be decoded it says so, and nothing of the previous track (waveform, telemetry, play, export) stays under its name - artwork (embedded cover or a hue tile from `TrackArt`), a kicker with the playlist position, the title (`MarqueeText` scrolls only when it would clip; static under reduced motion), artist and format telemetry, and an "Up next" line close to the end of the track.
- **Waveform (`WaveformTimeline` + `waveInstrument.ts`)**: the centre instrument - a Canvas-2D ribbon of light mirrored round an instrument axis, the played region burning in the mood accent, the unplayed tail a ghost. While playing it is alive but contemplative: it listens through a slow ear (`ENERGY_SETTLE_S`), so the accent wash, the spectral flame along the spine, the rare downbeat swell (`PULSE_ONSET`, `PULSE_COOLDOWN_MS`), a few drifting embers and the 8D strands swell with the phrase instead of shaking on transients; the drawn envelope chases the effect-shaped target, so dragging a slider morphs it as liquid. Chips above read status, tempo (the tempo heard) and meter, and the clock (never a live region). Click, drag or arrow-key to seek (`role="slider"`). Reduced motion paints a static ribbon.
- **Playlist console (`PlaylistPanel` + `TrackRow`)**: title with track count and total length; add files, add a folder, clear (with a confirm); a filter from `PLAYLIST.FILTER_MIN_TRACKS` tracks up; rows with index (EQ bars on the active one), artwork, title, artist or format, duration, a remove cross on hover, and a live progress hairline under the active row. Rows reorder by drag and drop or Alt+Up/Down, Delete removes one, and the list walks with arrow keys (`data-own-arrows`). The footer states the storage promise (or that storage is full).
- **Transport (`PlaybackControls`)**: in the bottom visor rail - previous, the play orb, next; the seek bar (`TransportTimeline`); shuffle and the three-state repeat; a compact spectrum (`SpectrumMeter`, `xl`+); the volume (`VolumeControl`, wheel-adjustable, persisted); Export.
- **Drop overlay (`FileDropOverlay`)**: window-wide while files are dragged - two halves, play now or add to the playlist, chosen by where you let go.
- **Settings (`SettingsMenu`)**: one gear button opening a dialog - Scene (living world on/off, hide the interface in fullscreen on/off), the listening equalizer (six faders + translated presets; playback only, never the export - the one hint that stays, because it isn't obvious), and the ten-locale language grid (names only, `aria-pressed`). No subtitles explaining obvious controls. Closing returns focus to the gear without popping its tooltip.
- **Focus & scrollbar**: a global `:focus-visible` outline in `--color-accent-text` (the ring clears 3:1 on every mood, daybreak included; sliders ring the thumb); overlay scrollbars that show only while scrolling; `ScrollFade` dissolves the edge that still hides content.

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
