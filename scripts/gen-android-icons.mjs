// One-off generator for the Android adaptive icon layers, built from the globe
// artwork. Run from the repo root: node gen-icons.mjs
//
// Android masks an adaptive icon's foreground to a circle, squircle or rounded
// square depending on the launcher, and only the centre ~66% is guaranteed to
// survive that mask. So the globe is scaled to 62% of the canvas and centred,
// leaving margin on every side.
import { Jimp, intToRGBA } from "jimp";

const SIZE = 1024;
const SAFE = 0.62; // fraction of the canvas the artwork may occupy

const sources = ["design/world.png", "assets/images/splash-globe.png"];

let src = null;
for (const path of sources) {
  try {
    const img = await Jimp.read(path);
    if (!src || img.bitmap.width > src.img.bitmap.width) src = { path, img };
  } catch {
    // not present — try the next one
  }
}
if (!src) throw new Error(`no source image found (tried ${sources.join(", ")})`);
console.log(`source     ${src.path} ${src.img.bitmap.width}x${src.img.bitmap.height}`);

// Trim transparent padding so the scale below is based on the artwork itself,
// not on whatever empty space the source happened to carry. Done from the alpha
// channel by hand: Jimp's autocrop() compares colours, and fully transparent
// pixels can hold arbitrary RGB, so it leaves alpha-only borders in place —
// which on design/world.png meant scaling a 1536x1024 canvas whose globe only
// occupies the middle, producing a tiny off-centre icon.
const art = src.img.clone();
{
  const { data, width: w, height: h } = art.bitmap;
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] < 16) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) throw new Error("source image is fully transparent");
  art.crop({ x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 });
}
console.log(`cropped    ${art.bitmap.width}x${art.bitmap.height}`);

const scale = (SIZE * SAFE) / Math.max(art.bitmap.width, art.bitmap.height);
const w = Math.round(art.bitmap.width * scale);
const h = Math.round(art.bitmap.height * scale);
art.resize({ w, h });

// --- foreground: the globe, centred on transparency ---
const foreground = new Jimp({ width: SIZE, height: SIZE, color: 0x00000000 });
foreground.composite(art, Math.round((SIZE - w) / 2), Math.round((SIZE - h) / 2));
await foreground.write("assets/images/android-icon-foreground.png");
console.log(`foreground ${w}x${h} centred on ${SIZE}x${SIZE}`);

// --- monochrome: the same shape as a flat silhouette ---
// Themed icons ("Material You") are tinted by the system, so only the alpha
// channel matters. Anything meaningfully opaque becomes solid black.
//
// The cutoff is high on purpose. The globe sits on a soft drop shadow whose
// alpha ramps from nothing up to about half; a low threshold swallows part of
// that ramp and leaves a torn, dirty edge along the bottom of the silhouette.
const ALPHA_CUTOFF = 140;
const monochrome = foreground.clone();
monochrome.scan(0, 0, SIZE, SIZE, function (x, y, idx) {
  const alpha = this.bitmap.data[idx + 3];
  this.bitmap.data[idx] = 0;
  this.bitmap.data[idx + 1] = 0;
  this.bitmap.data[idx + 2] = 0;
  this.bitmap.data[idx + 3] = alpha > ALPHA_CUTOFF ? 255 : 0;
});
await monochrome.write("assets/images/android-icon-monochrome.png");
console.log("monochrome silhouette written");

// --- icon.png: web/PWA fallback, must be opaque ---
const flat = new Jimp({ width: SIZE, height: SIZE, color: 0xe6f4feff });
flat.composite(art, Math.round((SIZE - w) / 2), Math.round((SIZE - h) / 2));
await flat.write("assets/images/icon.png");
console.log(`icon.png   flat ${intToRGBA(0xe6f4feff).r},${intToRGBA(0xe6f4feff).g},${intToRGBA(0xe6f4feff).b} background`);
