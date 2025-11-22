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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Header */}
      <header className="w-full py-8 px-4 border-b border-gray-200 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl">
              <Music2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                PitchSongs
              </h1>
              <p className="text-sm text-gray-600">Speed up & slow down your tracks</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-purple-100 rounded-full">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-700">
              100% Client-Side Processing
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="space-y-8">
          {/* Error Display */}
          {state.error && (
            <div className="w-full max-w-2xl mx-auto bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-red-700 text-sm font-medium">{state.error}</p>
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
            <div className="w-full max-w-2xl mx-auto bg-white rounded-xl p-6 shadow-md border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Loaded file</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {originalFile.name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Size</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {(originalFile.size / 1024 / 1024).toFixed(2)} MB
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
                    flex items-center gap-3 px-12 py-5 rounded-xl
                    font-bold text-xl transition-all duration-300
                    ${
                      !state.isProcessing && !state.isPlaying
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-2xl hover:shadow-purple-500/40 hover:scale-105'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }
                  `}
                >
                  <Sparkles className="w-7 h-7" />
                  {state.isProcessing ? 'Processing...' : 'Apply Effects'}
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
        <div className="mt-20 max-w-2xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200 text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Professional Audio</h3>
              <p className="text-sm text-gray-600">
                High-quality Web Audio API processing
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200 text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <Music2 className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">100% Private</h3>
              <p className="text-sm text-gray-600">
                All processing happens in your browser
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200 text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Instant Export</h3>
              <p className="text-sm text-gray-600">
                Download your transformed tracks
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-8 mt-20 border-t border-gray-200 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-600">
            Built with React, TypeScript, and Web Audio API
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
