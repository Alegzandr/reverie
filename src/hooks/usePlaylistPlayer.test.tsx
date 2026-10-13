import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { usePlaylist } from './usePlaylist';
import { usePlaylistPlayer, type PlayerAudio } from './usePlaylistPlayer';
import { createPlaybackClock } from '../utils/playbackClock';
import { PLAYLIST } from '../constants';

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

  it('drops a load still in flight when the session is cancelled (reset)', async () => {
    let finish: (b: AudioBuffer) => void = () => {};
    const { hook, audio } = setup({ loadAudioFile: vi.fn(() => new Promise<AudioBuffer>((r) => (finish = r))) });
    await act(async () => {
      await hook.result.current.playlist.addFiles([file('a')]);
    });
    const id = hook.result.current.playlist.tracks[0].id;
    let played: Promise<boolean> = Promise.resolve(true);
    act(() => {
      played = hook.result.current.player.playTrack(id, { autoplay: true });
    });
    act(() => hook.result.current.player.cancelPending());
    await act(async () => finish(buffer()));
    expect(await played).toBe(false);
    expect(audio.playAudio).not.toHaveBeenCalled();
  });

  it('never files the previous track\'s playhead under a track still loading', async () => {
    let finish: (b: AudioBuffer) => void = () => {};
    const loadAudioFile = vi.fn(async () => buffer());
    const { hook, clock } = setup({ hasSession: true, loadAudioFile });
    await act(async () => {
      await hook.result.current.playlist.addFiles([file('a'), file('b')]);
    });
    const [a, b] = hook.result.current.playlist.tracks.map((t) => t.id);
    await act(async () => {
      await hook.result.current.player.playTrack(a, { autoplay: true });
    });
    clock.set(20);

    loadAudioFile.mockImplementationOnce(() => new Promise<AudioBuffer>((r) => (finish = r)));
    act(() => {
      void hook.result.current.player.playTrack(b, { autoplay: true });
    });
    window.dispatchEvent(new Event('pagehide'));
    expect(JSON.parse(localStorage.getItem(PLAYLIST.SESSION_STORAGE_KEY) ?? 'null')).toEqual({ activeId: b, position: 0 });

    clock.set(0);
    await act(async () => finish(buffer()));
    clock.set(3);
    window.dispatchEvent(new Event('pagehide'));
    expect(JSON.parse(localStorage.getItem(PLAYLIST.SESSION_STORAGE_KEY) ?? 'null')).toEqual({ activeId: b, position: 3 });
  });

  it('under shuffle, the first file loaded into an empty session leads the lap', async () => {
    localStorage.setItem(PLAYLIST.SHUFFLE_STORAGE_KEY, 'true');
    // A dealer that would bury the first file without the lead.
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { hook, audio } = setup();
    const first = file('a');
    act(() => hook.result.current.player.addFiles([first, file('b'), file('c')]));
    await waitFor(() => expect(audio.loadAudioFile).toHaveBeenCalledWith(first));
    vi.mocked(Math.random).mockRestore();
    await waitFor(() => expect(hook.result.current.playlist.activeId).not.toBeNull());
    expect(hook.result.current.playlist.tracks.find((t) => t.id === hook.result.current.playlist.activeId)?.file).toBe(first);
    expect(hook.result.current.playlist.previousId).toBeNull();
    expect(hook.result.current.playlist.upcomingId).not.toBeNull();
  });
});
