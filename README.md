# Reverie 🎵

Reverie is a **free online audio editor** with one promise: dreamy edits for your favorite tracks. Create sped-up versions, slowed + reverb remixes, immersive 8D audio, or bass boosted tracks, all directly in your browser with complete privacy and exports that mirror your original format and quality. **No download or installation required**, it works 100% online.

**🌐 Live Demo:** [alegzandr.github.io/reverie](https://alegzandr.github.io/reverie/)

## ✨ Features

### Audio Effects
- **Live, no-bake editing**: Effects are applied in real time on a persistent Web Audio graph — moving any control reshapes the playing sound instantly (DAW-style ramps), with no "Apply"/"Process" step. Export renders the current settings offline on demand.
- **Speed Up Mode**: Create high-energy sped-up versions (1.1x - 2.0x speed multiplier)
- **Slow + Reverb Mode**: Generate atmospheric slowed + reverb versions (0.8x speed with adjustable reverb)
- **8D Audio Mode**: Create immersive spatial audio with adjustable rotation speed (0.1x - 2.0x) for a surround-style headphone effect
- **Bass Boost Mode**: Enhance low frequencies with adjustable intensity (Light, Normal, Strong)

### Immersive Experience
- **🪐 Mood system**: Six moods, each a palette + an animated ambient background over one curved heads-up display (HUD). Two calm "workspace" faces (Light, Dark) plus four immersive ambiances (Tidal, Nocturne, Aurora, Horizon). Switch the whole atmosphere in one tap from the inline mood rail, or from the settings gallery. Persisted to `localStorage`.
- **🌌 Living ambient scene**: A full-viewport backdrop (cosmic imagery + slow GPU-composited drift) that the open centre of the cockpit lets breathe through the glass.
- **💓 Breathe-with-the-music reactivity**: A live analyser publishes audio-energy CSS variables (`--audio-level/-bass/-mid/-treble/-pulse`) that swell the scene bloom, pulse the HUD frames, and punch the play orb's halo on the beat. A compact live spectrum meter sits in the transport.

### User Experience
- **🌐 100% Online**: Works entirely in your browser - no download or installation required
- **🔒 100% Client-Side Processing**: All audio processing happens in your browser - files never leave your device
- **📊 Audio Metadata Display**: View technical details including bitrate, sample rate, bit depth (for lossless formats), and channel information
- **🎨 Waveform Scrubber**: The track's Aurora-stroked envelope lives inline in the transport bar and doubles as the seek track, reshaping live to preview the active effect
- **💾 Smart Format Export**: Exports match your original format where possible (MP3→MP3, WAV→WAV, AIFF→AIFF, FLAC→FLAC, WebM→WebM, OGG→OGG, M4A→M4A)
- **🌍 Multi-Language Support**: Available in 10 languages (English, French, Spanish, German, Portuguese, Russian, Chinese, Japanese, Korean, Hindi)
- **🌓 Moods**: Six selectable moods (Light, Dark, Tidal, Nocturne, Aurora, Horizon), persisted to `localStorage`
- **💻 PWA Support**: Install as a standalone desktop app (Reverie is a desktop-only experience — see below)
- **♿ Accessible**: Full keyboard navigation and screen reader support

### Developer Features
- **✅ Strong Test Coverage**: Comprehensive Vitest suite (100+ tests across hooks, utils, and components)
- **🏗 Elite Architecture**: Centralized constants, reusable components, DRY principles, Strategy pattern
- **🔍 SEO Optimized**: Schema.org metadata, sitemap, robots.txt
- **🚀 CI/CD Pipeline**: Automated linting, testing, and deployment
- **📊 Type-Safe**: Full TypeScript with strict mode enabled
- **⚡ Optimized Build**: Code splitting and minification for fast loading

## 🛠 Tech Stack

### Frontend
- **React 19** - Modern React with hooks and Suspense
- **TypeScript 5.9** - Full type safety with strict mode
- **Vite 7** - Lightning-fast dev server and build tool
- **@vitejs/plugin-react-swc** - Super-fast compilation
- **Tailwind CSS v4** - Utility-first styling with PostCSS

### Audio Processing
- **Web Audio API** - Browser-native audio engine
- **@breezystack/lamejs** - In-browser MP3 encoding

### Internationalization
- **i18next** - Robust i18n framework
- **react-i18next** - React integration
- **i18next-browser-languagedetector** - Automatic language detection

### Quality Assurance
- **Vitest** - Fast unit testing
- **@testing-library/react** - Component testing
- **ESLint** - Code linting with TypeScript support
- **GitHub Actions** - Automated CI/CD pipeline

### UI/UX
- **Lucide React** - Beautiful icon library
- **Holographic HUD** - Curved heads-up-display chrome (glass surfaces, instrument dials, scanlines) over a living ambient scene
- **Canvas 2D + CSS** - Live spectrum meter (Canvas), ambient scenes and audio-reactive bloom (CSS custom properties driven by a Web Audio analyser)

## 🚀 Getting Started

### Prerequisites

- Node.js 20+ installed
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Alegzandr/reverie.git
cd reverie
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

## 📖 Usage

1. **Upload Audio**: Drag and drop or click to browse
   - **Supported Formats**: MP3, WAV, AIFF, FLAC, OGG/Opus, WebM, AAC/M4A, and more
2. **View Metadata**: See technical details including:
   - File size and bitrate
   - Sample rate (e.g., 44.1 kHz, 48 kHz)
   - Bit depth for lossless formats (16-bit, 24-bit)
   - Channel configuration (mono/stereo)
3. **Select Effect Mode** (changes apply live as you play — no "Apply" step):
   - **Speed Up**: Adjust multiplier (1.1x - 2.0x)
   - **Slow + Reverb**: Adjust reverb amount (10% - 100%)
   - **8D Audio**: Adjust rotation speed (0.1x - 2.0x) to control the spatial movement
   - **Bass Boost**: Select intensity level (Light, Normal, Strong)
4. **Listen**: Press play — moving any control reshapes the sound in real time
5. **Set the mood** (optional): Pick a mood from the mood rail
6. **Export**: Download with smart format matching:
   - **MP3** → MP3 (preserves bitrate)
   - **WAV** → WAV (lossless)
   - **AIFF** → AIFF (lossless)
   - **FLAC** → FLAC (lossless, encoded via libFLAC; falls back to WAV if unavailable)
   - **WebM** → WebM (browser-native encoding with fallback to MP3)
   - **OGG/Opus** → OGG (browser-native encoding with fallback to MP3)
   - **AAC/M4A** → M4A (browser-native encoding with fallback to MP3)

## 📁 Project Structure

```
reverie/
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI/CD pipeline
├── src/
│   ├── components/             # React components
│   │   ├── EffectControls.tsx  # Effect mode selection (orchestrator)
│   │   ├── EffectModeButton.tsx # Reusable effect mode button
│   │   ├── EffectSlider.tsx    # Reusable effect slider control
│   │   ├── ErrorBoundary.tsx   # Error boundary wrapper
│   │   ├── FileUploader.tsx    # Drag-drop file upload
│   │   ├── PlaybackControls.tsx # Transport bar: play orb (in a HUD dial), scrubber, spectrum, volume, export
│   │   ├── WaveformScrubber.tsx # Waveform that doubles as the scrub track (transport center)
│   │   ├── SpectrumMeter.tsx    # Compact live spectrum (Canvas 2D) in the transport
│   │   ├── VolumeControl.tsx   # Compact volume with scroll-to-adjust
│   │   ├── MoodRail.tsx       # Inline "mood rail": one-tap mood picker
│   │   ├── AmbientScene.tsx    # Full-viewport ambient backdrop per active mood
│   │   ├── DesktopOnlyGate.tsx # Desktop-only gate: branded "open on a larger screen" stage for narrow viewports
│   │   ├── SettingsMenu.tsx    # Mood gallery + language menu (localStorage, no URL)
│   │   ├── ProgressBar.tsx     # Loading progress
│   │   ├── hud/
│   │   │   └── HudDial.tsx      # Holographic instrument dial wrapping the play orb
│   │   ├── scenes/             # Ambient scene building blocks
│   │   │   ├── NebulaScene.tsx  # Procedural nebula (orphaned — kept for future animated layer)
│   │   │   ├── TidalScene.tsx   # Procedural water (orphaned — kept for future animated layer)
│   │   │   ├── motion.ts        # Shared scene motion helpers
│   │   │   └── webgl/           # glScene.ts + nebulaShader/waterShader (orphaned WebGL layer)
│   │   └── ui/                 # Primitives (button, card, dialog, badge, slider, progress, tooltip)
│   ├── contexts/
│   │   ├── MoodContext.tsx    # Active mood: data-mood + .dark + .immersive on <html>
│   │   └── moods.ts           # Mood registry (6 moods), scene ids, rail order, default
│   ├── hooks/
│   │   ├── useAudioProcessor.ts # Orchestrates processing, playback, export
│   │   ├── useAudioFile.ts      # Loading + metadata + processing
│   │   ├── useAudioPlayback.ts  # Playback, seeking, volume
│   │   ├── useAudioExport.ts    # Strategy-based exporting and filenames
│   │   ├── useAudioReactivity.ts # Publishes --audio-* CSS vars from the live analyser
│   │   ├── useWaveform.ts       # Cached waveform generation
│   │   └── useViewportGate.ts   # matchMedia desktop-width check powering the desktop-only gate
│   ├── i18n/
│   │   ├── config.ts           # i18next configuration
│   │   └── locales/            # Translation files (EN, FR, ES, DE, PT, RU, ZH, JA, KO, HI)
│   ├── utils/
│   │   ├── audioProcessor.ts       # Web Audio API wrapper (offline render for export)
│   │   ├── effectGraph.ts          # Persistent live Web Audio graph (real-time effect ramps)
│   │   ├── audioMetadataExtractor.ts # Extract metadata from file headers
│   │   ├── mp3Encoder.ts           # MP3 encoding (LAME.js)
│   │   ├── aiffEncoder.ts          # AIFF encoding (manual implementation)
│   │   ├── flacEncoder.ts          # FLAC encoding (libFLAC WASM, lazy-loaded)
│   │   ├── mediaRecorderEncoder.ts # WebM/OGG/AAC encoding (MediaRecorder API)
│   │   ├── exportStrategies.ts     # Strategy pattern for exports
│   │   ├── formatters.ts           # UI value formatting utilities
│   │   └── waveform.ts             # Waveform caching utilities
│   ├── types/
│   │   └── lamejs.d.ts         # TypeScript type definitions
│   ├── constants.ts            # Centralized app constants and configuration
│   ├── App.tsx                 # Main application component
│   ├── main.tsx                # Entry point
│   └── index.css               # Global styles (tokens, HUD chrome, ambient scenes)
├── public/
│   ├── favicon.svg             # App icon
│   ├── backgrounds/            # Ambient scene imagery (cosmic-wave, lunar-haze, midnight-pulse, nebula-drift, void-bloom)
│   ├── og-image.png            # Social media preview (1200x630)
│   ├── icon-192.png            # PWA icon (192x192)
│   ├── icon-512.png            # PWA icon (512x512)
│   ├── apple-touch-icon.png    # iOS home screen icon
│   ├── manifest.json           # PWA manifest
│   ├── robots.txt              # SEO crawler instructions
│   └── sitemap.xml             # SEO sitemap
├── index.html                  # HTML template with SEO metadata
├── vite.config.ts              # Vite configuration
├── tsconfig.json               # TypeScript configuration
└── package.json                # Dependencies and scripts
```

## 🎯 How It Works

### Audio Processing Pipeline

1. **File Loading**: Audio files decoded using Web Audio API's `decodeAudioData()`
   - Supports MP3, WAV, AIFF, FLAC, OGG/Opus, WebM, AAC/M4A, and more
   - Extracts metadata: sample rate, channels, bitrate, bit depth (for lossless formats)
2. **Live Effect Graph** (`utils/effectGraph.ts`): during playback, effects run on a persistent Web Audio graph on the playing source. Moving a control ramps the relevant node (~40 ms time constant) so the sound reshapes smoothly, DAW-style, with no bake step. A speed change rebases the position clock so the playhead stays accurate.
3. **Offline Export Render** (using `OfflineAudioContext`): on download, the current settings are rendered offline at full quality:
   - **Speed**: Adjusts playback rate with AudioBufferSourceNode
   - **Reverb**: Creates convolution reverb with procedurally generated impulse response
   - **8D Audio**: Automates stereo panning with a custom impulse reverb tail to create rotating spatial sound
   - **Bass Boost**: Uses lowshelf filter (100 Hz), highpass filter (40 Hz), and peaking filter (300 Hz) with makeup gain
4. **Buffer Management**: Maintains separate buffers for original and processed audio
5. **Smart Format Export**: Detects source format and uses appropriate encoder:
   - **MP3**: LAME.js encoder with matched bitrate
   - **WAV**: Manual PCM encoder (lossless)
   - **AIFF**: Manual AIFF encoder (lossless, big-endian)
   - **FLAC**: libFLAC (WASM) lossless encoder, lazy-loaded; falls back to WAV
   - **WebM/OGG/M4A**: MediaRecorder API with fallback to MP3
6. **Download**: Triggers browser download with custom filename including effect label and "ver. by Reverie" suffix

### State Management

- **ProcessingState**: Tracks loading, processing, exporting, playing states
- **Audio Buffers**: Separate refs for original and processed audio
- **Playback Session**: Prevents race conditions during playback switching
- **Volume Persistence**: Saves volume preference to localStorage

### Privacy & Security

- **Zero Server Uploads**: All processing happens in-browser using Web Audio API
- **No Tracking**: No analytics or user tracking
- **Open Source**: Fully transparent codebase
- **Content Security Policy**: Secure headers configuration ready

## 🧪 Testing

Run the test suite:
```bash
npm test
```

Generate coverage report:
```bash
npm run test:coverage
```

**Current Coverage**: See `npm test` output (117 tests across hooks, utils, and components as of latest run)

## 🏗 Build for Production

```bash
npm run build
```

The optimized production build will be in the `dist/` directory with:
- Code splitting (React, i18n, audio libraries separated)
- Minification and tree-shaking
- Optimized chunk sizes

## 🚀 Deploy to GitHub Pages

This project uses GitHub Actions for automated deployment:

1. **Fork or clone** this repository
2. **Enable GitHub Pages**:
   - Go to repository Settings → Pages
   - Under "Build and deployment", select **GitHub Actions**
3. **Push to main branch** - deployment happens automatically
4. **Access your app** at: `https://YOUR_USERNAME.github.io/reverie/`

### CI/CD Pipeline

Every push to main runs:
- ✅ ESLint code linting
- ✅ TypeScript type checking
- ✅ Full test suite
- ✅ Production build
- ✅ Deployment to GitHub Pages

**Only deploys if all checks pass!**

## 🌍 Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

Requires: Web Audio API, ES2022, IndexedDB

## 📊 Performance

- **Initial Load**: < 500KB total bundle size
- **Core Web Vitals**: All "Good" ratings
- **Processing Speed**: ~2-5 seconds for 3-minute audio file
- **Offline Support**: PWA installable with service worker

## 🔒 Security

- Content Security Policy headers ready
- No external dependencies at runtime
- All processing client-side (zero-trust architecture)
- HTTPS enforced on GitHub Pages

## 🌐 SEO Optimizations

- Schema.org JSON-LD structured data
- Open Graph tags for social media
- Twitter Card metadata
- Multi-language alternate links
- Sitemap and robots.txt
- Semantic HTML with proper headings

The product vision lives in [PRODUCT.md](PRODUCT.md); the full visual system lives in [DESIGN.md](DESIGN.md).

- **Identity**: a dreamy, dark-first "Dream field" in deep indigo and violet, tied together by the **Aurora** gradient (violet → pink → cyan) carried on the brand mark and the primary action button.
- **Interface**: a holographic HUD (curved chrome, instrument dials, glass surfaces) floating over a living ambient scene; the whole atmosphere reskins per mood.
- **Reactivity**: the interface breathes with the music — bloom, HUD frames, and the play orb pulse to the live audio energy.
- **Color**: OKLCH tokens, tinted neutrals (no pure black or white), Aurora reserved for strokes, fills, and active states, never body text.
- **Typography**: two self-hosted variable web faces — Hanken Grotesk for UI/body, Fraunces (display serif) for identity and headings; lowercase `reverie` wordmark in a light weight.
- **Components**: modular, reusable components with purposeful glass-morphism surfaces.
- **Desktop-only**: the cockpit needs a wide canvas, so viewports under 1024px (`VIEWPORT.MIN_DESKTOP_WIDTH`) are gated to a branded "open on a larger screen" stage (`DesktopOnlyGate`) with no bypass; the gate reacts live to resize via `matchMedia`.
- **Accessibility**: WCAG 2.1 AA compliant; honors `prefers-reduced-motion` (ambient motion and reactivity fall back to a calm static state).
- **Code Quality**: zero magic numbers, centralized constants, DRY principles.

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Write tests for new features
- Maintain test coverage above 90%
- Follow existing code style (ESLint will guide you)
- Update documentation as needed
- Use conventional commits format

## 📝 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🙏 Acknowledgments

- Built with [React](https://react.dev/)
- Audio processing powered by [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- MP3 encoding by [lamejs](https://github.com/zhuker/lamejs) (used when exporting MP3 at the source-matched bitrate)
- Icons from [Lucide](https://lucide.dev/)

## 📞 Support

Found a bug or have a feature request? [Open an issue](https://github.com/Alegzandr/reverie/issues)

---

Reverie, crafted for late-night listening 🎧
