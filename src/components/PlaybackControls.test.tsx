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
    onReset: vi.fn(),
    onExport: vi.fn(),
    onVolumeChange: vi.fn(),
    isPlaying: false,
    hasProcessed: true,
    canExport: true,
    volume: 0.5,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('toggles play/pause and reset', async () => {
    const props = { ...baseProps, isPlaying: false, hasProcessed: true, volume: 0.5 };
    const { rerender } = render(
      <PlaybackControls
        {...props}
        isProcessing={false}
        disabled={false}
      />
    );

    await userEvent.click(screen.getByText('playback.play'));
    expect(baseProps.onPlay).toHaveBeenCalled();

    rerender(
      <PlaybackControls
        {...props}
        isPlaying
        isProcessing={false}
        disabled={false}
      />
    );

    await userEvent.click(screen.getByText('playback.pause'));
    expect(baseProps.onStop).toHaveBeenCalled();

    await userEvent.click(screen.getByLabelText('accessibility.resetApp'));
    expect(baseProps.onReset).toHaveBeenCalled();
  });

  it('handles export availability and volume control', async () => {
    const props = { ...baseProps, isPlaying: false, volume: 0.2 };
    const { rerender } = render(
      <PlaybackControls
        {...props}
        hasProcessed={false}
        canExport={false}
        isProcessing={false}
        disabled={false}
      />
    );

    expect(screen.getByText('playback.export')).toBeDisabled();
    expect(screen.queryByLabelText(/playback.volume/)).not.toBeInTheDocument();

    rerender(
      <PlaybackControls
        {...props}
        hasProcessed
        canExport
        isProcessing={false}
        disabled={false}
      />
    );

    await userEvent.click(screen.getByText('playback.export'));
    expect(baseProps.onExport).toHaveBeenCalled();

    const volume = screen.getByLabelText(/playback.volume/);
    await userEvent.click(volume);
    fireEvent.change(volume, { target: { value: '0.4' } });
    expect(baseProps.onVolumeChange).toHaveBeenCalledWith(0.4);
  });

  it('renders disabled reset state', () => {
    const props = { ...baseProps, isPlaying: false, hasProcessed: true, volume: 0.5 };
    render(
      <PlaybackControls
        {...props}
        isProcessing={false}
        disabled
      />
    );

    expect(screen.getByLabelText('accessibility.resetApp')).toBeDisabled();
  });
});
