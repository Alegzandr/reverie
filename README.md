# PitchSongs 🎵

A modern, professional **free online audio editor** for transforming your music with audio effects. Create sped-up versions, slow+reverb remixes, immersive 8D audio, or bass boosted tracks - all directly in your browser with complete privacy and exports that mirror your original format and quality. **No download or installation required** - works 100% online.

**🌐 Live Demo:** [alegzandr.github.io/pitch-songs](https://alegzandr.github.io/pitch-songs/)

## ✨ Features

### Audio Effects
- **Speed Up Mode**: Create high-energy sped-up versions (1.1x - 2.0x speed multiplier)
- **Slow + Reverb Mode**: Generate atmospheric slowed + reverb versions (0.8x speed with adjustable reverb)
- **8D Audio Mode**: Create immersive spatial audio with adjustable rotation speed (0.1x - 2.0x) for a surround-style headphone effect
- **Bass Boost Mode**: Enhance low frequencies with professional filters and adjustable intensity (Light, Normal, Strong)

### User Experience
- **🌐 100% Online**: Works entirely in your browser - no download or installation required
- **🔒 100% Client-Side Processing**: All audio processing happens in your browser - files never leave your device
- **📊 Audio Metadata Display**: View technical details including bitrate, sample rate, bit depth (for lossless formats), and channel information
- **🎨 Waveform Visualization**: Real-time waveform display showing both original and processed audio
- **🎧 Track Comparison**: Switch between original and processed versions with synchronized playback
- **💾 Smart Format Export**: Exports match your original format where possible (MP3→MP3, WAV→WAV, AIFF→AIFF, WebM→WebM, OGG→OGG, M4A→M4A, FLAC→WAV)
- **🌍 Multi-Language Support**: Available in 10 languages (English, French, Spanish, German, Portuguese, Russian, Chinese, Japanese, Korean, Hindi)
- **🌓 Dark/Light Mode**: Automatic theme detection with manual toggle
- **📱 PWA Support**: Install as a standalone app on mobile and desktop
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
- **Web Audio API** - Professional browser-native audio engine
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
- **Glass-morphism design** - Modern iOS-inspired interface

## 🚀 Getting Started

### Prerequisites

- Node.js 20+ installed
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Alegzandr/pitch-songs.git
cd pitch-songs
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
3. **Select Effect Mode**:
   - **Speed Up**: Adjust multiplier (1.1x - 2.0x)
   - **Slow + Reverb**: Adjust reverb amount (10% - 100%)
   - **8D Audio**: Adjust rotation speed (0.1x - 2.0x) to control the spatial movement
   - **Bass Boost**: Select intensity level (Light, Normal, Strong)
4. **Apply Effects**: Click "Apply Effects" to process
5. **Preview**: Use playback controls to listen
6. **Compare**: Switch between original ("raw") and processed ("fx") tracks
7. **Export**: Download with smart format matching:
   - **MP3** → MP3 (preserves bitrate)
   - **WAV** → WAV (lossless)
   - **AIFF** → AIFF (lossless)
   - **FLAC** → WAV (lossless preservation)
   - **WebM** → WebM (browser-native encoding with fallback to MP3)
   - **OGG/Opus** → OGG (browser-native encoding with fallback to MP3)
   - **AAC/M4A** → M4A (browser-native encoding with fallback to MP3)

## 📁 Project Structure

```
pitch-songs/
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
│   │   ├── LanguageRouter.tsx  # Language-based routing
│   │   ├── LanguageSelector.tsx # i18n language picker
│   │   ├── PlaybackControls.tsx # Play/pause/export controls
│   │   ├── ProgressBar.tsx     # Loading progress
│   │   └── WaveformTimeline.tsx # Audio waveform visualization
│   ├── contexts/
│   │   └── ThemeContext.tsx    # Dark/light theme management
│   ├── hooks/
│   │   ├── useAudioProcessor.ts # Orchestrates processing, playback, export
│   │   ├── useAudioFile.ts      # Loading + metadata + processing
│   │   ├── useAudioPlayback.ts  # Playback, seeking, volume
│   │   ├── useAudioExport.ts    # Strategy-based exporting and filenames
│   │   └── useWaveform.ts       # Cached waveform generation
│   ├── i18n/
│   │   ├── config.ts           # i18next configuration
│   │   └── locales/            # Translation files (EN, FR, ES, DE, PT, RU, ZH, JA, KO, HI)
│   ├── utils/
│   │   ├── audioProcessor.ts       # Web Audio API wrapper
│   │   ├── audioMetadataExtractor.ts # Extract metadata from file headers
│   │   ├── mp3Encoder.ts           # MP3 encoding (LAME.js)
│   │   ├── aiffEncoder.ts          # AIFF encoding (manual implementation)
│   │   ├── mediaRecorderEncoder.ts # WebM/OGG/AAC encoding (MediaRecorder API)
│   │   ├── exportStrategies.ts     # Strategy pattern for exports
│   │   ├── formatters.ts           # UI value formatting utilities
│   │   └── waveform.ts             # Waveform caching utilities
│   ├── types/
│   │   └── lamejs.d.ts         # TypeScript type definitions
│   ├── constants.ts            # Centralized app constants and configuration
│   ├── App.tsx                 # Main application component
│   ├── main.tsx                # Entry point
│   └── index.css               # Global styles
├── public/
│   ├── favicon.svg             # App icon
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
2. **Effect Processing** (using `OfflineAudioContext`):
   - **Speed**: Adjusts playback rate with AudioBufferSourceNode
   - **Reverb**: Creates convolution reverb with procedurally generated impulse response
   - **8D Audio**: Automates stereo panning with a custom impulse reverb tail to create rotating spatial sound
   - **Bass Boost**: Uses lowshelf filter (100 Hz), highpass filter (40 Hz), and peaking filter (300 Hz) with makeup gain for professional bass enhancement
3. **Buffer Management**: Maintains separate buffers for original and processed audio
4. **Smart Format Export**: Detects source format and uses appropriate encoder:
   - **MP3**: LAME.js encoder with matched bitrate
   - **WAV**: Manual PCM encoder (lossless)
   - **AIFF**: Manual AIFF encoder (lossless, big-endian)
   - **FLAC**: Exports as WAV (both lossless)
   - **WebM/OGG/M4A**: MediaRecorder API with fallback to MP3
5. **Download**: Triggers browser download with custom filename including effect label and "ver. by PitchSongs" suffix

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

**Current Coverage**: See `npm test` output (116 tests passing as of latest run)

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
4. **Access your app** at: `https://YOUR_USERNAME.github.io/pitch-songs/`

### CI/CD Pipeline

Every push to main runs:
- ✅ ESLint code linting
- ✅ TypeScript type checking
- ✅ Full test suite (68 tests)
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

## 🎨 Design System

- **Color Palette**: iOS-inspired with blue accent (#007aff)
- **Typography**: System fonts with fallbacks
- **Components**: Modular, reusable components with glass-morphism effects
- **Responsive**: Mobile-first design with breakpoints
- **Accessibility**: WCAG 2.1 AA compliant
- **Code Quality**: Zero magic numbers, centralized constants, DRY principles

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

Found a bug or have a feature request? [Open an issue](https://github.com/Alegzandr/pitch-songs/issues)

---

Made with ❤️ using React and Web Audio API
