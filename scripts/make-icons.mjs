// Build-time: the app mark, at every size the web and Android ask for.
//
// The mark is the brand artwork in assets/brand/logo.png — a gold medallion
// holding a mosque, crescent and leaves. It arrives as a 1254px square on a
// cream ground, so this script finds the medallion, cuts it out as a circle,
// and composites it onto the app's deep green at each size the platforms want.
//
// There is still no image dependency: png.mjs reads and writes the files and
// box-filters the resize, which is what keeps the thin gold rim and the minaret
// from breaking up on the way down to a 48px launcher icon.
//
// scripts/calligraphy.mjs and logo-forms.mjs remain — they draw the lafẓ
// al-jalālah with a modelled qalam, and `node scripts/preview-logo.mjs` renders
// those candidates — but the brand artwork is what ships.
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, ensure, log, kb } from './_util.mjs'
import { decodePNG, encodePNG, resize } from './png.mjs'

const OUT = ensure(path.join(ROOT, 'public'))
const SOURCE = path.join(ROOT, 'assets', 'brand', 'logo.png')

const DEEP = [19, 46, 33]       // the ground the medallion sits on

/* ----------------------------- the artwork ------------------------------ */

// Locate the medallion inside the source square. Measured across the middle
// rather than over the whole image, because the artwork carries a drop shadow
// below it that would otherwise pull the centre down and inflate the radius.
function findMedallion(img) {
  const { width: W, height: H, data } = img
  const at = (x, y) => (y * W + x) * 4
  const g = [data[at(2, 2)], data[at(2, 2) + 1], data[at(2, 2) + 2]]
  const far = (x, y) => {
    const i = at(x, y)
    return Math.abs(data[i] - g[0]) + Math.abs(data[i + 1] - g[1]) + Math.abs(data[i + 2] - g[2]) > 24
  }

  let left = W, right = 0, top = H
  for (const y of [Math.round(H * 0.47), Math.round(H * 0.5), Math.round(H * 0.53)]) {
    for (let x = 0; x < W; x++) if (far(x, y)) { if (x < left) left = x; break }
    for (let x = W - 1; x >= 0; x--) if (far(x, y)) { if (x > right) right = x; break }
  }
  for (const x of [Math.round(W * 0.47), Math.round(W * 0.5), Math.round(W * 0.53)]) {
    for (let y = 0; y < H; y++) if (far(x, y)) { if (y < top) top = y; break }
  }

  const d = right - left + 1
  return { cx: (left + right) / 2, cy: top + d / 2, r: d / 2 }
}

// Cut the medallion out as a square tile with a circular alpha, so whatever is
// behind it — green, or nothing at all for an adaptive foreground — shows through.
function cutTile(img, m) {
  const size = Math.round(m.r * 2)
  const tile = Buffer.alloc(size * size * 4)
  const x0 = Math.round(m.cx - m.r)
  const y0 = Math.round(m.cy - m.r)
  const rr = m.r - 1.5          // pull in a touch so the cut lands inside the rim

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = (y * size + x) * 4
      const sx = x0 + x, sy = y0 + y
      if (sx < 0 || sy < 0 || sx >= img.width || sy >= img.height) continue
      const s = (sy * img.width + sx) * 4

      // Antialias the circular edge over one pixel.
      const dist = Math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2)
      const a = dist <= rr - 0.5 ? 1 : dist >= rr + 0.5 ? 0 : rr + 0.5 - dist
      if (a <= 0) continue

      tile[d] = img.data[s]
      tile[d + 1] = img.data[s + 1]
      tile[d + 2] = img.data[s + 2]
      tile[d + 3] = Math.round(255 * a)
    }
  }
  return { width: size, height: size, data: tile }
}

const source = decodePNG(fs.readFileSync(SOURCE))
const medallion = findMedallion(source)
const TILE = cutTile(source, medallion)

/* ------------------------------ compositing ------------------------------ */

const roundedAlpha = (x, y, size, radius) => {
  const dx = Math.max(radius - x, 0, x - (size - radius))
  const dy = Math.max(radius - y, 0, y - (size - radius))
  const d = Math.hypot(dx, dy)
  return d <= radius - 0.5 ? 1 : d >= radius + 0.5 ? 0 : radius + 0.5 - d
}

/**
 * @param mode 'legacy'     rounded square on the deep ground (web + launcher)
 *             'full'       full square on the deep ground (Apple never masks)
 *             'foreground' the medallion alone, transparent (Android adaptive)
 */
function draw(size, mode) {
  // Adaptive foregrounds are masked to the middle ~66% of the canvas, so the art
  // is drawn smaller there to survive whatever shape a launcher applies.
  const inset = mode === 'foreground' ? 0.64 : 0.86
  const art = Math.round(size * inset)
  const scaled = resize(TILE, art, art)
  const off = Math.round((size - art) / 2)

  const px = Buffer.alloc(size * size * 4)
  const radius = size * 0.225

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = (y * size + x) * 4

      // Ground.
      let groundA = 0
      if (mode === 'legacy') groundA = roundedAlpha(x + 0.5, y + 0.5, size, radius)
      else if (mode === 'full') groundA = 1

      let r = DEEP[0] * groundA, g = DEEP[1] * groundA, b = DEEP[2] * groundA, a = groundA

      // Medallion over it.
      const ax = x - off, ay = y - off
      if (ax >= 0 && ay >= 0 && ax < art && ay < art) {
        const s = (ay * art + ax) * 4
        const sa = scaled.data[s + 3] / 255
        if (sa > 0) {
          // Art must not paint outside the rounded ground it sits on.
          const clip = mode === 'legacy' ? Math.min(sa, groundA) : sa
          r = scaled.data[s] * clip + r * (1 - clip)
          g = scaled.data[s + 1] * clip + g * (1 - clip)
          b = scaled.data[s + 2] * clip + b * (1 - clip)
          a = clip + a * (1 - clip)
        }
      }

      if (a > 0) {
        px[d] = Math.round(r / a)
        px[d + 1] = Math.round(g / a)
        px[d + 2] = Math.round(b / a)
      }
      px[d + 3] = Math.round(a * 255)
    }
  }
  return px
}

const write = (file, size, mode) => {
  const png = encodePNG(size, size, draw(size, mode))
  ensure(path.dirname(file))
  fs.writeFileSync(file, png)
  return png.length
}


/* --------------------------------- splash -------------------------------- */

// The launch screen. Android shows this before the web view has painted
// anything, so if it is not generated alongside the icons it keeps whatever
// Capacitor scaffolded — which is how the old mark went on appearing at launch
// long after the icon had changed.
//
// It is the medallion centred on the app's green, sized as a fraction of the
// shorter edge so it looks the same on a tall phone and a wide tablet.
function drawSplash(w, h) {
  const art = Math.round(Math.min(w, h) * 0.42)
  const scaled = resize(TILE, art, art)
  const ox = Math.round((w - art) / 2)
  const oy = Math.round((h - art) / 2)

  const px = Buffer.alloc(w * h * 4)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d = (y * w + x) * 4
      let r = DEEP[0], g = DEEP[1], b = DEEP[2]

      const ax = x - ox, ay = y - oy
      if (ax >= 0 && ay >= 0 && ax < art && ay < art) {
        const sIdx = (ay * art + ax) * 4
        const a = scaled.data[sIdx + 3] / 255
        if (a > 0) {
          r = scaled.data[sIdx] * a + r * (1 - a)
          g = scaled.data[sIdx + 1] * a + g * (1 - a)
          b = scaled.data[sIdx + 2] * a + b * (1 - a)
        }
      }
      px[d] = Math.round(r); px[d + 1] = Math.round(g); px[d + 2] = Math.round(b); px[d + 3] = 255
    }
  }
  return encodePNG(w, h, px)
}

// The densities Capacitor scaffolds, portrait and landscape.
const SPLASH = {
  'drawable': [480, 320],
  'drawable-port-mdpi': [320, 480],
  'drawable-port-hdpi': [480, 800],
  'drawable-port-xhdpi': [720, 1280],
  'drawable-port-xxhdpi': [960, 1600],
  'drawable-port-xxxhdpi': [1280, 1920],
  'drawable-land-mdpi': [480, 320],
  'drawable-land-hdpi': [800, 480],
  'drawable-land-xhdpi': [1280, 720],
  'drawable-land-xxhdpi': [1600, 960],
  'drawable-land-xxxhdpi': [1920, 1280]
}

/* --------------------------------- build --------------------------------- */

log('Sabeel · Icons')
log(`  source assets/brand/logo.png · medallion r=${medallion.r.toFixed(0)}px at ${medallion.cx.toFixed(0)},${medallion.cy.toFixed(0)}`)

for (const size of [192, 512]) {
  const bytes = write(path.join(OUT, `icon-${size}.png`), size, 'legacy')
  log(`  icon-${size}.png${' '.repeat(3)} ${kb(bytes)}`)
}
write(path.join(OUT, 'apple-touch-icon.png'), 180, 'full')
log('  apple-touch-icon.png')

// A raster favicon, because the mark is artwork rather than geometry — nothing
// here would survive being redrawn as a handful of vector paths.
write(path.join(OUT, 'favicon-32.png'), 32, 'legacy')
log('  favicon-32.png')
fs.rmSync(path.join(OUT, 'favicon.svg'), { force: true })

// Android launcher icons. Without these the APK ships Capacitor's placeholder.
const ANDROID_RES = path.join(ROOT, 'android', 'app', 'src', 'main', 'res')
if (fs.existsSync(ANDROID_RES)) {
  const DENSITIES = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 }
  for (const [density, size] of Object.entries(DENSITIES)) {
    const dir = path.join(ANDROID_RES, `mipmap-${density}`)
    write(path.join(dir, 'ic_launcher.png'), size, 'legacy')
    write(path.join(dir, 'ic_launcher_round.png'), size, 'legacy')
    // The adaptive foreground is 108dp for a 72dp visible area.
    write(path.join(dir, 'ic_launcher_foreground.png'), Math.round(size * 1.5), 'foreground')
  }

  const anydpi = ensure(path.join(ANDROID_RES, 'mipmap-anydpi-v26'))
  // No <monochrome> entry: a themed icon is drawn as a flat silhouette, and a
  // medallion reduced to one colour is an illegible blob.
  const adaptive = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`
  fs.writeFileSync(path.join(anydpi, 'ic_launcher.xml'), adaptive)
  fs.writeFileSync(path.join(anydpi, 'ic_launcher_round.xml'), adaptive)

  const values = ensure(path.join(ANDROID_RES, 'values'))
  fs.writeFileSync(path.join(values, 'ic_launcher_background.xml'), `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#${DEEP.map(c => c.toString(16).padStart(2, '0')).join('')}</color>
</resources>
`)
  let splashBytes = 0
  for (const [dir, [w, h]] of Object.entries(SPLASH)) {
    const target = ensure(path.join(ANDROID_RES, dir))
    const png = drawSplash(w, h)
    fs.writeFileSync(path.join(target, 'splash.png'), png)
    splashBytes += png.length
  }
  log(`  android: ${Object.keys(DENSITIES).length} densities + adaptive icon`)
  log(`  splash:  ${Object.keys(SPLASH).length} sizes, ${kb(splashBytes)}`)
} else {
  log('  android/ not present — skipping launcher icons')
}
