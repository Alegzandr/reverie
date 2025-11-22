import { useState, useCallback } from 'react';
import { Music2, Moon, Sun } from 'lucide-react';
import { FileUploader } from './components/FileUploader';
import { EffectControls } from './components/EffectControls';
import type { EffectSettings } from './components/EffectControls';
import { PlaybackControls } from './components/PlaybackControls';
import { ProgressBar } from './components/ProgressBar';
import { useAudioProcessor } from './hooks/useAudioProcessor';
import { useTheme } from './contexts/ThemeContext';

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

  const { theme, toggleTheme } = useTheme();

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
        bitDepth: effectSettings.bitDepth,
        sampleRateReduction: effectSettings.sampleRateReduction,
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
    <div className="min-h-screen transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-50 glass">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={reset}
            className="flex items-center gap-3 ios-button cursor-pointer transition-opacity hover:opacity-80"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-[10px] flex items-center justify-center shadow-sm">
              <Music2 className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-xl font-semibold text-[rgb(var(--color-text))]">
                PitchSongs
              </h1>
              <p className="text-xs text-[rgb(var(--color-text-secondary))]">
                Audio Manipulation
              </p>
            </div>
          </button>
          <button
            onClick={toggleTheme}
            className="w-10 h-10 glass rounded-full flex items-center justify-center ios-button cursor-pointer"
          >
            {theme === 'light' ? (
              <Moon className="w-5 h-5 text-[rgb(var(--color-text))]" />
            ) : (
              <Sun className="w-5 h-5 text-[rgb(var(--color-text))]" />
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* Error Display */}
          {state.error && (
            <div className="glass rounded-2xl p-4 border border-red-500/20 bg-red-500/10">
              <p className="text-sm font-medium text-red-600 dark:text-red-400">
                {state.error}
              </p>
            </div>
          )}

          {/* File Upload */}
          <FileUploader
            onFileSelect={handleFileSelect}
            isLoading={state.isLoading}
            hasFile={!!originalFile}
          />

          {/* File Info */}
          {originalFile && !state.isLoading && (
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[rgb(var(--color-text-secondary))] uppercase tracking-wide mb-1">
                    Track
                  </p>
                  <p className="text-base font-semibold text-[rgb(var(--color-text))] truncate">
                    {originalFile.name}
                  </p>
                </div>
                <div className="text-right ml-4">
                  <p className="text-xs font-medium text-[rgb(var(--color-text-secondary))] uppercase tracking-wide mb-1">
                    Size
                  </p>
                  <p className="text-base font-semibold text-[rgb(var(--color-accent))]">
                    {(originalFile.size / 1024 / 1024).toFixed(1)} MB
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
              <button
                onClick={handleProcess}
                disabled={state.isProcessing || state.isPlaying}
                className={`
                  w-full py-4 rounded-[14px] font-semibold text-[15px]
                  ios-button transition-all duration-200
                  ${
                    !state.isProcessing && !state.isPlaying
                      ? 'bg-[rgb(var(--color-accent))] text-white hover:bg-[rgb(var(--color-accent-hover))] cursor-pointer shadow-sm'
                      : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  }
                `}
              >
                {state.isProcessing ? 'Processing...' : 'Apply Effects'}
              </button>
            </>
          )}

          {/* Progress Bar */}
          {(state.isProcessing || state.isLoading) && (
            <ProgressBar
              progress={state.progress}
              isProcessing={state.isProcessing || state.isLoading}
              message={state.isLoading ? 'Loading...' : 'Processing...'}
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

        {/* Features */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { title: 'Web Audio API', desc: 'Professional quality' },
            { title: '100% Private', desc: 'Client-side processing' },
            { title: 'Instant Export', desc: 'Download as MP3' },
          ].map((feature, i) => (
            <div key={i} className="glass rounded-2xl p-5 text-center">
              <p className="text-sm font-semibold text-[rgb(var(--color-text))] mb-1">
                {feature.title}
              </p>
              <p className="text-xs text-[rgb(var(--color-text-secondary))]">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 pb-8 text-center">
        <p className="text-xs text-[rgb(var(--color-text-secondary))]">
          Built with React • TypeScript • Web Audio API
        </p>
      </footer>
    </div>
  );
}

export default App;
