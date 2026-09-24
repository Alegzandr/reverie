const digests = new WeakMap<Blob, Promise<string | null>>();

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * SHA-256 of a file's bytes, memoized per Blob so a file compared against
 * several same-size candidates is read once. Null when the bytes can't be read
 * or hashing is unavailable (insecure context) - callers then treat the file
 * as distinct rather than risk dropping a real song.
 */
export function fileDigest(blob: Blob): Promise<string | null> {
  let digest = digests.get(blob);
  if (!digest) {
    digest = (async () => {
      try {
        const subtle = globalThis.crypto?.subtle;
        if (!subtle) return null;
        return toHex(await subtle.digest('SHA-256', await blob.arrayBuffer()));
      } catch {
        return null;
      }
    })();
    digests.set(blob, digest);
  }
  return digest;
}

/** True only when both files are byte-for-byte identical. Sizes gate the (costly) hash. */
export async function sameContent(a: Blob, b: Blob): Promise<boolean> {
  if (a === b) return true;
  if (a.size !== b.size) return false;
  const [da, db] = await Promise.all([fileDigest(a), fileDigest(b)]);
  return da !== null && da === db;
}
