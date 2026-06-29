/**
 * Application-wide constants
 * Centralized configuration for magic numbers, formats, and settings
 */

// ============================================================================
// AUDIO PROCESSING CONSTANTS
// ============================================================================

export const AUDIO_PROCESSING = {
  /** Default audio volume (0.0 to 1.0) */
  DEFAULT_VOLUME: 0.7,

  /** Storage key for persisting volume preference */
  VOLUME_STORAGE_KEY: 'reverie:volume',

  /** Progress update interval in milliseconds */
  PROGRESS_UPDATE_INTERVAL_MS: 100,

  /** Maximum progress value before completion */
  PROGRESS_MAX_BEFORE_COMPLETE: 90,

  /** Delay after buffer ends before stopping MediaRecorder (ms) */
  MEDIA_RECORDER_STOP_DELAY_MS: 100,
} as const;

// ============================================================================
// BITRATE CONSTANTS
// ============================================================================

export const BITRATE = {
  /** Default MP3 bitrate in kbps */
  DEFAULT_MP3_KBPS: 192,

  /** Minimum MP3 bitrate in kbps */
  MIN_MP3_KBPS: 96,

  /** Maximum MP3 bitrate in kbps */
  MAX_MP3_KBPS: 320,

  /** Default MediaRecorder bitrate in bits per second */
  DEFAULT_MEDIA_RECORDER_BPS: 192000,
} as const;

// ============================================================================
// FLAC ENCODING CONSTANTS
// ============================================================================

export const FLAC_ENCODING = {
  /**
   * libFLAC compression level (0 = fastest/largest, 8 = slowest/smallest).
   * Level 5 is the FLAC default: a good speed/size balance and lossless either way.
   */
  COMPRESSION_LEVEL: 5,

  /** Bit depth used when encoding the (16-bit PCM) processed buffer to FLAC */
  BITS_PER_SAMPLE: 16,
} as const;

// ============================================================================
// BIT DEPTH CONSTANTS
// ============================================================================

export const BIT_DEPTH = {
  /** Common bit depths for audio files */
  COMMON: [8, 16, 24, 32] as const,

  /** Bit depth estimation boundaries (bytes per sample * 8) */
  BOUNDARIES: {
    /** <= 12 → 8-bit */
    EIGHT_BIT: 12,
    /** <= 20 → 16-bit */
    SIXTEEN_BIT: 20,
    /** <= 28 → 24-bit */
    TWENTY_FOUR_BIT: 28,
    /** > 28 → 32-bit */
  },

  /** Lossless formats that have meaningful bit depth */
  LOSSLESS_FORMATS: ['wav', 'wave', 'aiff', 'aif', 'aifc', 'flac'] as const,
} as const;

// ============================================================================
// VIEWPORT / LAYOUT CONSTANTS
// ============================================================================

export const VIEWPORT = {
  /**
   * Minimum viewport width (px) Reverie is offered at. The cockpit - effects
   * rail, holographic waveform and mood rail - only lines up on a real desktop
   * canvas (the 3-column grid activates at Tailwind's `lg`, 1024px). Below this
   * we gate to a branded "come back on a bigger screen" stage instead of
   * shipping a cramped mobile layout. Width-based and matched to `lg`.
   */
  MIN_DESKTOP_WIDTH: 1024,
} as const;

// ============================================================================
// FILE FORMAT CONSTANTS
// ============================================================================

export const FILE_FORMATS = {
  /**
   * Maximum accepted upload size in bytes. Decoding happens in-memory via the
   * Web Audio API, so an oversized file can exhaust the tab's memory. This caps
   * it with a clear error instead of crashing the tab (resilience + UX).
   */
  MAX_FILE_SIZE_BYTES: 200 * 1024 * 1024, // 200 MB

  /** Accepted audio MIME types for file upload */
  ACCEPTED_MIME_TYPES: [
    'audio/mpeg',     // MP3
    'audio/mp3',      // MP3 (alternative MIME)
    'audio/wav',      // WAV
    'audio/wave',     // WAV (alternative MIME)
    'audio/x-wav',    // WAV (alternative MIME)
    'audio/ogg',      // OGG Vorbis
    'audio/opus',     // Opus
    'audio/mp4',      // MP4/M4A
    'audio/m4a',      // M4A
    'audio/x-m4a',    // M4A (alternative MIME)
    'audio/aac',      // AAC
    'audio/aacp',     // AAC+
    'audio/flac',     // FLAC
    'audio/x-flac',   // FLAC (alternative MIME)
    'audio/webm',     // WebM
    'audio/aiff',     // AIFF
    'audio/x-aiff',   // AIFF (alternative MIME)
    'audio/aifc',     // AIFF-C
    'audio/3gpp',     // 3GPP
    'audio/3gpp2',    // 3GPP2
    'audio/amr',      // AMR
  ] as const,

  /** File extensions mapped to format categories */
  EXTENSIONS: {
    WAV: ['wav', 'wave'] as const,
    MP3: ['mp3'] as const,
    AIFF: ['aiff', 'aif', 'aifc'] as const,
    FLAC: ['flac'] as const,
    WEBM: ['webm'] as const,
    OGG: ['ogg', 'opus', 'oga'] as const,
    M4A: ['m4a', 'aac', 'mp4'] as const,
  },
} as const;

// ============================================================================
// METADATA EXTRACTION CONSTANTS
// ============================================================================

export const METADATA_EXTRACTION = {
  /** File header sizes for various formats (in bytes) */
  HEADER_SIZES: {
    WAV: 44,
    AIFF: 54,
    FLAC: 42,
    MP3_SEARCH: 4096, // Search first 4KB for MP3 frame
  },

  /** MP3 sample rates by MPEG version and index */
  MP3_SAMPLE_RATES: [
    [11025, 12000, 8000],  // MPEG 2.5
    [0, 0, 0],              // reserved
    [22050, 24000, 16000], // MPEG 2
    [44100, 48000, 32000]  // MPEG 1
  ] as const,

  /** MP3 frame sync byte pattern */
  MP3_FRAME_SYNC: 0xff,

  /** MP3 frame sync mask for second byte */
  MP3_FRAME_SYNC_MASK: 0xe0,
} as const;

// ============================================================================
// MEDIARECORDER FORMAT MAP
// ============================================================================

export const MEDIA_RECORDER_FORMATS = {
  /** MIME type candidates for each format (in priority order) */
  MIME_TYPE_MAP: {
    webm: ['audio/webm;codecs=opus', 'audio/webm'],
    ogg: ['audio/ogg;codecs=opus', 'audio/ogg;codecs=vorbis', 'audio/ogg'],
    opus: ['audio/ogg;codecs=opus', 'audio/webm;codecs=opus'],
    m4a: ['audio/mp4;codecs=mp4a.40.2', 'audio/mp4'],
    aac: ['audio/mp4;codecs=mp4a.40.2', 'audio/mp4'],
    mp4: ['audio/mp4;codecs=mp4a.40.2', 'audio/mp4'],
  } as const,

  /** All possible MIME types to test for browser support */
  POSSIBLE_MIME_TYPES: [
    'audio/webm',
    'audio/webm;codecs=opus',
    'audio/webm;codecs=vorbis',
    'audio/ogg',
    'audio/ogg;codecs=opus',
    'audio/ogg;codecs=vorbis',
    'audio/mp4',
    'audio/mp4;codecs=mp4a.40.2', // AAC-LC
    'audio/mpeg', // Some browsers might support MP3
    'audio/wav', // Some browsers might support WAV
  ] as const,
} as const;

// ============================================================================
// WAVEFORM VISUALIZATION CONSTANTS
// ============================================================================

export const WAVEFORM = {
  /** Number of bars to display in waveform timeline */
  BAR_COUNT: 96,

  /** Minimum number of bars to display */
  MIN_BAR_COUNT: 24,

  /** Minimum bar height percentage */
  MIN_BAR_HEIGHT_PERCENT: 8,
} as const;

// ============================================================================
// ERROR MESSAGES
// ============================================================================

export const ERROR_MESSAGES = {
  /** File loading errors */
  LOAD_FAILED: 'Failed to load audio file',
  NO_AUDIO_TO_PLAY: 'No audio to play',
  FILE_TOO_LARGE: (maxMb: number) => `File is too large. Maximum size is ${maxMb} MB`,

  /** Processing errors */
  PROCESS_FAILED: 'Failed to process audio',

  /** Export errors */
  EXPORT_FAILED: 'Failed to export audio',
  NO_AUDIO_TO_EXPORT: 'No audio to export',
  MIME_TYPE_NOT_SUPPORTED: (mimeType: string) => `MIME type ${mimeType} is not supported by this browser`,
  MEDIA_RECORDER_ERROR: (event: unknown) => `MediaRecorder error: ${event}`,

  /** Metadata extraction warnings */
  METADATA_EXTRACTION_FAILED: (format: string) => `Failed to extract metadata from ${format}`,
} as const;

// ============================================================================
// AUDIO EFFECT CONSTANTS
// ============================================================================

export const AUDIO_EFFECTS = {
  /** Bass boost filter frequencies (Hz) */
  BASS_BOOST: {
    LOWSHELF_FREQUENCY_HZ: 100,
    HIGHPASS_FREQUENCY_HZ: 40,
    PEAKING_FREQUENCY_HZ: 300,
  },

  /** Reverb settings */
  REVERB: {
    DEFAULT_DURATION_MS: 500,
    DECAY_RATE: 2, // Exponential decay factor
  },

  /** Speed adjustment ranges */
  SPEED: {
    MIN_MULTIPLIER: 0.5,
    MAX_MULTIPLIER: 2.0,
  },

  /** 8D audio settings */
  EIGHT_D: {
    AUTOMATION_POINTS_PER_SECOND: 60,
  },

  /**
   * 6-band listening equalizer. Applied to real-time playback only (never baked
   * into exports). Bands match the classic preset banks: a low shelf, four
   * peaking mids, and a high shelf. Order here is the canonical band order used
   * everywhere (preset gains, sliders, filter nodes).
   */
  EQUALIZER: {
    /** Per-band gain bounds in dB. */
    GAIN_MIN_DB: -12,
    GAIN_MAX_DB: 12,
    GAIN_STEP_DB: 1,
    /** Q for the peaking mids (shelves ignore Q). */
    PEAKING_Q: 1,
    /** localStorage keys for the persisted listening EQ. */
    GAINS_STORAGE_KEY: 'reverie:eq-gains',
    PRESET_STORAGE_KEY: 'reverie:eq-preset',
    /** One entry per band, in canonical order. */
    BANDS: [
      { label: '60', frequencyHz: 60, type: 'lowshelf' },
      { label: '150', frequencyHz: 150, type: 'peaking' },
      { label: '400', frequencyHz: 400, type: 'peaking' },
      { label: '1K', frequencyHz: 1000, type: 'peaking' },
      { label: '2.4K', frequencyHz: 2400, type: 'peaking' },
      { label: '15K', frequencyHz: 15000, type: 'highshelf' },
    ],
  },
} as const;

// ============================================================================
// UI EFFECT CONTROL DEFAULTS
// ============================================================================

export const EFFECT_DEFAULTS = {
  /** Speed-up effect defaults */
  SPEED_UP: {
    DEFAULT: 1.3,
    MIN: 1.1,
    MAX: 2.0,
    STEP: 0.05,
  },

  /** Slow-reverb effect defaults */
  SLOW_REVERB: {
    SPEED_DEFAULT: 0.7,
    SPEED_MIN: 0.5,
    SPEED_MAX: 0.9,
    SPEED_STEP: 0.05,
    REVERB_DEFAULT: 0.5,
    REVERB_MIN: 0.1,
    REVERB_MAX: 1.0,
    REVERB_STEP: 0.1,
  },

  /** 8D audio effect defaults */
  EIGHT_D_AUDIO: {
    ROTATION_DEFAULT: 0.4,
    ROTATION_MIN: 0.2,
    ROTATION_MAX: 1.5,
    ROTATION_STEP: 0.1,
  },

  /** Bass boost effect defaults */
  BASS_BOOST_UI: {
    INTENSITY_DEFAULT: 0.5,
    INTENSITY_MIN: 0.0,
    INTENSITY_MAX: 1.0,
    INTENSITY_STEP: 0.01,
    /** Threshold for light bass intensity */
    LIGHT_THRESHOLD: 0.33,
    /** Threshold for normal bass intensity */
    NORMAL_THRESHOLD: 0.67,
  },
} as const;

// ============================================================================
// EXPORT LABELS (English-only for filenames)
// ============================================================================

/**
 * English-only effect labels for exported filenames
 * These should NOT be translated to maintain consistent naming across languages
 */
export const EFFECT_EXPORT_LABELS = {
  'none': 'original',
  'speed-up': 'sped-up',
  'slow-reverb': 'slow+reverb',
  '8d-audio': '8D',
  'bass-boost': 'bass-boosted',
} as const;

// ============================================================================
// AUDIO PROCESSING SIGNAL CONSTANTS
// ============================================================================

export const AUDIO_SIGNAL = {
  /** 8D audio mix ratios */
  EIGHT_D_MIX: {
    /** Rotating dry signal (panned) - the main music that orbits the head. */
    DRY_GAIN: 0.85,
    /**
     * Constant reverb bed (un-panned). Fed from the pre-pan signal so a quiet
     * ambience stays present in BOTH ears at all times - this prevents a "silent
     * void" from rotating opposite the music. Kept low so it sits under the music.
     */
    WET_GAIN: 0.22,
    STEREO_VARIATION_LEFT: 1.0,
    STEREO_VARIATION_RIGHT: 0.9,
  },

  /** PCM conversion constants */
  PCM: {
    /** Maximum negative value for 16-bit PCM */
    INT16_MIN: 0x8000,
    /** Maximum positive value for 16-bit PCM */
    INT16_MAX: 0x7fff,
  },

  /** WAV file format constants */
  WAV_FORMAT: {
    /** "RIFF" chunk descriptor */
    RIFF_ID: 0x46464952,
    /** "WAVE" format */
    WAVE_ID: 0x45564157,
    /** "fmt " sub-chunk */
    FMT_ID: 0x20746d66,
    /** "data" sub-chunk */
    DATA_ID: 0x61746164,
    /** WAV header size in bytes */
    HEADER_SIZE: 44,
    /** PCM format code */
    PCM_FORMAT: 1,
    /** Format chunk size for PCM */
    FMT_CHUNK_SIZE: 16,
    /** Bits per sample for 16-bit PCM */
    BITS_PER_SAMPLE: 16,
  },
} as const;

// ============================================================================
// TYPE EXPORTS
// ============================================================================

/** Valid audio file extensions */
export type AudioFileExtension =
  | typeof FILE_FORMATS.EXTENSIONS.WAV[number]
  | typeof FILE_FORMATS.EXTENSIONS.MP3[number]
  | typeof FILE_FORMATS.EXTENSIONS.AIFF[number]
  | typeof FILE_FORMATS.EXTENSIONS.FLAC[number]
  | typeof FILE_FORMATS.EXTENSIONS.WEBM[number]
  | typeof FILE_FORMATS.EXTENSIONS.OGG[number]
  | typeof FILE_FORMATS.EXTENSIONS.M4A[number];

/** Valid MIME types for MediaRecorder */
export type MediaRecorderMimeType = typeof MEDIA_RECORDER_FORMATS.POSSIBLE_MIME_TYPES[number];

/** Valid bit depths */
export type BitDepth = typeof BIT_DEPTH.COMMON[number];
