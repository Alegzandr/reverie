/**
 * Precomputed, tileable smooth value noise, uploaded once as textures so the
 * shaders pay one hardware-filtered fetch per octave instead of eight hashes.
 * That single trade is what lets volumetric worlds (nebula, clouds) march at
 * full frame rate on integrated GPUs.
 *
 * Both are built from a small random lattice (period = `cells`) interpolated
 * with a quintic fade at `perCell` texels per cell - the GPU's linear filter
 * then only bridges texels that already lie on a smooth surface. In the shader
 * one lattice cell spans 1 / cells of the texture, so sampling at p / cells
 * yields one noise feature per world unit.
 */

function lattice(count: number, seed: number): Float32Array {
  const out = new Float32Array(count);
  let s = seed >>> 0;
  for (let i = 0; i < count; i += 1) {
    s = (s * 1664525 + 1013904223) >>> 0;
    out[i] = s / 4294967296;
  }
  return out;
}

const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

export const NOISE3D_CELLS = 16;
export const NOISE2D_CELLS = 32;

/**
 * 64³ RGBA8 tileable 3D noise (16 cells per axis). The four channels are
 * independent fields, so a domain warp gets three decorrelated offsets from a
 * single fetch.
 */
export function buildNoise3D(): { size: number; data: Uint8Array } {
  const cells = NOISE3D_CELLS;
  const per = 4;
  const size = cells * per;
  const lats = [0x5eed1, 0x7a11, 0xc0ffee, 0xd00d].map((seed) => lattice(cells * cells * cells, seed));
  const idx = (x: number, y: number, z: number) => ((z % cells) * cells + (y % cells)) * cells + (x % cells);
  const data = new Uint8Array(size * size * size * 4);
  let o = 0;
  for (let z = 0; z < size; z += 1) {
    const zc = Math.floor(z / per);
    const fz = fade((z % per) / per);
    for (let y = 0; y < size; y += 1) {
      const yc = Math.floor(y / per);
      const fy = fade((y % per) / per);
      for (let x = 0; x < size; x += 1) {
        const xc = Math.floor(x / per);
        const fx = fade((x % per) / per);
        const i000 = idx(xc, yc, zc);
        const i100 = idx(xc + 1, yc, zc);
        const i010 = idx(xc, yc + 1, zc);
        const i110 = idx(xc + 1, yc + 1, zc);
        const i001 = idx(xc, yc, zc + 1);
        const i101 = idx(xc + 1, yc, zc + 1);
        const i011 = idx(xc, yc + 1, zc + 1);
        const i111 = idx(xc + 1, yc + 1, zc + 1);
        for (const lat of lats) {
          const c00 = lat[i000] + (lat[i100] - lat[i000]) * fx;
          const c10 = lat[i010] + (lat[i110] - lat[i010]) * fx;
          const c01 = lat[i001] + (lat[i101] - lat[i001]) * fx;
          const c11 = lat[i011] + (lat[i111] - lat[i011]) * fx;
          const c0 = c00 + (c10 - c00) * fy;
          const c1 = c01 + (c11 - c01) * fy;
          data[o++] = Math.round((c0 + (c1 - c0) * fz) * 255);
        }
      }
    }
  }
  return { size, data };
}

/** 256² RG8 tileable 2D noise (32 cells per axis); G is an independent octave seed. */
export function buildNoise2D(): { size: number; data: Uint8Array } {
  const cells = NOISE2D_CELLS;
  const per = 8;
  const size = cells * per;
  const latR = lattice(cells * cells, 0xa11ce);
  const latG = lattice(cells * cells, 0xb0b);
  const data = new Uint8Array(size * size * 2);
  let o = 0;
  for (let y = 0; y < size; y += 1) {
    const yc = Math.floor(y / per);
    const fy = fade((y % per) / per);
    for (let x = 0; x < size; x += 1) {
      const xc = Math.floor(x / per);
      const fx = fade((x % per) / per);
      for (const lat of [latR, latG]) {
        const at = (i: number, j: number) => lat[(j % cells) * cells + (i % cells)];
        const a = at(xc, yc) + (at(xc + 1, yc) - at(xc, yc)) * fx;
        const b = at(xc, yc + 1) + (at(xc + 1, yc + 1) - at(xc, yc + 1)) * fx;
        data[o++] = Math.round((a + (b - a) * fy) * 255);
      }
    }
  }
  return { size, data };
}
