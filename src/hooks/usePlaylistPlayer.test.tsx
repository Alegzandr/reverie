import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { usePlaylist } from './usePlaylist';
import { usePlaylistPlayer, type PlayerAudio } from './usePlaylistPlayer';
import { createPlaybackClock } from '../utils/playbackClock';

vi.mock('../utils/audioProbe', () => ({ probeDuration: vi.fn(async () => null) }));

const buffer = (duration = 30) => ({ duration }) as AudioBuffer;
const file = (name: string) => new File([name], `${name}.mp3`, { type: 'audio/mpeg' });

function setup(overrides: Partial<PlayerAudio> = {}) {
  const clock = createPlaybackClock();
  const audio: PlayerAudio = {
    isPlaying: false,
    repeat: 'off',
    hasSession: false,
    playbackClock: clock,
    duration: 30,
    loadAudioFile: vi.fn(async () => buffer()),
    playAudio: vi.fn(),
    seekTo: vi.fn(),
    ...overrides,
  };
  const hook = renderHook(() => {
    const playlist = usePlaylist();
    const player = usePlaylistPlayer(playlist, audio);
    return { playlist, player };
  });
  return { hook, audio, clock };
}

describe('usePlaylistPlayer', () => {
  it('loads the first added file paused when nothing is loaded yet', async () => {
    const { hook, audio } = setup();
    const a = file('a');
    act(() => hook.result.current.player.addFiles([a, file('b')]));
    await waitFor(() => expect(audio.loadAudioFile).toHaveBeenCalledWith(a));
    expect(audio.playAudio).not.toHaveBeenCalled();
  });

  it('plays dropped files now when asked to', async () => {
    const { hook, audio } = setup({ hasSession: true });
    const a = file('a');
    act(() => hook.result.current.player.addFiles([a], 'play'));
    await waitFor(() => expect(audio.playAudio).toHaveBeenCalled());
    expect(audio.loadAudioFile).toHaveBeenCalledWith(a);
  });

  it('advances to the next track when one ends, and stops at the end without repeat', async () => {
    const { hook, audio } = setup({ hasSession: true });
    const [a, b] = [file('a'), file('b')];
    await act(async () => {
      await hook.result.current.playlist.addFiles([a, b]);
    });
    const firstId = hook.result.current.playlist.tracks[0].id;
    await act(async () => {
      await hook.result.current.player.playTrack(firstId, { autoplay: true });
    });

    act(() => hook.result.current.player.handleTrackEnd());
    await waitFor(() => expect(audio.loadAudioFile).toHaveBeenLastCalledWith(b));

    const calls = (audio.loadAudioFile as ReturnType<typeof vi.fn>).mock.calls.length;
    act(() => hook.result.current.player.handleTrackEnd());
    await new Promise((r) => setTimeout(r, 0));
    expect((audio.loadAudioFile as ReturnType<typeof vi.fn>).mock.calls.length).toBe(calls);
  });

  it('restarts the track on "previous" once past its opening seconds', async () => {
    const { hook, audio, clock } = setup({ hasSession: true });
    await act(async () => {
      await hook.result.current.playlist.addFiles([file('a'), file('b')]);
    });
    clock.set(20);
    act(() => hook.result.current.player.previous());
    expect(audio.seekTo).toHaveBeenCalledWith(0);
  });

  it('resumes a stored position, but starts over near the very end', async () => {
    const { hook, audio } = setup();
    await act(async () => {
      await hook.result.current.playlist.addFiles([file('a')]);
    });
    const id = hook.result.current.playlist.tracks[0].id;
    await act(async () => {
      await hook.result.current.player.playTrack(id, { autoplay: false, startAt: 12 });
    });
    expect(audio.seekTo).toHaveBeenCalledWith(12, expect.anything());

    (audio.seekTo as ReturnType<typeof vi.fn>).mockClear();
    await act(async () => {
      await hook.result.current.player.playTrack(id, { autoplay: false, startAt: 29.5 });
    });
    expect(audio.seekTo).not.toHaveBeenCalled();
  });

  it('marks a file that fails to decode as broken', async () => {
    const { hook } = setup({ loadAudioFile: vi.fn(async () => undefined) });
    await act(async () => {
      await hook.result.current.playlist.addFiles([file('bad')]);
    });
    const id = hook.result.current.playlist.tracks[0].id;
    await act(async () => {
      await hook.result.current.player.playTrack(id, { autoplay: true });
    });
    expect(hook.result.current.playlist.tracks[0].broken).toBe(true);
  });
});
