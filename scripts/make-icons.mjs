// Build-time: generate the app icons with no image dependency at all.
// Two overlapping squares make the eight-pointed khatim — a motif that is
// geometric rather than figurative, and carries no sectarian association.
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { ROOT, ensure, log, kb } from './_util.mjs'

const OUT = ensure(path.join(ROOT, 'public'))

const BG = [15, 23, 17]
const GOLD = [211, 173, 94]
const GREEN = [106, 190, 143]

function crc32(buf) {
  let c, table = []
  for (let n = 0; n < 256; n++) {
    c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  let crc = 0xffffffff
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8)
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

function encodePNG(size, pixels) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8      // bit depth
  ihdr[9] = 6      // RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0  // no filter
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

// Signed area test — inside a convex polygon when every cross product agrees.
function inPoly(px, py, pts) {
  let sign = 0
  for (let i = 0; i < pts.length; i++) {
    const [ax, ay] = pts[i]
    const [bx, by] = pts[(i + 1) % pts.length]
    const cross = (bx - ax) * (py - ay) - (by - ay) * (px - ax)
    if (cross !== 0) {
      const s = Math.sign(cross)
      if (sign === 0) sign = s
      else if (s !== sign) return false
    }
  }
  return true
}

function square(cx, cy, r, rot) {
  return [0, 1, 2, 3].map(i => {
    const a = rot + i * Math.PI / 2
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
  })
}

function draw(size) {
  const px = Buffer.alloc(size * size * 4)
  const c = size / 2
  const r = size * 0.34
  const inner = size * 0.17
  const a = square(c, c, r, 0)
  const b = square(c, c, r, Math.PI / 4)
  const ai = square(c, c, inner, 0)
  const bi = square(c, c, inner, Math.PI / 4)
  const radius = size * 0.22   // rounded-square mask

  const SS = 3 // supersample for clean edges
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let acc = [0, 0, 0, 0]
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const fx = x + (sx + 0.5) / SS
          const fy = y + (sy + 0.5) / SS
          let col = null

          // rounded-square background
          const dx = Math.max(radius - fx, 0, fx - (size - radius))
          const dy = Math.max(radius - fy, 0, fy - (size - radius))
          const outside = Math.hypot(dx, dy) > radius
          if (!outside) {
            col = BG
            if (inPoly(fx, fy, a) || inPoly(fx, fy, b)) col = GOLD
            if (inPoly(fx, fy, ai) || inPoly(fx, fy, bi)) col = GREEN
          }

          if (col) { acc[0] += col[0]; acc[1] += col[1]; acc[2] += col[2]; acc[3] += 255 }
        }
      }
      const n = SS * SS
      const i = (y * size + x) * 4
      const alpha = acc[3] / n
      if (alpha > 0) {
        px[i] = Math.round(acc[0] / (acc[3] / 255))
        px[i + 1] = Math.round(acc[1] / (acc[3] / 255))
        px[i + 2] = Math.round(acc[2] / (acc[3] / 255))
      }
      px[i + 3] = Math.round(alpha)
    }
  }
  return px
}

log('Sabeel · Icons')
for (const size of [192, 512]) {
  const png = encodePNG(size, draw(size))
  fs.writeFileSync(path.join(OUT, `icon-${size}.png`), png)
  log(`  icon-${size}.png  ${kb(png.length)}`)
}

const rgb = c => `rgb(${c.join(',')})`
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="${rgb(BG)}"/>
  <g transform="translate(50 50)">
    <rect x="-24" y="-24" width="48" height="48" fill="${rgb(GOLD)}"/>
    <rect x="-24" y="-24" width="48" height="48" fill="${rgb(GOLD)}" transform="rotate(45)"/>
    <rect x="-12" y="-12" width="24" height="24" fill="${rgb(GREEN)}"/>
    <rect x="-12" y="-12" width="24" height="24" fill="${rgb(GREEN)}" transform="rotate(45)"/>
  </g>
</svg>`
fs.writeFileSync(path.join(OUT, 'favicon.svg'), svg)
log('  favicon.svg')
