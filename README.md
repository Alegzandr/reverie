# PitchSongs 🎵

A modern, professional web application for transforming your music with audio effects. Create sped-up versions, slow+reverb remixes, or immersive 8D audio - all directly in your browser with complete privacy and exports that mirror your original format and quality.

**🌐 Live Demo:** [alegzandr.github.io/pitch-songs](https://alegzandr.github.io/pitch-songs/)

## ✨ Features

### Audio Effects
- **Speed Up Mode**: Create high-energy sped-up versions (1.1x - 2.0x speed multiplier)
- **Slow + Reverb Mode**: Generate atmospheric slowed + reverb versions (0.8x speed with adjustable reverb)
- **8D Audio Mode**: Create immersive spatial audio with adjustable rotation speed (0.1x - 2.0x) for a surround-style headphone effect

### User Experience
- **🔒 100% Client-Side Processing**: All audio processing happens in your browser - files never leave your device
- **🎨 Waveform Visualization**: Real-time waveform display showing both original and processed audio
- **🎧 Track Comparison**: Switch between original and processed versions with synchronized playback
- **💾 Auto Export**: Downloads match your upload format/quality (WAV preserved; MP3 mirrors source bitrate; other uploads use matched-bitrate MP3)
- **🌍 Multi-Language Support**: Available in English, French, Spanish, German, and Portuguese
- **🌓 Dark/Light Mode**: Automatic theme detection with manual toggle
- **📱 PWA Support**: Install as a standalone app on mobile and desktop
- **♿ Accessible**: Full keyboard navigation and screen reader support

### Developer Features
- **✅ 95%+ Test Coverage**: Comprehensive test suite with 66+ passing tests
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

1. **Upload Audio**: Drag and drop or click to browse (supports MP3, WAV, OGG, M4A, MP4)
2. **Select Effect Mode**:
   - **Speed Up**: Adjust multiplier (1.1x - 2.0x)
   - **Slow + Reverb**: Adjust reverb amount (10% - 100%)
   - **8D Audio**: Adjust rotation speed (0.1x - 2.0x) to control the spatial movement
3. **Apply Effects**: Click "Apply Effects" to process
4. **Preview**: Use playback controls to listen
5. **Compare**: Switch between original ("raw") and processed ("fx") tracks
6. **Export**: Download in your original format/quality automatically (WAV stays WAV; MP3 keeps source bitrate; other uploads use a matched-bitrate MP3)

## 📁 Project Structure

```
pitch-songs/
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI/CD pipeline
├── src/
│   ├── components/             # React components
│   │   ├── EffectControls.tsx  # Effect mode selection
│   │   ├── FileUploader.tsx    # Drag-drop file upload
│   │   ├── LanguageSelector.tsx # i18n language picker
│   │   ├── PlaybackControls.tsx # Play/pause/export controls
│   │   ├── ProgressBar.tsx     # Loading progress
│   │   └── WaveformTimeline.tsx # Audio waveform visualization
│   ├── contexts/
│   │   └── ThemeContext.tsx    # Dark/light theme management
│   ├── hooks/
│   │   └── useAudioProcessor.ts # Audio processing logic
│   ├── i18n/
│   │   ├── config.ts           # i18next configuration
│   │   └── locales/            # Translation files (EN, FR, ES, DE, PT)
│   ├── utils/
│   │   ├── audioProcessor.ts   # Web Audio API wrapper
│   │   └── mp3Encoder.ts       # Audio export utilities (MP3 encoding, blob download)
│   ├── types/
│   │   └── lamejs.d.ts         # TypeScript type definitions
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
2. **Effect Processing** (using `OfflineAudioContext`):
   - **Speed**: Adjusts playback rate with AudioBufferSourceNode
   - **Reverb**: Creates convolution reverb with procedurally generated impulse response
   - **8D Audio**: Automates stereo panning with a custom impulse reverb tail to create rotating spatial sound
3. **Buffer Management**: Maintains separate buffers for original and processed audio
4. **Export**: Detects the source format and exports either WAV (lossless) or MP3 with matched bitrate to mirror original quality
5. **Download**: Triggers browser download with custom filename

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

**Current Coverage**: 95.59% (66/66 tests passing)

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
- ✅ Full test suite (66 tests)
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
- **Components**: Glass-morphism effects with backdrop blur
- **Responsive**: Mobile-first design with breakpoints
- **Accessibility**: WCAG 2.1 AA compliant

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
