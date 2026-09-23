import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PlaybackControls } from './PlaybackControls';
import { TooltipProvider } from './ui/tooltip';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const renderControls = (ui: React.ReactElement) => render(<TooltipProvider>{ui}</TooltipProvider>);

describe('PlaybackControls', () => {
  const baseProps = {
    onPlay: vi.fn(),
    onStop: vi.fn(),
    onExport: vi.fn(),
    onToggleRepeat: vi.fn(),
    onVolumeChange: vi.fn(),
    onSeek: vi.fn(),
    isPlaying: false,
    repeat: 'off' as const,
    hasAudio: true,
    canExport: true,
    volume: 0.5,
    clock: { get: () => 0, subscribe: () => () => {} },
    duration: 10,
    getAnalyser: () => null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('toggles play/pause', async () => {
    const props = { ...baseProps, isPlaying: false };
    const { rerender } = renderControls(
      <PlaybackControls {...props} isExporting={false} disabled={false} />
    );

    await userEvent.click(screen.getByLabelText('playback.play'));
    expect(baseProps.onPlay).toHaveBeenCalled();

    rerender(<TooltipProvider><PlaybackControls {...props} isPlaying isExporting={false} disabled={false} /></TooltipProvider>);

    await userEvent.click(screen.getByLabelText('playback.pause'));
    expect(baseProps.onStop).toHaveBeenCalled();
  });

  it('handles export availability and volume control', async () => {
    const props = { ...baseProps, isPlaying: false, volume: 0.2 };
    const { rerender } = renderControls(
      <PlaybackControls {...props} hasAudio={false} canExport={false} isExporting={false} disabled={false} />
    );

    expect(screen.getByRole('button', { name: 'playback.export' })).toBeDisabled();
    // Volume only appears when there is audio to control.
    expect(screen.queryByLabelText(/playback.volume/)).not.toBeInTheDocument();

    rerender(<TooltipProvider><PlaybackControls {...props} hasAudio canExport isExporting={false} disabled={false} /></TooltipProvider>);

    await userEvent.click(screen.getByRole('button', { name: 'playback.export' }));
    expect(baseProps.onExport).toHaveBeenCalled();

    const volume = screen.getByLabelText(/playback.volume/);
    fireEvent.change(volume, { target: { value: '0.4' } });
    expect(baseProps.onVolumeChange).toHaveBeenCalledWith(0.4);
  });

  it('cycles repeat and names the current mode', async () => {
    const props = { ...baseProps, isPlaying: false };
    const { rerender } = renderControls(
      <PlaybackControls {...props} isExporting={false} disabled={false} />
    );

    const repeat = screen.getByRole('button', { name: 'playback.repeatOff' });
    expect(repeat).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(repeat);
    expect(baseProps.onToggleRepeat).toHaveBeenCalled();

    rerender(<TooltipProvider><PlaybackControls {...props} repeat="one" isExporting={false} disabled={false} /></TooltipProvider>);
    expect(screen.getByRole('button', { name: 'playback.repeatOne' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('steps through the playlist and toggles shuffle', async () => {
    const onPrevious = vi.fn();
    const onNext = vi.fn();
    const onToggleShuffle = vi.fn();
    renderControls(
      <PlaybackControls
        {...baseProps}
        onPrevious={onPrevious}
        onNext={onNext}
        hasPrevious
        hasNext={false}
        onToggleShuffle={onToggleShuffle}
        shuffle
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'playback.previous' }));
    expect(onPrevious).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'playback.next' })).toBeDisabled();

    const shuffle = screen.getByRole('button', { name: 'playback.shuffle' });
    expect(shuffle).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(shuffle);
    expect(onToggleShuffle).toHaveBeenCalled();
  });

  it('disables controls when busy', () => {
    const props = { ...baseProps, isPlaying: false };
    renderControls(<PlaybackControls {...props} isExporting={false} disabled />);

    expect(screen.getByLabelText('playback.play')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'playback.export' })).toBeDisabled();
  });
});
