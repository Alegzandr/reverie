import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Moon, Sun } from 'lucide-react';
import { FileUploader } from './components/FileUploader';
import { EffectControls } from './components/EffectControls';
import type { EffectSettings } from './components/EffectControls';
import { PlaybackControls } from './components/PlaybackControls';
import { ProgressBar } from './components/ProgressBar';
import { LanguageSelector } from './components/LanguageSelector';
import { WaveformTimeline } from './components/WaveformTimeline';
import { useAudioProcessor } from './hooks/useAudioProcessor';
import { useTheme } from './contexts/ThemeContext';

function App() {
  const { t, i18n } = useTranslation();
  const {
    state,
    originalFile,
    originalBuffer,
    processedBuffer,
    playbackTime,
    volume,
    loadAudioFile,
    processAudio,
    playAudio,
    stopAudio,
    exportToMp3,
    updateVolume,
    seekTo,
    reset,
  } = useAudioProcessor();

  const { theme, toggleTheme } = useTheme();

  // Update document meta tags when language changes
  useEffect(() => {
    document.title = t('meta.title');
    document.documentElement.lang = i18n.language;

    const updateMetaTag = (name: string, content: string, isProperty = false) => {
      const attribute = isProperty ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attribute}="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attribute, name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    updateMetaTag('description', t('meta.description'));
    updateMetaTag('keywords', t('meta.keywords'));
    updateMetaTag('og:title', t('meta.title'), true);
    updateMetaTag('og:description', t('meta.description'), true);
    updateMetaTag('twitter:title', t('meta.title'));
    updateMetaTag('twitter:description', t('meta.description'));
  }, [i18n.language, t]);

  const [effectSettings, setEffectSettings] = useState<EffectSettings>({
    mode: 'speed-up',
    speedMultiplier: 1.2,
    reverbAmount: 0,
  });
  const [selectedTrack, setSelectedTrack] = useState<'raw' | 'fx'>('raw');

  const handleFileSelect = useCallback(
    async (file: File) => {
      await loadAudioFile(file);
      setSelectedTrack('raw');
    },
    [loadAudioFile]
  );

  const [uploadRevision, setUploadRevision] = useState(0);

  const handleReset = useCallback(() => {
    reset();
    setUploadRevision((n) => n + 1);
  }, [reset]);

  const handleEffectChange = useCallback(
    (settings: EffectSettings) => {
      setEffectSettings(settings);
      if (settings.mode === '8-bit' && processedBuffer) {
        setSelectedTrack('fx');
      }
    },
    [processedBuffer]
  );

  const handleProcess = useCallback(async () => {
    try {
      await processAudio({
        speedMultiplier: effectSettings.speedMultiplier,
        reverbAmount: effectSettings.reverbAmount,
        preservePitch: false,
        bitDepth: effectSettings.bitDepth,
        sampleRateReduction: effectSettings.sampleRateReduction,
        chiptune: effectSettings.mode === '8-bit', // Enable authentic chiptune mode for 8-bit
      });
      setSelectedTrack('fx');
    } catch (error) {
      console.error('Processing error:', error);
    }
  }, [processAudio, effectSettings]);

  const handlePlay = useCallback(() => {
    if (selectedTrack === 'fx' && processedBuffer) {
      playAudio(processedBuffer, playbackTime);
    } else if (originalBuffer) {
      playAudio(originalBuffer, playbackTime);
    } else if (processedBuffer) {
      playAudio(processedBuffer, playbackTime);
    }
  }, [playAudio, processedBuffer, originalBuffer, playbackTime, selectedTrack]);

  const handleSeek = useCallback(
    (time: number, bufferOverride?: AudioBuffer | null) => {
      seekTo(time, bufferOverride);
    },
    [seekTo]
  );

  const handleExport = useCallback(async () => {
    try {
      const baseName = originalFile ? originalFile.name.replace(/\.[^/.]+$/, '') : 'track';
      const fxLabel = effectSettings.mode === 'speed-up'
        ? t('effects.speedUp')
        : effectSettings.mode === 'slow-reverb'
          ? t('effects.slowReverb')
          : t('effects.8bit');
      const filename = `${baseName} ${fxLabel} by PitchSongs.mp3`;
      await exportToMp3(filename);
    } catch (error) {
      console.error('Export error:', error);
    }
  }, [exportToMp3, originalFile, effectSettings.mode, t]);

  const handleTrackSelect = useCallback(
    (track: 'raw' | 'fx') => {
      if (track === 'fx' && !processedBuffer) return;
      const currentDuration =
        selectedTrack === 'fx' && processedBuffer
          ? processedBuffer.duration
          : originalBuffer?.duration || processedBuffer?.duration || 0;
      const nextDuration =
        track === 'fx' && processedBuffer
          ? processedBuffer.duration
          : originalBuffer?.duration || processedBuffer?.duration || 0;
      const ratio = currentDuration > 0 ? playbackTime / currentDuration : 0;
      const nextTime = Math.min(nextDuration, Math.max(0, ratio * nextDuration));
      setSelectedTrack(track);
      const nextBuffer = track === 'fx' ? processedBuffer : originalBuffer;
      seekTo(nextTime, nextBuffer || undefined);
    },
    [processedBuffer, originalBuffer, playbackTime, selectedTrack, seekTo]
  );

  return (
    <div className="min-h-screen transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-50 glass">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={handleReset}
            aria-label={t('accessibility.resetApp')}
            className="flex items-center gap-3 ios-button cursor-pointer transition-opacity hover:opacity-80"
          >
            <div className="w-10 h-10 rounded-[12px] flex items-center justify-center shadow-sm bg-[url('/favicon.svg')] bg-center bg-cover" aria-hidden="true" />
            <div className="text-left">
              <h1 className="text-xl font-semibold text-[rgb(var(--color-text))]">
                {t('app.title')}
              </h1>
              <p className="text-xs text-[rgb(var(--color-text-secondary))]">
                {t('app.subtitle')}
              </p>
            </div>
          </button>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <button
              onClick={toggleTheme}
              aria-label={t('accessibility.themeToggle')}
              className="w-10 h-10 glass rounded-full flex items-center justify-center ios-button cursor-pointer"
            >
              {theme === 'light' ? (
                <Moon className="w-5 h-5 text-[rgb(var(--color-text))]" aria-hidden="true" />
              ) : (
                <Sun className="w-5 h-5 text-[rgb(var(--color-text))]" aria-hidden="true" />
              )}
            </button>
          </div>
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
            key={uploadRevision}
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
                    {t('track.title')}
                  </p>
                  <p className="text-base font-semibold text-[rgb(var(--color-text))] truncate">
                    {originalFile.name}
                  </p>
                </div>
                <div className="text-right ml-4">
                  <p className="text-xs font-medium text-[rgb(var(--color-text-secondary))] uppercase tracking-wide mb-1">
                    {t('track.size')}
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
                aria-label={state.isProcessing ? t('effects.processing') : t('effects.apply')}
                className={`
                  w-full py-4 rounded-[14px] font-semibold text-[15px]
                  ios-button transition-all duration-200
                  ${
                    !state.isProcessing && !state.isPlaying
                      ? 'bg-[linear-gradient(120deg,rgba(var(--color-accent),1),rgba(var(--color-ambient),0.92))] text-white shadow-[0_14px_30px_-18px_rgba(var(--color-accent),0.7)] cursor-pointer'
                      : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  }
                `}
              >
                {state.isProcessing ? t('effects.processing') : t('effects.apply')}
              </button>
            </>
          )}

          {/* Progress Bar */}
          {(state.isProcessing || state.isLoading) && (
            <ProgressBar
              progress={state.progress}
              isProcessing={state.isProcessing || state.isLoading}
              message={state.isLoading ? t('upload.loading') : t('effects.processing')}
            />
          )}

          {(originalBuffer || processedBuffer) && (
            <WaveformTimeline
              originalBuffer={originalBuffer}
              processedBuffer={processedBuffer}
              longestDuration={Math.max(originalBuffer?.duration || 0, processedBuffer?.duration || 0)}
              duration={
                selectedTrack === 'fx' && processedBuffer
                  ? processedBuffer.duration
                  : originalBuffer?.duration || processedBuffer?.duration || 0
              }
              currentTime={playbackTime}
              isPlaying={state.isPlaying}
              selectedTrack={selectedTrack}
              onSelectTrack={handleTrackSelect}
              onSeek={(time, bufferOverride) => handleSeek(time, bufferOverride)}
            />
          )}

          {/* Playback Controls */}
          {(processedBuffer || originalFile) && (
            <PlaybackControls
              isPlaying={state.isPlaying}
              onPlay={handlePlay}
              onStop={stopAudio}
              onReset={handleReset}
              onExport={handleExport}
              volume={volume}
              onVolumeChange={updateVolume}
              hasAudio={!!(processedBuffer || originalBuffer)}
              hasProcessed={!!processedBuffer}
              canExport={!!processedBuffer}
              isExporting={state.isExporting}
              disabled={state.isProcessing || state.isExporting}
            />
          )}
        </div>

        {/* Features */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass rounded-2xl p-5 text-center">
            <p className="text-sm font-semibold text-[rgb(var(--color-text))] mb-1">
              {t('features.webAudio.title')}
            </p>
            <p className="text-xs text-[rgb(var(--color-text-secondary))]">
              {t('features.webAudio.desc')}
            </p>
          </div>
          <div className="glass rounded-2xl p-5 text-center">
            <p className="text-sm font-semibold text-[rgb(var(--color-text))] mb-1">
              {t('features.private.title')}
            </p>
            <p className="text-xs text-[rgb(var(--color-text-secondary))]">
              {t('features.private.desc')}
            </p>
          </div>
          <div className="glass rounded-2xl p-5 text-center">
            <p className="text-sm font-semibold text-[rgb(var(--color-text))] mb-1">
              {t('features.export.title')}
            </p>
            <p className="text-xs text-[rgb(var(--color-text-secondary))]">
              {t('features.export.desc')}
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 pb-8 text-center">
        <p className="text-xs text-[rgb(var(--color-text-secondary))]">
          {t('footer.built')}
        </p>
      </footer>
    </div>
  );
}

export default App;
