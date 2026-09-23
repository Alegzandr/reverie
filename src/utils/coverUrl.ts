/**
 * Object URLs for embedded cover art, cached per Blob so every row, the Zion
 * card and the media session share one URL per cover (and a re-render never
 * mints a new one). Released explicitly when the track leaves the playlist.
 */
const urls = new Map<Blob, string>();

export function coverUrl(blob: Blob | null | undefined): string | null {
  if (!blob || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return null;
  let url = urls.get(blob);
  if (!url) {
    url = URL.createObjectURL(blob);
    urls.set(blob, url);
  }
  return url;
}

export function releaseCoverUrl(blob: Blob): void {
  const url = urls.get(blob);
  if (!url) return;
  urls.delete(blob);
  URL.revokeObjectURL(url);
}
