// Build-time: the app mark, at every size the web and Android ask for, with no
// image dependency at all — the PNG encoder below is ~60 lines of zlib.
//
// The mark is the lafẓ al-jalālah — الله — written with a qalam, inside a ring
// carrying four khatim stars. The letters are drawn as pen strokes rather than
// pulled from a font, so there is no font dependency and the mark stays sharp at
// 48px, which is the size a launcher actually renders. The ring and the khatim
// are the geometry already used on the surah banners, so the icon belongs to the
// same family as the rest of the app.
//
// The letterforms live in logo-forms.mjs; the pen that draws them in calligraphy.mjs.
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { ROOT, ensure, log, kb } from './_util.mjs'
import { inWord, inPoly } from './calligraphy.mjs'
import { lafzAlJalalah } from './logo-forms.mjs'

const OUT = ensure(path.join(ROOT, 'public'))

const GREEN = [15, 23, 17]      // the app's background green
const DEEP = [19, 46, 33]       // a touch lighter, so the ground is not flat black
const GOLD = [211, 173, 94]
const CREAM = [240, 238, 230]
const BRAND = [106, 190, 143]

/* ------------------------------ png encoder ------------------------------ */

const CRC_TABLE = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let crc = 0xffffffff
  for (const b of buf) crc = CRC_TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePNG(size, px) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8   // bit depth
  ihdr[9] = 6   // RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

/* -------------------------------- geometry ------------------------------- */

const square = (cx, cy, r, rot) =>
  [0, 1, 2, 3].map(i => {
    const a = rot + (i * Math.PI) / 2
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
  })

// The khatim: two squares at 45° to each other.
function inStar(x, y, cx, cy, r) {
  return inPoly(x, y, square(cx, cy, r, 0)) || inPoly(x, y, square(cx, cy, r, Math.PI / 4))
}

function roundedRectAlpha(x, y, size, radius) {
  const dx = Math.max(radius - x, 0, x - (size - radius))
  const dy = Math.max(radius - y, 0, y - (size - radius))
  return Math.hypot(dx, dy) <= radius
}

// The nib: a flat pen held at the angle a naskh hand is cut to. Every stroke in
// the word is drawn with this one pen, which is where the thick–thin modulation
// comes from — a stroke is broad across the nib and fine along it.
const NIB = { angle: -Math.PI / 5, width: 0.056 }
const WORD = lafzAlJalalah()

const RING_IN = 0.408, RING_OUT = 0.430, RING_CY = 0.470
const KHATIM = [[0.5, 0.042], [0.5, 0.898], [0.072, RING_CY], [0.928, RING_CY]]

// Colour at a normalised point. `mode` decides whether the ground is drawn —
// an adaptive foreground must be transparent so Android can mask it.
function sample(u, v, mode) {
  const d = Math.hypot(u - 0.5, v - RING_CY)
  if (d > RING_IN && d < RING_OUT) return GOLD
  for (const [cx, cy] of KHATIM) if (inStar(u, v, cx, cy, 0.050)) return GOLD

  if (inWord(u, v, WORD, NIB)) return GOLD

  return mode === 'foreground' ? null : DEEP
}

function draw(size, mode) {
  const px = Buffer.alloc(size * size * 4)
  const SS = 3                       // supersample for clean diagonals
  // Adaptive foregrounds are masked to the centre ~66%, so the art is drawn
  // smaller inside the canvas to survive any mask shape Android applies.
  const scale = mode === 'foreground' ? 0.62 : 1
  const radius = size * 0.225

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const fx = x + (sx + 0.5) / SS
          const fy = y + (sy + 0.5) / SS

          if (mode === 'legacy' && !roundedRectAlpha(fx, fy, size, radius)) continue

          const u = (fx / size - 0.5) / scale + 0.5
          const v = (fy / size - 0.5) / scale + 0.5
          if (u < 0 || u > 1 || v < 0 || v > 1) {
            if (mode === 'foreground') continue
            r += DEEP[0]; g += DEEP[1]; b += DEEP[2]; a += 255
            continue
          }

          const c = sample(u, v, mode)
          if (!c) continue
          r += c[0]; g += c[1]; b += c[2]; a += 255
        }
      }
      const n = SS * SS
      const i = (y * size + x) * 4
      const alpha = a / n
      if (alpha > 0) {
        px[i] = Math.round(r / (a / 255))
        px[i + 1] = Math.round(g / (a / 255))
        px[i + 2] = Math.round(b / (a / 255))
      }
      px[i + 3] = Math.round(alpha)
    }
  }
  return px
}

const write = (file, size, mode) => {
  const png = encodePNG(size, draw(size, mode))
  ensure(path.dirname(file))
  fs.writeFileSync(file, png)
  return png.length
}

/* --------------------------------- build --------------------------------- */

log('Sabeel · Icons')

for (const size of [192, 512]) {
  const bytes = write(path.join(OUT, `icon-${size}.png`), size, 'legacy')
  log(`  icon-${size}.png${' '.repeat(3)} ${kb(bytes)}`)
}
// Apple's home-screen icon is never masked, so it needs the square drawn in.
write(path.join(OUT, 'apple-touch-icon.png'), 180, 'full')
log('  apple-touch-icon.png')

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
  const adaptive = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
    <monochrome android:drawable="@drawable/ic_stat_sabeel"/>
</adaptive-icon>
`
  fs.writeFileSync(path.join(anydpi, 'ic_launcher.xml'), adaptive)
  fs.writeFileSync(path.join(anydpi, 'ic_launcher_round.xml'), adaptive)

  const values = ensure(path.join(ANDROID_RES, 'values'))
  const colorsPath = path.join(values, 'ic_launcher_background.xml')
  fs.writeFileSync(colorsPath, `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#${DEEP.map(c => c.toString(16).padStart(2, '0')).join('')}</color>
</resources>
`)
  log(`  android: ${Object.keys(DENSITIES).length} densities + adaptive icon`)
} else {
  log('  android/ not present — skipping launcher icons')
}

// The favicon is the same mark as vector, so it stays crisp in a browser tab.
// A pen stroke's outline is its centreline offset forward by half the nib and
// back again — the same Minkowski sum the raster path computes, written once as
// a polygon instead of tested per pixel.
const rgb = c => `rgb(${c.join(',')})`

const strokeOutline = (pts, width) => {
  const hx = (Math.cos(NIB.angle) * width) / 2
  const hy = (Math.sin(NIB.angle) * width) / 2
  const fwd = pts.map(([x, y]) => `${((x + hx) * 100).toFixed(2)},${((y + hy) * 100).toFixed(2)}`)
  const back = [...pts].reverse().map(([x, y]) => `${((x - hx) * 100).toFixed(2)},${((y - hy) * 100).toFixed(2)}`)
  return `<polygon points="${[...fwd, ...back].join(' ')}" fill="${rgb(GOLD)}"/>`
}

const starSvg = (cx, cy, r) => `
    <rect x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" fill="${rgb(GOLD)}"/>
    <rect x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" fill="${rgb(GOLD)}" transform="rotate(45 ${cx} ${cy})"/>`

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="Sabeel">
  <rect width="100" height="100" rx="22.5" fill="${rgb(DEEP)}"/>
  <circle cx="50" cy="${RING_CY * 100}" r="${((RING_IN + RING_OUT) / 2 * 100).toFixed(2)}"
          fill="none" stroke="${rgb(GOLD)}" stroke-width="${((RING_OUT - RING_IN) * 100).toFixed(2)}"/>
  ${KHATIM.map(([x, y]) => starSvg(x * 100, y * 100, 5)).join('')}
  ${WORD.map(st => strokeOutline(st.pts, st.width ?? NIB.width)).join('')}
</svg>
`
fs.writeFileSync(path.join(OUT, 'favicon.svg'), svg)
log('  favicon.svg')
