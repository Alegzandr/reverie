/**
 * Where the living world hears the music. The scene is mounted once at the app
 * root - above the welcome/workspace split, so the world never recompiles or
 * blinks when a session starts - while the playback analyser lives down in the
 * audio hooks. App registers its accessor here; the engine polls it per frame.
 */
type AnalyserAccessor = () => AnalyserNode | null;

let accessor: AnalyserAccessor | null = null;

export function provideWorldAnalyser(next: AnalyserAccessor | null): void {
  accessor = next;
}

export function currentWorldAnalyser(): AnalyserNode | null {
  return accessor ? accessor() : null;
}
