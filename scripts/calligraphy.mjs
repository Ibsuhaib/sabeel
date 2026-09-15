// A miniature calligraphic pen, used to draw the app mark.
//
// Arabic letterforms get their character from the qalam: a reed cut to a flat
// edge and held at a fixed angle, so a stroke is thick when it travels across
// the nib and thin when it travels along it. Modelling that — rather than
// stroking paths at a constant width — is the difference between letters that
// look written and letters that look like pipework.
//
// A stroke is therefore the Minkowski sum of its centreline with the nib edge:
// for each segment, a parallelogram, plus a small rounded floor so hairlines
// never disappear at 48px.

// Convex polygon test: inside when every edge cross product agrees in sign.
export function inPoly(px, py, pts) {
  let sign = 0
  for (let i = 0; i < pts.length; i++) {
    const [ax, ay] = pts[i]
    const [bx, by] = pts[(i + 1) % pts.length]
    const cross = (bx - ax) * (py - ay) - (by - ay) * (px - ax)
    if (cross === 0) continue
    const s = Math.sign(cross)
    if (sign === 0) sign = s
    else if (s !== sign) return false
  }
  return true
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay
  const len2 = dx * dx + dy * dy
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

// Sample a quadratic bezier into a polyline.
export function quad(p0, p1, p2, steps = 14) {
  const out = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, m = 1 - t
    out.push([
      m * m * p0[0] + 2 * m * t * p1[0] + t * t * p2[0],
      m * m * p0[1] + 2 * m * t * p1[1] + t * t * p2[1]
    ])
  }
  return out
}

// An arc, for the loops and bowls that close a letter.
export function arc(cx, cy, rx, ry, from, to, steps = 20) {
  const out = []
  for (let i = 0; i <= steps; i++) {
    const a = from + (to - from) * (i / steps)
    out.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)])
  }
  return out
}

/**
 * Is the point inside a pen stroke along `pts`?
 * @param nib   {angle, width} the pen edge — angle in radians, width in u-units
 * @param floor minimum stroke thickness, so a stroke parallel to the nib still reads
 */
export function inStroke(px, py, pts, nib, floor = 0.012) {
  const hx = (Math.cos(nib.angle) * nib.width) / 2
  const hy = (Math.sin(nib.angle) * nib.width) / 2

  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i]
    const [bx, by] = pts[i + 1]
    if (inPoly(px, py, [
      [ax - hx, ay - hy], [bx - hx, by - hy],
      [bx + hx, by + hy], [ax + hx, ay + hy]
    ])) return true
    if (distToSegment(px, py, ax, ay, bx, by) <= floor / 2) return true
  }
  // The nib mark at the final point, so a stroke ends square rather than clipped.
  const [lx, ly] = pts[pts.length - 1]
  return distToSegment(px, py, lx - hx, ly - hy, lx + hx, ly + hy) <= floor / 2
}

// A whole word is a list of strokes; any one of them covering the point paints it.
export function inWord(px, py, strokes, nib) {
  for (const s of strokes) {
    if (inStroke(px, py, s.pts, { angle: nib.angle, width: s.width ?? nib.width }, s.floor ?? 0.011)) return true
  }
  return false
}
