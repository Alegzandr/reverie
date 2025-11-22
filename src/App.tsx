import { useState, useCallback } from 'react';
import { Music2, Sparkles } from 'lucide-react';
import { FileUploader } from './components/FileUploader';
import { EffectControls } from './components/EffectControls';
import type { EffectSettings } from './components/EffectControls';
import { PlaybackControls } from './components/PlaybackControls';
import { ProgressBar } from './components/ProgressBar';
import { useAudioProcessor } from './hooks/useAudioProcessor';

function App() {
  const {
    state,
    originalFile,
    processedBuffer,
    volume,
    loadAudioFile,
    processAudio,
    playAudio,
    stopAudio,
    exportToMp3,
    updateVolume,
    reset,
  } = useAudioProcessor();

  const [effectSettings, setEffectSettings] = useState<EffectSettings>({
    speedMultiplier: 1.2,
    reverbAmount: 0,
  });

  const handleFileSelect = useCallback(
    async (file: File) => {
      await loadAudioFile(file);
    },
    [loadAudioFile]
  );

  const handleEffectChange = useCallback((settings: EffectSettings) => {
    setEffectSettings(settings);
  }, []);

  const handleProcess = useCallback(async () => {
    try {
      await processAudio({
        speedMultiplier: effectSettings.speedMultiplier,
        reverbAmount: effectSettings.reverbAmount,
        preservePitch: false,
      });
    } catch (error) {
      console.error('Processing error:', error);
    }
  }, [processAudio, effectSettings]);

  const handlePlay = useCallback(() => {
    if (processedBuffer) {
      playAudio(processedBuffer);
    }
  }, [playAudio, processedBuffer]);

  const handleExport = useCallback(async () => {
    try {
      await exportToMp3();
    } catch (error) {
      console.error('Export error:', error);
    }
  }, [exportToMp3]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#ff6ec7] via-[#b06aff] to-[#4de8ff] relative overflow-hidden">
      {/* Animated Background Grid */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
          transform: 'perspective(500px) rotateX(60deg)',
          transformOrigin: 'center bottom'
        }} />
      </div>

      {/* Header */}
      <header className="relative w-full py-6 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-white blur-xl opacity-50"></div>
              <div className="relative cassette-tape p-4 rounded-2xl">
                <Music2 className="w-10 h-10 text-white drop-shadow-lg" />
              </div>
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-white drop-shadow-2xl tracking-tight">
                PITCH<span className="text-[#4de8ff]">SONGS</span>
              </h1>
              <p className="text-white/90 text-sm md:text-base font-medium drop-shadow-lg">
                Cassette-style audio manipulation
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 px-5 py-3 cassette-tape rounded-full">
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
            <span className="text-sm font-bold text-white drop-shadow">
              100% PRIVATE
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative max-w-7xl mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Error Display */}
          {state.error && (
            <div className="w-full max-w-2xl mx-auto cassette-tape rounded-2xl p-5 bg-red-500/20 border-2 border-red-400/50">
              <p className="text-white font-bold text-sm drop-shadow">{state.error}</p>
            </div>
          )}

          {/* File Upload */}
          <FileUploader
            onFileSelect={handleFileSelect}
            isLoading={state.isLoading}
            hasFile={!!originalFile}
          />

          {/* Show file info if loaded */}
          {originalFile && !state.isLoading && (
            <div className="w-full max-w-2xl mx-auto cassette-tape rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white/70 uppercase tracking-wider">Track Loaded</p>
                  <p className="text-lg font-black text-white drop-shadow-lg truncate max-w-xs">
                    {originalFile.name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-white/70 uppercase tracking-wider">Size</p>
                  <p className="text-2xl font-black text-[#4de8ff] drop-shadow-lg">
                    {(originalFile.size / 1024 / 1024).toFixed(1)}<span className="text-sm">MB</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Effect Controls */}
          {originalFile && !state.isLoading && (
            <>
              <EffectControls
                onChange={handleEffectChange}
                disabled={state.isProcessing || state.isPlaying}
              />

              {/* Process Button */}
              <div className="w-full max-w-2xl mx-auto flex justify-center">
                <button
                  onClick={handleProcess}
                  disabled={state.isProcessing || state.isPlaying}
                  className={`
                    retro-button relative px-16 py-6 rounded-2xl
                    font-black text-2xl uppercase tracking-wider
                    transition-all duration-300 shadow-2xl
                    ${
                      !state.isProcessing && !state.isPlaying
                        ? 'bg-gradient-to-r from-[#ff6ec7] to-[#ff00ff] text-white hover:shadow-[0_0_40px_rgba(255,110,199,0.8)] cursor-pointer'
                        : 'bg-gray-500/30 text-gray-400 cursor-not-allowed'
                    }
                  `}
                >
                  <div className="flex items-center gap-4">
                    <Sparkles className={`w-8 h-8 ${state.isProcessing ? 'animate-spin' : ''}`} />
                    {state.isProcessing ? 'Processing...' : 'Transform'}
                  </div>
                </button>
              </div>
            </>
          )}

          {/* Progress Bar */}
          {(state.isProcessing || state.isLoading) && (
            <ProgressBar
              progress={state.progress}
              isProcessing={state.isProcessing || state.isLoading}
              message={state.isLoading ? 'Loading audio...' : 'Processing audio...'}
            />
          )}

          {/* Playback Controls */}
          {(processedBuffer || originalFile) && (
            <PlaybackControls
              isPlaying={state.isPlaying}
              onPlay={handlePlay}
              onStop={stopAudio}
              onReset={reset}
              onExport={handleExport}
              volume={volume}
              onVolumeChange={updateVolume}
              hasProcessed={!!processedBuffer}
              isProcessing={state.isProcessing}
              disabled={state.isProcessing}
            />
          )}
        </div>

        {/* Info Section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="cassette-tape rounded-2xl p-5 text-center hover:scale-105 transition-transform cursor-default">
              <div className="w-14 h-14 mx-auto mb-3 bg-white/20 rounded-full flex items-center justify-center backdrop-blur">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-black text-white mb-1 text-sm uppercase tracking-wide">Web Audio API</h3>
              <p className="text-xs text-white/80 font-medium">
                Professional audio processing
              </p>
            </div>
            <div className="cassette-tape rounded-2xl p-5 text-center hover:scale-105 transition-transform cursor-default">
              <div className="w-14 h-14 mx-auto mb-3 bg-white/20 rounded-full flex items-center justify-center backdrop-blur">
                <Music2 className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-black text-white mb-1 text-sm uppercase tracking-wide">100% Private</h3>
              <p className="text-xs text-white/80 font-medium">
                All processing in your browser
              </p>
            </div>
            <div className="cassette-tape rounded-2xl p-5 text-center hover:scale-105 transition-transform cursor-default">
              <div className="w-14 h-14 mx-auto mb-3 bg-white/20 rounded-full flex items-center justify-center backdrop-blur">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-black text-white mb-1 text-sm uppercase tracking-wide">Instant Export</h3>
              <p className="text-xs text-white/80 font-medium">
                Download as MP3
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative w-full py-6 mt-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-xs text-white/70 font-bold uppercase tracking-wider">
            Built with React • TypeScript • Web Audio API
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
