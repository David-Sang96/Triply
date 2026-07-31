/**
 * Turns the raw app screenshots in legal/ into the transparent phone renders in
 * legal/public/assets, so they can sit on any page colour.
 *
 * The screenshots share one perfectly flat backdrop (#f8f9fa). A plain colour
 * key would also punch holes in the phone screens, which contain near-white
 * pixels, so this floods inward from the border instead: only the outer backdrop
 * is reachable, and anything walled off by the phone frame stays opaque. The
 * drop shadow fades into that backdrop, so its darkness is converted back into
 * alpha rather than being cut off as a grey ring.
 *
 * Run from the repo root (uses the jimp devDependency):
 *   node legal/tools/prepare-images.cjs
 */

const path = require('path');
const { Jimp, intToRGBA } = require('jimp');

const SRC = path.join(__dirname, '..');
const OUT = path.join(__dirname, '..', 'public', 'assets');

/** Shadows are treated as this neutral dark, which reads correctly on any background. */
const SHADOW = { r: 70, g: 80, b: 96 };
/** Max sum-of-channel distance from the backdrop still counted as backdrop or shadow. */
const TOL = 46;

/** name, output name, max output width (never upscaled). */
const IMAGES = [
  ['auth', 'hero-phones', 1240],
  ['trips', 'trips-phone', 720],
  ['assistant', 'assistant-phones', 1000],
];

async function cut(name, outName, targetW) {
  const img = await Jimp.read(path.join(SRC, `${name}.png`));
  const { width: W, height: H, data } = img.bitmap;
  const bg = intToRGBA(img.getPixelColor(2, 2));
  const dist = (i) =>
    Math.abs(data[i] - bg.r) + Math.abs(data[i + 1] - bg.g) + Math.abs(data[i + 2] - bg.b);

  const seen = new Uint8Array(W * H);
  const stack = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const p = y * W + x;
    if (seen[p] || dist(p * 4) > TOL) return;
    seen[p] = 1;
    stack.push(p);
  };
  for (let x = 0; x < W; x++) { push(x, 0); push(x, H - 1); }
  for (let y = 0; y < H; y++) { push(0, y); push(W - 1, y); }
  while (stack.length) {
    const p = stack.pop();
    const x = p % W;
    const y = (p - x) / W;
    push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
  }

  const span = bg.g - SHADOW.g;
  let minx = W, miny = H, maxx = -1, maxy = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = y * W + x;
      const i = p * 4;
      if (seen[p]) {
        const a = Math.max(0, Math.min(1, (bg.g - data[i + 1]) / span));
        data[i] = SHADOW.r;
        data[i + 1] = SHADOW.g;
        data[i + 2] = SHADOW.b;
        data[i + 3] = Math.round(a * 255);
        if (a === 0) continue; // fully transparent: not part of the trim box
      }
      if (x < minx) minx = x;
      if (y < miny) miny = y;
      if (x > maxx) maxx = x;
      if (y > maxy) maxy = y;
    }
  }

  img.crop({ x: minx, y: miny, w: maxx - minx + 1, h: maxy - miny + 1 });
  const trimmed = `${img.bitmap.width}x${img.bitmap.height}`;
  if (targetW < img.bitmap.width) img.resize({ w: targetW });
  await img.write(path.join(OUT, `${outName}.png`), { deflateLevel: 9 });
  console.log(`${name}.png -> assets/${outName}.png  trimmed=${trimmed} out=${img.bitmap.width}x${img.bitmap.height}`);
}

(async () => {
  for (const [name, outName, targetW] of IMAGES) await cut(name, outName, targetW);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
