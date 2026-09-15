// Renders a contact sheet of logo candidates so they can be looked at side by
// side before one is committed. Not part of the build — `node scripts/preview-logo.mjs`.
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { ROOT, log } from './_util.mjs'
import { inWord, inPoly } from './calligraphy.mjs'
import { lafzAlJalalah, muhammad } from './logo-forms.mjs'

const DEEP = [19, 46, 33]
const GOLD = [211, 173, 94]
const CREAM = [240, 238, 230]
const BRAND = [106, 190, 143]

/* png encoder (same as make-icons) */
const CRC = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c } return t })()
const crc32 = b => { let c = 0xffffffff; for (const x of b) c = CRC[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const body = Buffer.concat([Buffer.from(t, 'ascii'), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(body)); return Buffer.concat([l, body, c]) }
function encodePNG(w, h, px) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6
  const raw = Buffer.alloc((w * 4 + 1) * h)
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; px.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4) }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))])
}

const square = (cx, cy, r, rot) => [0, 1, 2, 3].map(i => { const a = rot + i * Math.PI / 2; return [cx + r * Math.cos(a), cy + r * Math.sin(a)] })
const inStar = (x, y, cx, cy, r) => inPoly(x, y, square(cx, cy, r, 0)) || inPoly(x, y, square(cx, cy, r, Math.PI / 4))

// Nib held at the angle a right-handed scribe cuts for naskh.
const NIB = { angle: -Math.PI / 5, width: 0.056 }

const VARIANTS = {
  allah:        { word: lafzAlJalalah, ink: GOLD, ring: true },
  allahBrand:   { word: lafzAlJalalah, ink: CREAM, ring: true, ringInk: GOLD },
  allahPlain:   { word: lafzAlJalalah, ink: GOLD, ring: false },
  muhammad:     { word: muhammad, ink: GOLD, ring: true },
  muhammadPlain:{ word: muhammad, ink: CREAM, ring: false }
}

function sampler(cfg) {
  const strokes = cfg.word()
  return (u, v) => {
    if (cfg.ring) {
      const d = Math.hypot(u - 0.5, v - 0.47)
      if (d > 0.408 && d < 0.430) return cfg.ringInk || GOLD
      // four khatim marks on the ring, at the corners
      for (const [cx, cy] of [[0.5, 0.042], [0.5, 0.898], [0.072, 0.47], [0.928, 0.47]]) {
        if (inStar(u, v, cx, cy, 0.050)) return cfg.ringInk || GOLD
      }
    }
    if (inWord(u, v, strokes, NIB)) return cfg.ink
    return DEEP
  }
}

function tile(size, cfg) {
  const px = Buffer.alloc(size * size * 4)
  const sample = sampler(cfg)
  const SS = 3
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let r = 0, g = 0, b = 0
    for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
      const c = sample((x + (sx + 0.5) / SS) / size, (y + (sy + 0.5) / SS) / size)
      r += c[0]; g += c[1]; b += c[2]
    }
    const n = SS * SS, i = (y * size + x) * 4
    px[i] = Math.round(r / n); px[i + 1] = Math.round(g / n); px[i + 2] = Math.round(b / n); px[i + 3] = 255
  }
  return px
}

const names = Object.keys(VARIANTS)
const TILE = 300, GAP = 14, SMALL = 48
const W = names.length * TILE + (names.length + 1) * GAP
const H = TILE + SMALL + GAP * 3
const sheet = Buffer.alloc(W * H * 4)
for (let i = 0; i < W * H; i++) { sheet[i * 4] = 10; sheet[i * 4 + 1] = 12; sheet[i * 4 + 2] = 11; sheet[i * 4 + 3] = 255 }

const blit = (src, sw, sh, dx, dy) => {
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
    const s = (y * sw + x) * 4, d = ((dy + y) * W + dx + x) * 4
    sheet[d] = src[s]; sheet[d + 1] = src[s + 1]; sheet[d + 2] = src[s + 2]; sheet[d + 3] = 255
  }
}

names.forEach((n, i) => {
  const x = GAP + i * (TILE + GAP)
  blit(tile(TILE, VARIANTS[n]), TILE, TILE, x, GAP)
  // the same mark at launcher size, which is the real test
  blit(tile(SMALL, VARIANTS[n]), SMALL, SMALL, x, GAP * 2 + TILE)
})

const out = path.join(ROOT, 'logo-preview.png')
fs.writeFileSync(out, encodePNG(W, H, sheet))
log(`Sabeel · logo preview → ${out}`)
log(`  ${names.join('  ')}`)
