import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { PlaylistPanel } from './PlaylistPanel';
import { TooltipProvider } from '../ui/tooltip';
import { trackFromFile } from '../../hooks/usePlaylist';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const clock = { get: () => 0, subscribe: () => () => {} };
const tracks = ['Alpha', 'Beta', 'Gamma'].map((n, i) => trackFromFile(new File([n], `${n}.mp3`, { type: 'audio/mpeg' }), i));

function renderPanel(overrides: Partial<Parameters<typeof PlaylistPanel>[0]> = {}) {
  const props = {
    tracks,
    activeId: tracks[1].id,
    isPlaying: true,
    clock,
    duration: 100,
    storageError: false,
    onPlay: vi.fn(),
    onRemove: vi.fn(),
    onMove: vi.fn(),
    onClear: vi.fn(),
    onAddFiles: vi.fn(),
    ...overrides,
  };
  render(
    <TooltipProvider>
      <PlaylistPanel {...props} />
    </TooltipProvider>
  );
  return props;
}

describe('PlaylistPanel', () => {
  it('lists the tracks, marks the playing one, and plays a clicked row', async () => {
    const props = renderPanel();
    expect(screen.getByRole('button', { name: 'Beta' })).toHaveAttribute('aria-current', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Gamma' }));
    expect(props.onPlay).toHaveBeenCalledWith(tracks[2].id);
  });

  it('removes a track with the Delete key and reorders with Alt+arrows', () => {
    const props = renderPanel();
    const alpha = screen.getByRole('button', { name: 'Alpha' });
    fireEvent.keyDown(alpha, { key: 'ArrowDown', altKey: true });
    expect(props.onMove).toHaveBeenCalledWith(0, 1);
    fireEvent.keyDown(alpha, { key: 'Delete' });
    expect(props.onRemove).toHaveBeenCalledWith(tracks[0].id);
  });

  it('asks before clearing the whole list', async () => {
    const props = renderPanel();
    await userEvent.click(screen.getByRole('button', { name: 'playlist.clear' }));
    expect(props.onClear).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'playlist.clearYes' }));
    expect(props.onClear).toHaveBeenCalled();
  });

  it('adds picked files, keeping only audio', async () => {
    const props = renderPanel();
    const song = new File(['x'], 'song.flac', { type: '' });
    const cover = new File(['x'], 'cover.jpg', { type: 'image/jpeg' });
    await userEvent.upload(screen.getAllByLabelText('playlist.add')[0], [song, cover], { applyAccept: false });
    expect(props.onAddFiles).toHaveBeenCalledWith([song]);
  });

  it('shows an inviting empty state', () => {
    renderPanel({ tracks: [], activeId: null });
    expect(screen.getByText('playlist.empty')).toBeInTheDocument();
  });
});
