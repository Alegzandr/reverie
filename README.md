# PitchSongs 🎵

A modern web application for creating sped-up and slow+reverb versions of your favorite songs. Transform your music directly in the browser with no uploads required!

## Features

- **Speed Up Mode**: Create high-energy sped-up versions of songs (1.1x - 2.0x speed)
- **Slow + Reverb Mode**: Generate atmospheric slowed + reverb versions
- **100% Client-Side Processing**: All audio processing happens in your browser - your files never leave your device
- **MP3 Export**: Download your transformed tracks as MP3 files
- **Real-time Preview**: Listen to your effects before exporting
- **Modern UI**: Beautiful, responsive interface built with Tailwind CSS

## Tech Stack

- **React 19** - Modern React with hooks
- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast build tool
- **SWC** - Super-fast TypeScript/JavaScript compiler
- **Tailwind CSS v4** - Utility-first CSS framework
- **Web Audio API** - Professional audio processing
- **lamejs** - MP3 encoding in the browser
- **Lucide React** - Beautiful icon library

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
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

## Usage

1. **Upload an MP3 file**: Drag and drop or click to browse for your audio file
2. **Select an effect mode**:
   - **Speed Up**: Adjust the speed multiplier (1.1x - 2.0x)
   - **Slow + Reverb**: Adjust the reverb amount (10% - 100%)
3. **Apply Effects**: Click the "Apply Effects" button to process your audio
4. **Preview**: Listen to your transformed track
5. **Export**: Download the processed audio as an MP3 file

## Project Structure

```
pitch-songs/
├── src/
│   ├── components/       # React components
│   │   ├── FileUploader.tsx
│   │   ├── EffectControls.tsx
│   │   ├── PlaybackControls.tsx
│   │   └── ProgressBar.tsx
│   ├── hooks/           # Custom React hooks
│   │   └── useAudioProcessor.ts
│   ├── utils/           # Utility functions
│   │   ├── audioProcessor.ts
│   │   └── mp3Encoder.ts
│   ├── types/           # TypeScript type definitions
│   │   └── lamejs.d.ts
│   ├── App.tsx          # Main application component
│   ├── main.tsx         # Application entry point
│   └── index.css        # Global styles
├── public/              # Static assets
├── index.html           # HTML template
└── package.json         # Project dependencies
```

## How It Works

### Audio Processing Pipeline

1. **File Loading**: MP3 files are loaded and decoded using the Web Audio API
2. **Effect Application**:
   - **Speed**: Uses `playbackRate` to adjust speed without re-sampling
   - **Reverb**: Creates a convolution reverb using procedurally generated impulse responses
3. **Rendering**: Processed audio is rendered using an `OfflineAudioContext`
4. **Encoding**: The result is encoded back to MP3 format using lamejs
5. **Download**: The encoded MP3 is downloaded to your device

### Privacy & Security

All audio processing happens entirely in your browser. No files are uploaded to any server, ensuring complete privacy and security for your music files.

## Build for Production

```bash
npm run build
```

The production-ready files will be in the `dist/` directory.

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

Web Audio API support required.

## Future Enhancements

- [ ] Additional effects (pitch shifting, bass boost, etc.)
- [ ] Batch processing multiple files
- [ ] Waveform visualization
- [ ] Custom effect presets
- [ ] Support for more audio formats

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
