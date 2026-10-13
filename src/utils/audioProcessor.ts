import { AUDIO_SIGNAL, EFFECT_DEFAULTS, NIGHTCORE } from '../constants';
import { createEffectChain, applyEffectOptions } from './effectGraph';
import { BinaryWriter } from './binary';
import { interleaveToInt16 } from './pcm';
import { loadBeatSamples, type BeatRole } from './beatSamples';
import { beatRoles, beatOnsetTimes } from './beatScheduler';

export interface AudioProcessingOptions {
  speedMultiplier: number;
  reverbAmount: number;
  audio8D?: boolean; // 8D spatial audio effect
  rotationSpeed?: number; // Speed of 8D rotation (0.1 - 2.0)
  bassBoost?: boolean; // Bass boost effect
  bassBoostIntensity?: number; // Bass boost intensity (0.0 - 1.0)
  bassUnderwater?: number; // Underwater muffle amount within bass boost (0.0 - 1.0)
  // Nightcore beat bed (Speed Up only). enable/volume are user choices; bpm and
  // beatOffsetSec are the track's detected tempo, injected by the processor hook so
  // the same grid drives live playback and the offline export.
  enableBeats?: boolean; // Layer a percussion bed under the speed-up
  beatsVolume?: number; // Beat-bed level, independent of master volume (0.0 - 1.0)
  bpm?: number; // Detected tempo for the beat grid
  beatOffsetSec?: number; // Seconds to the first downbeat of the grid
  beatsPerBar?: 3 | 4; // Detected meter (waltz vs common time) for the beat pattern
}

/** Live playback is always stereo out of the panner. */
const STEREO_CHANNELS = 2;

/**
 * Channel count for the offline render. Reverb (stereo impulse) and 8D (orbit and
 * widened bed) create stereo content even from a mono source - live playback hears
 * it in stereo, so the render must not fold it back down. Without them a mono track
 * stays mono: both channels would be identical anyway.
 */
export function renderChannelCount(source: AudioBuffer, options: AudioProcessingOptions): number {
  const stereoEffects = !!options.audio8D || (options.reverbAmount || 0) > 0;
  return stereoEffects ? Math.max(STEREO_CHANNELS, source.numberOfChannels) : source.numberOfChannels;
}

/**
 * Audio Processor
 *
 * Handles all audio processing operations including loading, effects processing,
 * and format conversion using the Web Audio API.
 */
export class AudioProcessor {
  // Created lazily on first use (see getAudioContext): constructing an AudioContext
  // at module load spins up the audio hardware on every page visit - including the
  // welcome/desktop-gate screens where audio never plays - and trips a browser
  // warning about contexts created before a user gesture.
  private audioContext: AudioContext | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private loadSeq = 0;

  /**
   * Load an audio file and decode it into an AudioBuffer
   *
   * @param file - The audio file to load
   * @returns Promise that resolves to the decoded AudioBuffer
   * @throws Error if file cannot be decoded or is not a valid audio file
   */
  async loadAudioFile(file: File): Promise<AudioBuffer> {
    // Playlist skips can overlap decodes; only the latest request may become the
    // current buffer, or a slow older decode landing last would make exports
    // render the wrong song.
    const seq = ++this.loadSeq;
    try {
      const arrayBuffer = await file.arrayBuffer();
      const decoded = await this.getAudioContext().decodeAudioData(arrayBuffer);
      if (seq === this.loadSeq) this.audioBuffer = decoded;
      return decoded;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to load audio file: ${message}`);
    }
  }

  /**
   * Render the effects offline (speed, reverb, 8D spatial, bass boost, beats).
   *
   * The graph is the live engine's own effect chain (createEffectChain +
   * applyEffectOptions, minus the listening EQ), so the export matches what was
   * auditioned by construction rather than by keeping two builders in sync.
   *
   * @param options - Processing options including speed, reverb, and effects
   * @param source - The buffer to render. Callers pass the track they have
   *   committed: the processor's own buffer follows the latest decode, which can
   *   briefly belong to a track the UI hasn't switched to yet.
   * @returns Promise that resolves to the processed AudioBuffer
   * @throws Error if no audio file is loaded or processing fails
   */
  async processAudio(options: AudioProcessingOptions, source: AudioBuffer | null = this.audioBuffer): Promise<AudioBuffer> {
    if (!source) {
      throw new Error('No audio file loaded');
    }

    try {
      const speed = options.speedMultiplier || 1;
      const offlineContext = new OfflineAudioContext(
        renderChannelCount(source, options),
        Math.floor(source.length / speed),
        source.sampleRate,
      );

      const sourceNode = offlineContext.createBufferSource();
      sourceNode.buffer = source;
      sourceNode.playbackRate.value = speed;

      const chain = createEffectChain(offlineContext, { listeningEq: false });
      applyEffectOptions(chain, options, offlineContext, false);
      sourceNode.connect(chain.input);
      chain.output.connect(offlineContext.destination);

      // Bake the Nightcore beat bed so the export matches what was auditioned. Scheduled
      // straight into the offline destination (in parallel to the music), on the same
      // sped-up grid the live scheduler uses. Best-effort: a sample load failure leaves
      // the export untouched rather than aborting it.
      await this.scheduleOfflineBeats(offlineContext, options);

      sourceNode.start(0);

      return await offlineContext.startRendering();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to process audio: ${message}`);
    }
  }

  /** Forget the loaded track and invalidate any decode still in flight. */
  clear(): void {
    this.loadSeq++;
    this.audioBuffer = null;
  }

  /**
   * Bake the Nightcore beat bed into the offline render. Mirrors the live scheduler's
   * grid (per detected meter, crash every 4 bars, samples aligned to their attack) but
   * on the offline timeline: song time maps to output time by dividing by the speed
   * multiplier, so the grid lands at the same sped-up tempo the user auditioned.
   */
  private async scheduleOfflineBeats(
    offlineContext: OfflineAudioContext,
    options: AudioProcessingOptions,
  ): Promise<void> {
    const bpm = options.bpm ?? 0;
    if (!options.enableBeats || bpm <= 0) return;

    let samples;
    try {
      samples = await loadBeatSamples(this.getAudioContext());
    } catch {
      return; // samples unavailable - export the music without the bed
    }

    const speed = options.speedMultiplier || 1;
    const beatOffsetSec = Math.max(0, options.beatOffsetSec ?? 0);
    const beatsPerBar = options.beatsPerBar ?? 4;
    const outputDuration = offlineContext.length / offlineContext.sampleRate;

    const beatsGain = offlineContext.createGain();
    beatsGain.gain.value = options.beatsVolume ?? EFFECT_DEFAULTS.NIGHTCORE_BEATS.VOLUME_DEFAULT;
    beatsGain.connect(offlineContext.destination);

    const roleGains = {} as Record<BeatRole, GainNode>;
    (Object.keys(NIGHTCORE.ROLE_GAINS) as BeatRole[]).forEach((role) => {
      const gain = offlineContext.createGain();
      gain.gain.value = NIGHTCORE.ROLE_GAINS[role];
      gain.connect(beatsGain);
      roleGains[role] = gain;
    });

    const fire = (role: BeatRole, when: number) => {
      const sample = samples![role];
      const src = offlineContext.createBufferSource();
      src.buffer = sample.buffer;
      src.connect(roleGains[role]);
      // Start early by the sample's attack so the transient - not the buffer head -
      // lands on the beat, matching the live scheduler. Clamped to the render start.
      src.start(Math.max(0, when - sample.attackOffsetSec));
    };

    // Beat times on the sped-up output timeline (effective tempo = bpm × speed).
    beatOnsetTimes(bpm, beatOffsetSec, speed, outputDuration).forEach((when, index) => {
      for (const role of beatRoles(index, beatsPerBar)) fire(role, when);
    });
  }

  /** Convert an AudioBuffer to a standard 16-bit PCM WAV file. */
  async audioBufferToWav(audioBuffer: AudioBuffer): Promise<Blob> {
    const { HEADER_SIZE, PCM_FORMAT, FMT_CHUNK_SIZE, BITS_PER_SAMPLE } = AUDIO_SIGNAL.WAV_FORMAT;
    const numberOfChannels = audioBuffer.numberOfChannels;
    const bytesPerFrame = numberOfChannels * 2;
    const dataSize = audioBuffer.length * bytesPerFrame;

    const buffer = new ArrayBuffer(HEADER_SIZE + dataSize);
    const writer = new BinaryWriter(buffer, true);

    writer.ascii('RIFF');
    writer.u32(HEADER_SIZE - 8 + dataSize);
    writer.ascii('WAVE');

    writer.ascii('fmt ');
    writer.u32(FMT_CHUNK_SIZE);
    writer.u16(PCM_FORMAT);
    writer.u16(numberOfChannels);
    writer.u32(audioBuffer.sampleRate);
    writer.u32(audioBuffer.sampleRate * bytesPerFrame);
    writer.u16(bytesPerFrame);
    writer.u16(BITS_PER_SAMPLE);

    writer.ascii('data');
    writer.u32(dataSize);

    const pcm = interleaveToInt16(audioBuffer);
    for (let i = 0; i < pcm.length; i++) {
      writer.i16(pcm[i]);
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    return this.audioContext;
  }

  getAudioBuffer(): AudioBuffer | null {
    return this.audioBuffer;
  }
}

export const audioProcessor = new AudioProcessor();
