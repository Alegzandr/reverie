# Product

## Register

product

## Users

Music fans and remixers, not audio engineers. They arrive with a track they love and an idea: a sped-up edit, a slowed + reverb version for a late-night mood, an 8D mix that rotates around the head in headphones, or a bass-boosted cut. Their context is personal and playful: at home, often on headphones, at a computer, in a creative mood. They want a result in a few clicks and a download in the original quality. No DAW knowledge, no install, no account.

## Product Purpose

Reverie is a free, fully in-browser audio editor that turns any track into an atmospheric remix. Four effects: Speed Up, Slowed + Reverb, 8D Audio, Bass Boost. All processing runs client-side through the Web Audio API, so files never leave the device (privacy by architecture). Exports mirror the source format and quality. The app ships in 10 languages and installs as a PWA. It is a deliberately **desktop-only** experience: the cockpit (effects rail, living waveform, mood rail) needs a wide canvas to feel like itself, so viewports narrower than 1024px are gated to a branded "open on a larger screen" stage with no bypass - we would rather send a phone visitor to a computer than ship a cramped layout. Success looks like a first-time visitor uploading a track and downloading a transformed version they are proud to share, without ever needing a tutorial.

## Brand Personality

Dreamy, immersive, calm. Three words: oneiric, enveloping, effortless. Using Reverie should feel like slipping into a reverie: soft, atmospheric, a little magical, while staying quietly competent underneath. The voice is warm and unfussy, never technical and never salesy. The magic lives in the result and the smoothness of getting there, not in jargon.

## Anti-references

- **Dense technical DAWs** (Audacity, pro audio stations): intimidating walls of menus, knobs, and meters. Reverie hides the machinery.
- **Spammy online converters**: ad-choked pages, fake "Download" buttons, cheap UI, dark patterns. Reverie stays clean, honest, and ad-free.
- **Generic "AI" SaaS templates**: cream-and-violet gradient hero, hero-metric blocks, identical feature cards, an interchangeable landing. Reverie owns a specific aesthetic.
- **Neon crypto and gaming looks**: pure black with garish glow, aggressive saturation, "gamer" energy. Reverie's glow is soft and dreamy, never harsh.

## Design Principles

1. **Two clicks to delight.** The path from upload to a downloadable result is the product. Every screen serves that flow, and nothing competes with it.
2. **Hide the machinery, show the magic.** Surface one clear control per effect. Keep technical detail (bitrate, sample rate, bit depth) available but secondary. Power without intimidation.
3. **Privacy you can feel.** Client-side processing is a promise, not a footnote. State it plainly, and never betray it with trackers or uploads.
4. **Atmosphere over chrome.** The dreamy mood is a feature, not decoration. The interface is a holographic HUD floating over a living ambient scene, and it breathes with the music - the bloom, the chrome, and the play orb pulse to the audio. Listeners pick a mood to reskin the whole atmosphere in one tap. Motion, color, and the waveform should make transforming audio feel immersive - and all of it has a calm, static fallback under reduced motion.
5. **Respect the source.** Exports match the original format and quality. We transform the track, we never degrade it.

## Accessibility & Inclusion

Target WCAG 2.1 AA. Full keyboard navigation and screen-reader support across every control. Honor `prefers-reduced-motion`: the atmospheric motion needs a calm, static fallback. Hold AA contrast for text and interactive states in both light and dark moods despite the saturated palette. Never encode meaning in color alone: effect modes carry labels and icons, not just hue. The 10-language scope (including ZH, JA, KO, HI, RU) means layouts must tolerate text expansion and non-Latin scripts.
