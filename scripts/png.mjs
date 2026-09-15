// A PNG reader and writer, in about 150 lines of zlib, so the icon pipeline keeps
// its promise of no image dependency.
//
// The writer emits 8-bit RGBA. The reader handles the non-interlaced 8-bit
// greyscale/RGB/palette/alpha forms, which covers anything a design tool exports.
import zlib from 'node:zlib'

/* ------------------------------- shared --------------------------------- */

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

/* -------------------------------- encode -------------------------------- */

export function encodePNG(width, height, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8   // bit depth
  ihdr[9] = 6   // RGBA
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0                       // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

/* -------------------------------- decode -------------------------------- */

const paeth = (a, b, c) => {
  const p = a + b - c
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c)
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c
}

/** Decode a PNG buffer to { width, height, data } where data is RGBA bytes. */
export function decodePNG(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG')

  let off = 8
  let width = 0, height = 0, depth = 0, colorType = 0, interlace = 0
  let palette = null, trns = null
  const idat = []

  while (off < buf.length) {
    const len = buf.readUInt32BE(off)
    const type = buf.slice(off + 4, off + 8).toString('ascii')
    const data = buf.slice(off + 8, off + 8 + len)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      depth = data[8]; colorType = data[9]; interlace = data[12]
    } else if (type === 'PLTE') palette = data
    else if (type === 'tRNS') trns = data
    else if (type === 'IDAT') idat.push(data)
    else if (type === 'IEND') break
    off += 12 + len
  }

  if (depth !== 8) throw new Error(`unsupported bit depth ${depth}`)
  if (interlace !== 0) throw new Error('interlaced PNG not supported')

  const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType]
  if (!CHANNELS) throw new Error(`unsupported colour type ${colorType}`)

  const raw = zlib.inflateSync(Buffer.concat(idat))
  const stride = width * CHANNELS
  const px = Buffer.alloc(stride * height)

  // Undo the per-scanline filters.
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]
    const line = raw.slice(y * (stride + 1) + 1, (y + 1) * (stride + 1))
    const out = px.slice(y * stride, (y + 1) * stride)
    const prev = y > 0 ? px.slice((y - 1) * stride, y * stride) : null

    for (let i = 0; i < stride; i++) {
      const a = i >= CHANNELS ? out[i - CHANNELS] : 0
      const b = prev ? prev[i] : 0
      const c = prev && i >= CHANNELS ? prev[i - CHANNELS] : 0
      let v = line[i]
      if (filter === 1) v += a
      else if (filter === 2) v += b
      else if (filter === 3) v += (a + b) >> 1
      else if (filter === 4) v += paeth(a, b, c)
      out[i] = v & 0xff
    }
  }

  // Expand whatever we got to RGBA.
  const data = Buffer.alloc(width * height * 4)
  for (let i = 0, n = width * height; i < n; i++) {
    const s = i * CHANNELS, d = i * 4
    if (colorType === 0) {
      data[d] = data[d + 1] = data[d + 2] = px[s]; data[d + 3] = 255
    } else if (colorType === 2) {
      data[d] = px[s]; data[d + 1] = px[s + 1]; data[d + 2] = px[s + 2]; data[d + 3] = 255
    } else if (colorType === 3) {
      const p = px[s] * 3
      data[d] = palette[p]; data[d + 1] = palette[p + 1]; data[d + 2] = palette[p + 2]
      data[d + 3] = trns && px[s] < trns.length ? trns[px[s]] : 255
    } else if (colorType === 4) {
      data[d] = data[d + 1] = data[d + 2] = px[s]; data[d + 3] = px[s + 1]
    } else {
      data[d] = px[s]; data[d + 1] = px[s + 1]; data[d + 2] = px[s + 2]; data[d + 3] = px[s + 3]
    }
  }

  return { width, height, data }
}

/* ------------------------------- resample -------------------------------- */

/**
 * Box-filtered resize. Averaging every source pixel that falls under a
 * destination pixel is what keeps fine detail — a minaret, a thin gold rim —
 * from breaking up when a 1254px artwork is taken down to a 48px launcher icon.
 * Alpha is premultiplied during the average so transparent edges do not bleed.
 */
export function resize(src, dw, dh) {
  const { width: sw, height: sh, data } = src
  const out = Buffer.alloc(dw * dh * 4)
  const xr = sw / dw, yr = sh / dh

  for (let y = 0; y < dh; y++) {
    const y0 = Math.floor(y * yr), y1 = Math.max(y0 + 1, Math.ceil((y + 1) * yr))
    for (let x = 0; x < dw; x++) {
      const x0 = Math.floor(x * xr), x1 = Math.max(x0 + 1, Math.ceil((x + 1) * xr))
      let r = 0, g = 0, b = 0, a = 0, n = 0
      for (let sy = y0; sy < Math.min(y1, sh); sy++) {
        for (let sx = x0; sx < Math.min(x1, sw); sx++) {
          const i = (sy * sw + sx) * 4
          const al = data[i + 3] / 255
          r += data[i] * al; g += data[i + 1] * al; b += data[i + 2] * al
          a += data[i + 3]; n++
        }
      }
      const d = (y * dw + x) * 4
      const alpha = a / n
      if (alpha > 0) {
        const k = n * (alpha / 255)
        out[d] = Math.round(r / k); out[d + 1] = Math.round(g / k); out[d + 2] = Math.round(b / k)
      }
      out[d + 3] = Math.round(alpha)
    }
  }
  return { width: dw, height: dh, data: out }
}
