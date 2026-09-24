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
    VOLUME_STORAGE_KEY: "reverie:volume",

    /** Storage key for persisting the repeat mode ('off' | 'all' | 'one'; legacy 'true' reads as 'one') */
    REPEAT_STORAGE_KEY: "reverie:repeat",

    /** Storage keys for the "show time remaining" clock preference, one per toggle so they stay independent */
    DURATION_DISPLAY_STORAGE_KEY_FOOTER: "reverie:show-remaining:footer",
    DURATION_DISPLAY_STORAGE_KEY_WAVEFORM: "reverie:show-remaining:waveform",

    /** Keyboard seek step (seconds) for the left/right arrows and the timeline focus seeks */
    SEEK_STEP_SECONDS: 5,

    /** Volume step (0-1) for the up/down arrows and the volume wheel */
    VOLUME_STEP: 0.05,

    /** Progress update interval in milliseconds */
    PROGRESS_UPDATE_INTERVAL_MS: 100,

    /** Maximum progress value before completion */
    PROGRESS_MAX_BEFORE_COMPLETE: 90,

    /** Delay after buffer ends before stopping MediaRecorder (ms) */
    MEDIA_RECORDER_STOP_DELAY_MS: 100,
} as const;

// ============================================================================
// PLAYLIST
// ============================================================================

export const PLAYLIST = {
    /** IndexedDB database holding the listener's tracks (the files themselves, on-device only). */
    DB_NAME: "reverie",
    DB_VERSION: 1,
    /** Object store of track records ({ id, blob, name, ... }), keyed by id. */
    TRACKS_STORE: "tracks",
    /** Small key/value store for the playlist order. */
    META_STORE: "meta",
    ORDER_KEY: "order",

    /** localStorage keys for the lightweight session state (written often, read once at boot). */
    SESSION_STORAGE_KEY: "reverie:playlist-session",
    SHUFFLE_STORAGE_KEY: "reverie:shuffle",

    /** Seconds into a track past which "previous" restarts it instead of stepping back. */
    PREVIOUS_RESTART_THRESHOLD_SECONDS: 3,

    /** How often (ms) the playhead is checkpointed while playing, so a reload resumes near where you left. */
    POSITION_SAVE_INTERVAL_MS: 2000,
    /** Never resume within this many seconds of the end: a finished track should start over, not replay its last breath. */
    RESUME_TAIL_GUARD_SECONDS: 2,

    /** Give up on the metadata-only duration probe after this long (ms); the decode fills it in later anyway. */
    DURATION_PROBE_TIMEOUT_MS: 8000,

    /** Show the filter field once the list is long enough to need searching. */
    FILTER_MIN_TRACKS: 8,

    /** Seconds before a track ends when the now-playing block starts announcing the next one. */
    UP_NEXT_LEAD_SECONDS: 12,
} as const;

// ============================================================================
// RESTING INTERFACE
// ============================================================================

export const EXPORT_NOTICE = {
    /** How long (ms) the Export pill answers "Saved" and names the file after a download. */
    VISIBLE_MS: 4000,
} as const;

export const UI_REST = {
    /** Preference: let the fullscreen cockpit step aside while you listen (default on). */
    STORAGE_KEY: "reverie:rest-ui",
} as const;

// ============================================================================
// REACTIVE VISUALS
// ============================================================================

export const AUDIO_REACTIVITY = {
    /**
     * Reactive-visual intensity is calibrated per track so quiet/dynamic and hot/
     * compressed masters drive comparable visuals. The primary reference is the
     * track's gated integrated loudness (RMS): the gain aims it at TARGET_RMS, lifting
     * quiet tracks and pulling loud ones back. TARGET_RMS ~ a typical pop master, so
     * ordinary tracks land near gain 1 (unchanged from the original fixed scaling).
     */
    TARGET_RMS: 0.12,
    /** Floor on a track's measured RMS so a near-silent track can't explode the gain. */
    RMS_FLOOR: 0.03,
    /** Bounds on the loudness gain: pull hot masters down, lift quiet ones, but never
     *  past these limits. */
    MIN_GAIN: 0.5,
    MAX_GAIN: 4,
    /**
     * Peak headroom floor (~ -12 dBFS). The loudness gain is additionally capped at
     * 1 / peak so a track that's quiet on average but has loud transients doesn't get
     * boosted until those transients slam - preserving the "max dB" headroom guard.
     */
    PEAK_FLOOR: 0.25,
    /**
     * Global intensity trim applied to the per-band targets *after* per-track
     * calibration, then re-clamped to [0,1]. Above 1 it pushes the reactive
     * visuals with a touch more energy and amplitude (swelling further into their
     * range) without changing the relative band balance or breaking the headroom
     * guard - values still saturate at 1, so it stays tasteful, never blown out.
     */
    INTENSITY: 1.25,
} as const;

// ============================================================================
// LIVING WORLDS (WebGL2 scene engine)
// ============================================================================

export const SCENE_WORLD = {
    /** Log-spaced spectrum bands published to the shaders (texture width). */
    BANDS: 64,
    /** Spectrum history depth in rows (texture height) - the worlds' memory of the music (~8.5 s). */
    HISTORY_ROWS: 512,
    /** History rows written per second; shaders convert "seconds ago" through it. */
    HISTORY_RATE: 60,
    /** Band edges (Hz): kick fundamentals up to the top of the "air". */
    MIN_FREQUENCY_HZ: 32,
    MAX_FREQUENCY_HZ: 16000,
    /** The worlds' own analyser, teed off the playback one for finer low-end resolution. */
    FFT_SIZE: 2048,
    ANALYSER_SMOOTHING: 0.55,
    ANALYSER_MIN_DB: -90,
    ANALYSER_MAX_DB: -20,
    /** Byte floor (0-1) under which a band reads as silence - the analyser's noise bed. */
    BAND_FLOOR: 0.22,
    /** High bands carry less energy in real music; tilt them up so the whole ring breathes. */
    BAND_TILT: 0.55,
    /** Auto-gain: the running peak decays by this per frame, never below PEAK_FLOOR. */
    PEAK_DECAY: 0.996,
    PEAK_FLOOR: 0.3,
    /** Kick detector: bass must beat its own slow baseline by this ratio + offset, no faster than MIN_GAP. */
    KICK_RATIO: 1.28,
    KICK_OFFSET: 0.07,
    KICK_MIN_GAP_SECONDS: 0.2,
    /** Render resolution as a fraction of CSS pixels; adapted live between MIN and MAX. */
    RENDER_SCALE_START: 0.8,
    RENDER_SCALE_MIN: 0.5,
    RENDER_SCALE_MAX: 1,
    /**
     * Temporal accumulation: weight of the running history against each new
     * jittered frame. High enough to resolve edges and march noise into smooth
     * gradients; the neighbourhood clamp in the shader keeps motion ghost-free.
     */
    TAA_HISTORY_WEIGHT: 0.88,
    /** Gentle unsharp amount on the final pass (the accumulation softens a touch). */
    PRESENT_SHARPEN: 0.22,
    /** Jittered frames a still (reduced-motion) world accumulates before it rests. */
    STILL_FRAMES: 24,
    /** Frame-time EMA thresholds (ms) for stepping the render scale down / up. */
    SLOW_FRAME_MS: 22,
    FAST_FRAME_MS: 17.5,
    /** How often (ms) the render scale may change - long enough for the EMA to settle. */
    SCALE_ADAPT_INTERVAL_MS: 1200,
    /** Multiplicative render-scale steps: drop fast on a slow frame, climb back gently. */
    SCALE_STEP_DOWN: 0.88,
    SCALE_STEP_UP: 1.04,
    /** Cross-fade (ms) from the old world's last frame into the new one on a mood switch. */
    WORLD_FADE_IN_MS: 1400,
    /**
     * Beat clock: the tempo-locked pulse the world nods along with (see beatClock.ts).
     * Onset envelope sampled at RATE; tempo and phase re-estimated over the last WINDOW.
     */
    BEAT_CLOCK: {
        RATE: 60,
        WINDOW_SECONDS: 6,
        /** Nothing is estimated before this much music has been heard. */
        MIN_HISTORY_SECONDS: 2.5,
        ESTIMATE_INTERVAL_SECONDS: 0.15,
        /** Local average removed from the onset envelope, so only hits stand out. */
        DETREND_SECONDS: 0.3,
        /** A band's rise over two envelope samples that counts as fully "hit". */
        RISE: 0.12,
        /** Tempo search range, lag grid (envelope samples) and the prior's centre / width. */
        MIN_BPM: 60,
        MAX_BPM: 200,
        LAG_STEP: 0.5,
        PRIOR_BPM: 115,
        PRIOR_OCTAVES: 0.7,
        /** Faster than this (seconds) nods every other beat - headbanging at 170 isn't a nod. */
        NOD_MIN_PERIOD: 0.42,
        /**
         * Pulse clarity (the onset envelope's autocorrelation at its beat) mapped to
         * confidence. Measured: piano ballads sit ~0.15, hip-hop ~0.3, four-on-the-floor 0.5-0.8.
         */
        CLARITY_LOW: 0.2,
        CLARITY_HIGH: 0.4,
        /** Longest lag the clarity looks at (seconds). */
        CLARITY_MAX_LAG_SECONDS: 1.5,
        /** Overall level under which the clock doesn't trust anything. */
        MIN_LEVEL: 0.04,
        /** Confidence easing: grows in over a couple of bars, leaves quicker at a breakdown. */
        CONFIDENCE_RISE_SECONDS: 1.5,
        CONFIDENCE_FALL_SECONDS: 0.6,
        /** Below this confidence a fresh estimate re-locks the clock outright. */
        RELOCK_CONFIDENCE: 0.15,
        /** Same tempo within this (octaves): nudge period / phase by these gains per estimate. */
        SAME_TEMPO_OCTAVES: 0.05,
        PERIOD_GAIN: 0.2,
        PHASE_GAIN: 0.25,
        /** Consecutive estimates a new tempo must hold before the clock jumps to it. */
        TEMPO_SWITCH_ESTIMATES: 4,
        /** How far the clock's phase trails the music (the analyser's smoothing), measured. */
        ANALYSER_LAG_SECONDS: 0.015,
    },
    /** The head nod (beatCrop.ts), applied in the present pass after the temporal accumulation. */
    BEAT_CROP: {
        /** Zoom of the nearest things at a full bump, pushed out from the frame centre. */
        NOD_ZOOM: 0.012,
        /** Share of that zoom the horizon and sky keep: the whole frame bumps, near things more. */
        FAR_SHARE: 0.4,
        /**
         * Share of each beat spent settling after the hit; the rest winds back
         * into the next one. One continuous sway, no rest in between: a head
         * that stops dead between beats reads as hopping.
         */
        SETTLE_SHARE: 0.62,
        /** Playhead smoothing (alpha-beta filter per frame): the audio clock ticks in coarse steps. */
        PLAYHEAD_ALPHA: 0.08,
        PLAYHEAD_BETA: 0.003,
        /** A playhead error this large is a seek, not jitter (s): jump to it. */
        PLAYHEAD_SNAP_SECONDS: 0.25,
        /** How long the head takes to come to rest when the music stops (s). */
        REST_SECONDS: 0.4,
    },
} as const;

// ============================================================================
// BEAT GRID (whole-track beat analysis for the worlds' nod - see utils/beatGrid.ts)
// ============================================================================

export const BEAT_GRID = {
    /** The track is decimated to about this rate before analysis (drum bands end well below 11 kHz). */
    ANALYSIS_RATE_HZ: 22050,
    FFT_SIZE: 1024,
    /** Onset envelope frames per second. */
    ENV_RATE: 100,
    /** Log-spaced analysis bands between these edges (only the drum bands are weighted). */
    BANDS: 48,
    MIN_HZ: 32,
    MAX_HZ: 10000,
    /** A band rising this many dB over RISE_FRAMES counts as fully "hit". */
    RISE_DB: 9,
    RISE_FRAMES: 2,
    /** Tempo search range and the prior's centre / width (octaves). */
    MIN_BPM: 60,
    MAX_BPM: 200,
    PRIOR_BPM: 110,
    PRIOR_OCTAVES: 0.8,
    /** Metrical support: the autocorrelation two and four beats on, and its weights in a tempo's score. */
    METER_MULTIPLES: [2, 4],
    METER_WEIGHTS: [0.35, 0.15],
    /** How hard the beat tracker holds the tempo against a stray onset (Ellis's tightness). */
    TIGHTNESS: 100,
    /** Faster than this (seconds, ~133 BPM) the world nods every other beat. */
    NOD_MIN_PERIOD: 0.45,
    /** Beats each side weighed when picking which of a pair to nod on. */
    PARITY_BEATS: 8,
    /** Harmonic/percussive split: median lengths along time (frames) and across bands. */
    HARMONIC_MEDIAN_FRAMES: 21,
    PERCUSSIVE_MEDIAN_BANDS: 9,
    /**
     * Drums: the percussive share of the drum bands' energy, averaged over this
     * half-window around a nod, and its mapping. Measured: piano ballad ~0.2,
     * drumless intros ~0.2, hip-hop / house / rock with drums 0.5-0.7.
     */
    DRUM_WINDOW_SECONDS: 1.5,
    DRUMS_LOW: 0.35,
    DRUMS_HIGH: 0.52,
    /**
     * Drum loudness around a nod against the song's mean over its audible frames:
     * only a near-empty breakdown fails it (a lighter verse sits ~20 dB under a drop).
     */
    DRUM_LEVEL_LOW: 0.003,
    DRUM_LEVEL_HIGH: 0.012,
    /** Nod amount from the same drum level: ACCENT_FLOOR at or under LOW, full at HIGH and up. */
    ACCENT_FLOOR: 0.55,
    ACCENT_LEVEL_LOW: 0.02,
    ACCENT_LEVEL_HIGH: 0.6,
    /** Hits near the nod against the track's typical hit: below LOW the drums have dropped out. */
    PRESENCE_LOW: 0.15,
    PRESENCE_HIGH: 0.45,
    /** Frames this far (dB) under the loudest are silence: no nods. */
    SILENCE_DB: 45,
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
    LOSSLESS_FORMATS: ["wav", "wave", "aiff", "aif", "aifc", "flac"] as const,
} as const;

// ============================================================================
// VIEWPORT / LAYOUT CONSTANTS
// ============================================================================

export const VIEWPORT = {
    /**
     * Minimum viewport width (px) Reverie is offered at. The cockpit - raked
     * effects and playlist consoles around the open centre - only lines up on a
     * real desktop canvas (Tailwind's `lg`, 1024px). Below this
     * we gate to a branded "come back on a bigger screen" stage instead of
     * shipping a cramped mobile layout. Width-based and matched to `lg`.
     */
    MIN_DESKTOP_WIDTH: 1024,
} as const;

/**
 * Fullscreen auto-hide: after this long without pointer or keyboard activity the
 * cockpit panels fade out and the rails slide off-screen so the ambient scene has
 * the screen to itself; any movement brings them back. Motion timings live with the styles
 * (`.chrome-autohide` in index.css).
 */
export const FULLSCREEN_CHROME = {
    IDLE_HIDE_DELAY_MS: 3000,
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
        "audio/mpeg", // MP3
        "audio/mp3", // MP3 (alternative MIME)
        "audio/wav", // WAV
        "audio/wave", // WAV (alternative MIME)
        "audio/x-wav", // WAV (alternative MIME)
        "audio/ogg", // OGG Vorbis
        "audio/opus", // Opus
        "audio/mp4", // MP4/M4A
        "audio/m4a", // M4A
        "audio/x-m4a", // M4A (alternative MIME)
        "audio/aac", // AAC
        "audio/aacp", // AAC+
        "audio/flac", // FLAC
        "audio/x-flac", // FLAC (alternative MIME)
        "audio/webm", // WebM
        "audio/aiff", // AIFF
        "audio/x-aiff", // AIFF (alternative MIME)
        "audio/aifc", // AIFF-C
        "audio/3gpp", // 3GPP
        "audio/3gpp2", // 3GPP2
        "audio/amr", // AMR
    ] as const,

    /** File extensions mapped to format categories */
    EXTENSIONS: {
        WAV: ["wav", "wave"] as const,
        MP3: ["mp3"] as const,
        AIFF: ["aiff", "aif", "aifc"] as const,
        FLAC: ["flac"] as const,
        WEBM: ["webm"] as const,
        OGG: ["ogg", "opus", "oga"] as const,
        M4A: ["m4a", "aac", "mp4"] as const,
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
        [11025, 12000, 8000], // MPEG 2.5
        [0, 0, 0], // reserved
        [22050, 24000, 16000], // MPEG 2
        [44100, 48000, 32000], // MPEG 1
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
        webm: ["audio/webm;codecs=opus", "audio/webm"],
        ogg: ["audio/ogg;codecs=opus", "audio/ogg;codecs=vorbis", "audio/ogg"],
        opus: ["audio/ogg;codecs=opus", "audio/webm;codecs=opus"],
        m4a: ["audio/mp4;codecs=mp4a.40.2", "audio/mp4"],
        aac: ["audio/mp4;codecs=mp4a.40.2", "audio/mp4"],
        mp4: ["audio/mp4;codecs=mp4a.40.2", "audio/mp4"],
    } as const,
} as const;

// ============================================================================
// WAVEFORM VISUALIZATION CONSTANTS
// ============================================================================

export const WAVEFORM = {
    /** Envelope samples across the unstretched clip - dense enough that the ribbon's contour carries real detail at desktop widths */
    BAR_COUNT: 192,

    /** Minimum number of bars to display */
    MIN_BAR_COUNT: 24,

    /** Minimum bar height percentage */
    MIN_BAR_HEIGHT_PERCENT: 8,

    /** Display normalisation: the loudest sample reaches this share of the ribbon's half-height */
    NORMALIZED_PEAK: 0.94,

    /** Percentile (0..1) of the envelope treated as the track's "quiet" level, ignoring silent intros/outros */
    CONTRAST_FLOOR_PERCENTILE: 0.1,

    /** Share of that quiet level kept as baseline; below 1 expands dynamics so a mastered-loud track stops reading as a flat band */
    CONTRAST_FLOOR_KEEP: 0.6,

    /** Width (px) of the left/right edge zones that trigger auto-scroll while scrubbing an overflowing clip */
    EDGE_SCROLL_ZONE_PX: 48,

    /** Peak auto-scroll speed (px per frame) reached at the very edge of the viewport */
    EDGE_SCROLL_MAX_SPEED: 16,
} as const;

// ============================================================================
// ERROR MESSAGES
// ============================================================================

export const ERROR_MESSAGES = {
    /** File loading errors */
    LOAD_FAILED: "Failed to load audio file",
    NO_AUDIO_TO_PLAY: "No audio to play",
    FILE_TOO_LARGE: (maxMb: number) =>
        `File is too large. Maximum size is ${maxMb} MB`,

    /** Processing errors */
    PROCESS_FAILED: "Failed to process audio",

    /** Export errors */
    EXPORT_FAILED: "Failed to export audio",
    NO_AUDIO_TO_EXPORT: "No audio to export",
    MIME_TYPE_NOT_SUPPORTED: (mimeType: string) =>
        `MIME type ${mimeType} is not supported by this browser`,
    MEDIA_RECORDER_ERROR: (event: unknown) => `MediaRecorder error: ${event}`,

    /** Metadata extraction warnings */
    METADATA_EXTRACTION_FAILED: (format: string) =>
        `Failed to extract metadata from ${format}`,
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
        /**
         * Underwater muffle: a lowpass whose cutoff sweeps from transparent down to a
         * deep muffle as the amount grows, with a slow LFO wobble on the cutoff for the
         * "submerged" feel. Amount 0 leaves the cutoff at MAX (effectively bypassed).
         */
        UNDERWATER_CUTOFF_MAX_HZ: 18000,
        UNDERWATER_CUTOFF_MIN_HZ: 500,
        UNDERWATER_LFO_FREQUENCY_HZ: 0.25, // ~4 s period - a gentle swell, not a tremolo
        UNDERWATER_LFO_DEPTH_RATIO: 0.15, // wobble peaks at ±15% of the cutoff
    },

    /** Reverb settings */
    REVERB: {
        DECAY_RATE: 2, // Exponential decay factor
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
        GAINS_STORAGE_KEY: "reverie:eq-gains",
        PRESET_STORAGE_KEY: "reverie:eq-preset",
        /** One entry per band, in canonical order. */
        BANDS: [
            { label: "60", frequencyHz: 60, type: "lowshelf" },
            { label: "150", frequencyHz: 150, type: "peaking" },
            { label: "400", frequencyHz: 400, type: "peaking" },
            { label: "1K", frequencyHz: 1000, type: "peaking" },
            { label: "2.4K", frequencyHz: 2400, type: "peaking" },
            { label: "15K", frequencyHz: 15000, type: "highshelf" },
        ],
    },
} as const;

// ============================================================================
// NIGHTCORE BEAT BED (engine)
// ============================================================================

export const NIGHTCORE = {
    /**
     * Public URLs for the one-shot samples (served from /public/sounds). Built from
     * BASE_URL so they resolve under Vite's production base ('/reverie/') instead of
     * the site root - a hardcoded '/sounds/...' 404s on GitHub Pages.
     */
    SAMPLES: {
        kick: `${import.meta.env.BASE_URL}sounds/nightcore-kick.flac`,
        clap: `${import.meta.env.BASE_URL}sounds/nightcore-clap.flac`,
        finish: `${import.meta.env.BASE_URL}sounds/nightcore-finish.flac`,
    },
    /**
     * Per-role level trims so the pre-rendered samples sit together (the crash matches
     * the clap). Applied on top of the user's independent beat volume.
     */
    ROLE_GAINS: {
        kick: 1.0,
        clap: 0.9,
        finish: 0.9,
    },
    /**
     * Which beats-in-bar carry the kick and the clap, per detected meter. 4/4 is the
     * osu! Nightcore staple (kick on 1 & 3, clap on 2 & 4); 3/4 is a waltz feel
     * (boom-tap-tap: kick on 1, clap on 2 & 3). The meter comes from tempo detection.
     */
    PATTERNS: {
        3: { KICK_BEATS: [0], CLAP_BEATS: [1, 2] },
        4: { KICK_BEATS: [0, 2], CLAP_BEATS: [1, 3] },
    },
    /** Crash/finish cadence: the downbeat of every 4th bar, whatever the meter. */
    FINISH_EVERY_BARS: 4,
    /**
     * Perceived-attack alignment. A one-shot's audible transient isn't at sample 0, so
     * firing it exactly on the beat lands the *hit* a few ms late. We measure each
     * sample's attack (its first rise to ATTACK_THRESHOLD_RATIO of the early-window
     * peak) and start it that much early, so the transient - not the buffer head - sits
     * on the grid. This applies to the kick too: the grid is phased to the track's own
     * drum *attacks* (refineDownbeat), so click-on-click is what reads as tight -
     * peak-aligning the kick's sub body was measured to flam its click ~11 ms ahead of
     * the music's. Capped at MAX_ALIGN_SECONDS so a slow-swell sample can't yank the
     * hit wildly early.
     */
    ATTACK_THRESHOLD_RATIO: 0.5,
    MAX_ALIGN_SECONDS: 0.05,
    /**
     * Lookahead scheduler (Web Audio "A Tale of Two Clocks"): a short JS timer wakes
     * up every TICK_MS and schedules any beat whose audio-clock time lands within the
     * next SCHEDULE_AHEAD_SECONDS, so timing rides the sample-accurate audio clock,
     * not setInterval jitter. The window is kept small so a live speed change re-anchors
     * within ~one tick.
     */
    SCHEDULE_AHEAD_SECONDS: 0.12,
    TICK_MS: 25,
} as const;

// ============================================================================
// TEMPO DETECTION
// ============================================================================

export const TEMPO_DETECTION = {
    /**
     * Search range for the estimated BPM. Autocorrelation peaks are weighted toward
     * PREFERRED_BPM (a log-Gaussian) so a track's half/double tempo doesn't win the
     * octave - the classic failure mode of raw autocorrelation.
     */
    MIN_BPM: 70,
    MAX_BPM: 180,
    PREFERRED_BPM: 120,
    /** Width (in octaves) of the tempo preference curve. */
    PREFERENCE_OCTAVES: 0.9,
    /** Onset-envelope hop in samples (~11 ms at 44.1 kHz) → envelope frame rate. */
    HOP_SIZE: 512,
    /**
     * The beat phase (downbeat) is measured from a low-passed copy of the track: the
     * kick drum lives below this cutoff, so phasing the grid to the low-band onsets
     * lands our kick on the real kicks - not on the louder backbeat snare, which is
     * what pulls a full-band phase estimate onto the offbeat.
     */
    KICK_LOWPASS_HZ: 150,
    /** Fallback tempo when the track is too flat/silent to estimate one. */
    DEFAULT_BPM: 120,
    /**
     * Fractional-BPM refinement. The autocorrelation picks an *integer* envelope lag,
     * which quantizes the tempo in steps of roughly 1-3 BPM over the search range, and
     * envelope smearing can pull the peak a further whole lag off. Either error
     * compounds: at 90 BPM a 2.5% miss drifts the grid a full beat every ~26 s. So the
     * coarse pick is refined by sweeping a harmonic comb of the onset envelope's DFT -
     * the summed energy at 1×..HARMONICS× the beat frequency - over ±RANGE_RATIO
     * around it (wide enough to cover a whole-lag miss, far too narrow to jump an
     * octave), first at COARSE_STEP_BPM then at FINE_STEP_BPM around the winner.
     * The comb matters: much of a groove's periodic energy rides the beat's
     * subdivisions (hi-hat eighths at 2×, etc.), and the fundamental bin alone was
     * measured 0.2 BPM off on real material where the comb lands within ~0.01 BPM -
     * drift-free over a full-length track.
     */
    REFINE_RANGE_RATIO: 0.04,
    REFINE_COARSE_STEP_BPM: 0.1,
    REFINE_FINE_STEP_BPM: 0.005,
    REFINE_HARMONICS: 4,
    /**
     * Octave/meter re-ranking. The autocorrelation's winning lag is often a metrical
     * *relative* of the beat rather than the beat itself - the 2-beat lag (a backbeat
     * pattern repeats every two beats), the dotted quarter, the bar. The preference
     * weight alone can't save this: those lags genuinely correlate as strongly as the
     * beat (measured: a 150 BPM track whose 2-beat lag out-scored the beat lag and shipped
     * a half-tempo grid). So each metrical relative of the ACF pick that lands inside
     * MIN..MAX_BPM is refined and re-scored by its harmonic-comb energy × the same
     * tempo preference, and the strongest comb wins. The comb is the right judge because
     * the true beat's comb collects the groove's whole subdivision ladder (beat, 8ths,
     * 16ths), while a relative's comb only ever captures a slice of it.
     */
    OCTAVE_CANDIDATE_RATIOS: [
        1,
        2,
        1 / 2,
        3,
        1 / 3,
        3 / 2,
        2 / 3,
        4 / 3,
        3 / 4,
    ],
    /**
     * Meter detection (3/4 vs 4/4). Once the beat grid is found, a beat-synchronous
     * accent series is autocorrelated at the two bar-length lags - triple time (3) and
     * quadruple time (4) - and the lag with the stronger self-similarity is the meter.
     * ACCENT_WINDOW_RATIO sizes the per-beat energy window (as a fraction of the beat).
     * Most music is 4/4, so triple only wins when it beats 4/4 by METER_TRIPLE_MARGIN,
     * and only once there are METER_MIN_BEATS beats to measure over.
     */
    METER_ACCENT_WINDOW_RATIO: 0.25,
    METER_MIN_BEATS: 12,
    METER_TRIPLE_MARGIN: 1.1,
    /** Meter assumed when there's too little signal to decide. */
    DEFAULT_BEATS_PER_BAR: 4,
    /**
     * Downbeat refinement. The onset-envelope phase reads a few ms early: the log-energy
     * flux front-loads the first rise out of silence, so the coarse downbeat lands ahead
     * of the true attack (the beats sound rushed). We snap it to the steepest kick-band
     * energy rise within DOWNBEAT_REFINE_RADIUS_SEC of the estimate, measuring the rise
     * over an ONSET_RISE_WINDOW_SEC energy window. The radius stays well under half a beat
     * (< the fastest MAX_BPM beat) so the grid can never jump to a neighbouring beat.
     */
    DOWNBEAT_REFINE_RADIUS_SEC: 0.03,
    ONSET_RISE_WINDOW_SEC: 0.01,
} as const;

// ============================================================================
// UI EFFECT CONTROL DEFAULTS
// ============================================================================

export const EFFECT_DEFAULTS = {
    /**
     * A first visit hears the untouched track; afterwards the console reopens on
     * whatever the listener left (active effect + every slider), kept under this key.
     */
    MODE_DEFAULT: "none",
    STORAGE_KEY: "reverie:effects",

    /** Speed-up effect defaults */
    SPEED_UP: {
        DEFAULT: 1.2,
        MIN: 1.1,
        MAX: 2.0,
        STEP: 0.05,
    },

    /**
     * "Nightcore beats" - an optional 4/4 percussion bed layered under the Speed Up
     * effect (osu!-style): kick on 1 & 3, clap on 2 & 4, a crash every 4 bars. Off by
     * default so Speed Up stays a pure time-stretch.
     */
    NIGHTCORE_BEATS: {
        ENABLED_DEFAULT: false,
        /** Beat-bed level, independent of the track's master volume (0-1). */
        VOLUME_DEFAULT: 0.5,
        VOLUME_MIN: 0.0,
        VOLUME_MAX: 1.0,
        VOLUME_STEP: 0.01,
    },

    /** Slow-reverb effect defaults */
    SLOW_REVERB: {
        SPEED_DEFAULT: 0.9,
        SPEED_MIN: 0.5,
        SPEED_MAX: 0.9,
        SPEED_STEP: 0.05,
        REVERB_DEFAULT: 0.7,
        REVERB_MIN: 0.0,
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
        // Defaults into the "Normal" band so the label reads "Normal" from the first
        // frame, with room to dial up (Strong) or down (Light).
        INTENSITY_DEFAULT: 0.4,
        INTENSITY_MIN: 0.0,
        INTENSITY_MAX: 1.0,
        INTENSITY_STEP: 0.01,
        /** Threshold for light bass intensity */
        LIGHT_THRESHOLD: 0.33,
        /** Threshold for normal bass intensity */
        NORMAL_THRESHOLD: 0.67,
        /** Underwater muffle amount (0 = off, surface; 1 = deeply submerged). */
        UNDERWATER_DEFAULT: 0.0,
        UNDERWATER_MIN: 0.0,
        UNDERWATER_MAX: 1.0,
        UNDERWATER_STEP: 0.01,
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
    none: "original",
    "speed-up": "sped-up",
    "slow-reverb": "slow+reverb",
    "8d-audio": "8D",
    "bass-boost": "bass-boosted",
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
