import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PlaybackControls } from './PlaybackControls';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('PlaybackControls', () => {
  const baseProps = {
    onPlay: vi.fn(),
    onStop: vi.fn(),
    onExport: vi.fn(),
    onVolumeChange: vi.fn(),
    onSeek: vi.fn(),
    isPlaying: false,
    hasAudio: true,
    canExport: true,
    volume: 0.5,
    currentTime: 0,
    duration: 10,
    getAnalyser: () => null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('toggles play/pause', async () => {
    const props = { ...baseProps, isPlaying: false };
    const { rerender } = render(
      <PlaybackControls {...props} isExporting={false} disabled={false} />
    );

    await userEvent.click(screen.getByLabelText('playback.play'));
    expect(baseProps.onPlay).toHaveBeenCalled();

    rerender(<PlaybackControls {...props} isPlaying isExporting={false} disabled={false} />);

    await userEvent.click(screen.getByLabelText('playback.pause'));
    expect(baseProps.onStop).toHaveBeenCalled();
  });

  it('handles export availability and volume control', async () => {
    const props = { ...baseProps, isPlaying: false, volume: 0.2 };
    const { rerender } = render(
      <PlaybackControls {...props} hasAudio={false} canExport={false} isExporting={false} disabled={false} />
    );

    expect(screen.getByRole('button', { name: 'playback.export' })).toBeDisabled();
    // Volume only appears when there is audio to control.
    expect(screen.queryByLabelText(/playback.volume/)).not.toBeInTheDocument();

    rerender(<PlaybackControls {...props} hasAudio canExport isExporting={false} disabled={false} />);

    await userEvent.click(screen.getByRole('button', { name: 'playback.export' }));
    expect(baseProps.onExport).toHaveBeenCalled();

    const volume = screen.getByLabelText(/playback.volume/);
    fireEvent.change(volume, { target: { value: '0.4' } });
    expect(baseProps.onVolumeChange).toHaveBeenCalledWith(0.4);
  });

  it('disables controls when busy', () => {
    const props = { ...baseProps, isPlaying: false };
    render(<PlaybackControls {...props} isExporting={false} disabled />);

    expect(screen.getByLabelText('playback.play')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'playback.export' })).toBeDisabled();
  });
});
