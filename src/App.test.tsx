import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, beforeEach, expect } from 'vitest';
import App from './App';

const mockState = {
  isLoading: false,
  isProcessing: false,
  isPlaying: false,
  progress: 0,
  error: null as string | null,
};

const mockApi = {
  state: mockState,
  originalFile: null as File | null,
  processedBuffer: null as AudioBuffer | null,
  originalBuffer: null as AudioBuffer | null,
  playbackTime: 0,
  duration: 0,
  volume: 0.7,
  loadAudioFile: vi.fn(),
  processAudio: vi.fn(async () => new AudioBuffer({ length: 1, numberOfChannels: 1, sampleRate: 44100 })),
  playAudio: vi.fn(),
  stopAudio: vi.fn(),
  exportProcessedAudio: vi.fn(async () => {}),
  updateVolume: vi.fn(),
  seekTo: vi.fn(),
  reset: vi.fn(),
};

const mockToggleTheme = vi.fn();
const mockI18n = { language: 'en', changeLanguage: vi.fn() };

vi.mock('./hooks/useAudioProcessor', () => ({
  useAudioProcessor: () => mockApi,
}));

vi.mock('./contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: mockToggleTheme }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: mockI18n }),
}));

describe('App', () => {
  beforeEach(() => {
    mockApi.originalFile = null;
    mockApi.processedBuffer = null;
    mockApi.originalBuffer = null;
    mockApi.duration = 0;
    mockApi.playbackTime = 0;
    mockState.error = null;
    mockState.isLoading = false;
    mockState.isProcessing = false;
    mockState.isPlaying = false;
    mockState.progress = 0;
    vi.clearAllMocks();
    document.head.innerHTML = '';
    document.title = '';
    mockI18n.language = 'en';
  });

  it('renders layout and updates meta tags', () => {
    render(<App />);

    expect(screen.getByText('app.title')).toBeInTheDocument();
    expect(document.title).toBe('meta.title');
    expect(document.documentElement.lang).toBe('en');
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('meta.description');
  });

  it('shows error message when present', () => {
    mockState.error = 'Oops';
    render(<App />);

    expect(screen.getByText('Oops')).toBeInTheDocument();
  });

  it('handles processing and playback flow', async () => {
    mockApi.originalFile = new File(['123'], 'song.mp3', { type: 'audio/mp3' });
    mockApi.processedBuffer = new AudioBuffer({ length: 1, numberOfChannels: 1, sampleRate: 44100 });
    mockApi.originalBuffer = new AudioBuffer({ length: 1, numberOfChannels: 1, sampleRate: 44100 });
    mockApi.duration = 1.5;
    render(<App />);

    await userEvent.click(screen.getByText('effects.8dAudio'));
    await userEvent.click(screen.getByText('effects.apply'));

    expect(mockApi.processAudio).toHaveBeenCalledWith({
      speedMultiplier: 1,
      reverbAmount: 0,
      preservePitch: false,
      audio8D: true,
      rotationSpeed: 0.5,
      bassBoost: false,
      bassBoostIntensity: undefined,
    });

    await userEvent.click(screen.getByText('playback.play'));
    expect(mockApi.playAudio).toHaveBeenCalledWith(mockApi.processedBuffer, 0);

    const resetButtons = screen.getAllByLabelText('accessibility.resetApp');
    await userEvent.click(resetButtons[0]);
    expect(mockApi.reset).toHaveBeenCalled();
  });

  it('uploads file and handles processing errors', async () => {
    const file = new File(['abc'], 'upload.mp3', { type: 'audio/mp3' });
    mockApi.originalFile = file;
    mockApi.loadAudioFile.mockResolvedValueOnce(undefined);
    mockApi.processAudio.mockRejectedValueOnce(new Error('process fail'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<App />);

    await userEvent.upload(screen.getByLabelText('upload.browse'), file);
    expect(mockApi.loadAudioFile).toHaveBeenCalledWith(file);

    await userEvent.click(screen.getByText('effects.apply'));
    expect(mockApi.processAudio).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith('Processing error:', expect.any(Error));

    consoleSpy.mockRestore();
  });

  it('shows disabled process button during processing', () => {
    mockState.isProcessing = true;
    mockApi.originalFile = new File(['123'], 'song.mp3', { type: 'audio/mp3' });
    render(<App />);

    const button = screen.getByRole('button', { name: 'effects.processing' });
    expect(button).toBeDisabled();
  });

  it('shows loading progress message', () => {
    mockState.isLoading = true;
    mockState.progress = 50;
    render(<App />);

    expect(screen.getByText('upload.loading')).toBeInTheDocument();
  });

  it('exports successfully', async () => {
    mockApi.processedBuffer = new AudioBuffer({ length: 1, numberOfChannels: 1, sampleRate: 44100 });
    render(<App />);

    await userEvent.click(screen.getByText('playback.export'));

    expect(mockApi.exportProcessedAudio).toHaveBeenCalled();
  });

  it('handles export errors gracefully', async () => {
    mockApi.processedBuffer = new AudioBuffer({ length: 1, numberOfChannels: 1, sampleRate: 44100 });
    mockApi.exportProcessedAudio.mockRejectedValueOnce(new Error('fail'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<App />);

    await userEvent.click(screen.getByText('playback.export'));
    expect(mockApi.exportProcessedAudio).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('toggles theme', async () => {
    render(<App />);
    await userEvent.click(screen.getByLabelText('accessibility.themeToggle'));
    expect(mockToggleTheme).toHaveBeenCalled();
  });

  it('renders waveform timeline and allows seeking', async () => {
    mockApi.originalFile = new File(['123'], 'song.mp3', { type: 'audio/mp3' });
    mockApi.originalBuffer = new AudioBuffer({ length: 44100, numberOfChannels: 1, sampleRate: 44100 });
    mockApi.duration = 2.5;

    render(<App />);

    const timeline = screen.getByTestId('waveform-timeline');
    await userEvent.click(timeline);

    expect(mockApi.seekTo).toHaveBeenCalled();
  });
});
