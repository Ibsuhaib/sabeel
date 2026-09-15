// Build-time: the app mark, at every size the web and Android ask for.
//
// The mark is the brand artwork in assets/brand/logo.png — a gold mihrab arch
// with a crescent and a path running out through the doorway, which is what the
// name means. It arrives already shaped as an app tile: a rounded square on the
// app's own dark green, centred in a larger canvas with a drop shadow.
//
// That is a different shape of problem from the medallion it replaced. There is
// nothing to cut out — the tile *is* the icon — so the work is finding its edges
// and cropping to them, then letting each platform round the corners its own way.
//
// There is still no image dependency: png.mjs reads and writes the files and
// box-filters the resize, which is what keeps the thin gold arch from breaking
// up on the way down to a 48px launcher icon.
//
// The previous artwork is kept at assets/brand/logo-medallion.png, and
// calligraphy.mjs / logo-forms.mjs still draw the lafẓ al-jalālah candidates —
// `node scripts/preview-logo.mjs` renders those — but this is what ships.
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, ensure, log, kb } from './_util.mjs'
import { decodePNG, encodePNG, resize } from './png.mjs'

const OUT = ensure(path.join(ROOT, 'public'))
const SOURCE = path.join(ROOT, 'assets', 'brand', 'logo.png')

/* ----------------------------- the artwork ------------------------------ */

// Find the tile inside the source canvas.
//
// Absolute colour is no use here: the tile and the canvas behind it are both
// near-black green, a few levels apart, and the canvas carries noise and a
// gradient. What does separate them is the step at the edge, so each column and
// row is averaged down its length and the largest change is taken as the border.
// Averaging over a band rather than a single line keeps the arch in the middle
// from being mistaken for an edge.
function findTile(img) {
  const { width: W, height: H, data } = img
  const lum = (x, y) => { const i = (y * W + x) * 4; return 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2] }

  const colAvg = x => { let s = 0, n = 0; for (let y = Math.round(H * 0.2); y < H * 0.8; y += 3) { s += lum(x, y); n++ } return s / n }
  const rowAvg = y => { let s = 0, n = 0; for (let x = Math.round(W * 0.2); x < W * 0.8; x += 3) { s += lum(x, y); n++ } return s / n }

  const edge = (avg, from, to, step) => {
    let best = { at: from, d: -1 }
    for (let i = from; step > 0 ? i < to : i > to; i += step) {
      const d = Math.abs(avg(i) - avg(i - step * 6))
      if (d > best.d) best = { at: i, d }
    }
    return best.at
  }

  const l = edge(colAvg, Math.round(W * 0.06), Math.round(W * 0.30), 1)
  const r = edge(colAvg, Math.round(W * 0.94), Math.round(W * 0.70), -1)
  const t = edge(rowAvg, Math.round(H * 0.06), Math.round(H * 0.30), 1)
  const b = edge(rowAvg, Math.round(H * 0.94), Math.round(H * 0.70), -1)

  // Square it off around the centre: the drop shadow below the tile biases the
  // bottom edge outwards, so the two axes disagree by a few pixels.
  const cx = (l + r) / 2
  const cy = (t + b) / 2
  const side = Math.min(r - l, b - t)
  return { x: Math.round(cx - side / 2), y: Math.round(cy - side / 2), side: Math.round(side) }
}

// Crop the tile, overscanning a little so its own rounded corners fall outside
// the crop — otherwise rounding it again leaves a pale notch at each corner
// where the artwork's curve and ours disagree.
function cropTile(img, t, overscan = 0.055) {
  const inset = Math.round(t.side * overscan)
  const x0 = t.x + inset
  const y0 = t.y + inset
  const side = t.side - inset * 2

  const out = Buffer.alloc(side * side * 4)
  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) {
      const d = (y * side + x) * 4
      const sx = Math.min(img.width - 1, Math.max(0, x0 + x))
      const sy = Math.min(img.height - 1, Math.max(0, y0 + y))
      const s = (sy * img.width + sx) * 4
      out[d] = img.data[s]; out[d + 1] = img.data[s + 1]
      out[d + 2] = img.data[s + 2]; out[d + 3] = 255
    }
  }
  return { width: side, height: side, data: out }
}

const source = decodePNG(fs.readFileSync(SOURCE))
const tileBox = findTile(source)
const TILE = cropTile(source, tileBox)

// The ground colour is taken from the artwork rather than declared, so the
// Android adaptive background matches the tile exactly and no seam shows where
// the launcher's mask cuts across it.
const DEEP = (() => {
  const spots = [[0.06, 0.06], [0.94, 0.06], [0.06, 0.94], [0.94, 0.94], [0.04, 0.5], [0.96, 0.5]]
  const acc = [0, 0, 0]
  for (const [fx, fy] of spots) {
    const i = (Math.round(fy * (TILE.height - 1)) * TILE.width + Math.round(fx * (TILE.width - 1))) * 4
    acc[0] += TILE.data[i]; acc[1] += TILE.data[i + 1]; acc[2] += TILE.data[i + 2]
  }
  return acc.map(v => Math.round(v / spots.length))
})()

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
 *             'foreground' the tile filling the canvas (Android adaptive)
 */
function draw(size, mode) {
  // The mark is a tile, so it fills its canvas rather than sitting inside it.
  //
  // The adaptive foreground fills it completely and is *not* shrunk into the
  // safe zone, which is what you would do for a free-standing emblem. The arch
  // only occupies the middle half of the tile, so it is already well inside the
  // safe area, and everything the launcher's mask crops away is plain ground —
  // the same colour as the background layer, so the join is invisible.
  const inset = mode === 'foreground' ? 1 : 0.995
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

      // The tile over it.
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
// It is the tile centred on the app's green, sized as a fraction of the shorter
// edge so it looks the same on a tall phone and a wide tablet.
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
log(`  source assets/brand/logo.png · tile ${TILE.width}px from (${tileBox.x},${tileBox.y}) · ground rgb(${DEEP.join(',')})`)

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
  // tile reduced to one colour is an illegible blob.
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
