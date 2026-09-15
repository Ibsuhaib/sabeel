// Magnetic declination from the World Magnetic Model.
//
// A phone compass reads magnetic north. The qibla bearing is measured from true
// north. Declination is the angle between them, and it is not small: near zero
// through the Americas, but past 20° across much of Asia and the Atlantic, and
// far larger towards the poles. Correcting for it is the difference between a
// qibla arrow that is right and one that is confidently wrong.
//
// This follows the evaluation NOAA publish with the model: Gauss-normalised
// associated Legendre functions by recursion, converted to Schmidt
// quasi-normalised form, summed to degree 12, then rotated from the geocentric
// frame the maths works in back to the geodetic frame a phone reports.
//
// scripts/fetch-geomag.mjs checks this against NOAA's own published test values
// at build time. If it drifts by more than a hundredth of a degree anywhere on
// earth, the build fails rather than shipping a compass that is quietly wrong.

const A = 6378.137                 // WGS-84 semi-major axis, km
const B = 6356.7523142             // WGS-84 semi-minor axis, km
const EPSSQ = 1 - (B * B) / (A * A)
const RE = 6371.2                  // geomagnetic reference radius, km
const DEG = Math.PI / 180

let MODEL = null

export function loadModel(m) { MODEL = m }
export function hasModel() { return MODEL != null }
export function modelInfo() { return MODEL && { name: MODEL.name, epoch: MODEL.epoch, validTo: MODEL.validTo } }

// Coefficients are packed by (n,m) in the order n=1..12, m=0..n — as in the .COF file.
const idx = (n, m) => (n * (n + 1)) / 2 + m

// Schmidt quasi-normalised associated Legendre functions and their derivatives
// with respect to geocentric latitude. `x` is the sine of that latitude.
function legendre(x, nMax) {
  const size = idx(nMax, nMax) + 1
  const P = new Float64Array(size)
  const dP = new Float64Array(size)
  const norm = new Float64Array(size)
  const z = Math.sqrt((1 - x) * (1 + x))   // cos(geocentric latitude)

  P[0] = 1
  dP[0] = 0

  for (let n = 1; n <= nMax; n++) {
    for (let m = 0; m <= n; m++) {
      const i = idx(n, m)
      if (n === m) {
        const j = idx(n - 1, m - 1)
        P[i] = z * P[j]
        dP[i] = z * dP[j] + x * P[j]
      } else if (n === 1 && m === 0) {
        const j = idx(n - 1, m)
        P[i] = x * P[j]
        dP[i] = x * dP[j] - z * P[j]
      } else {
        const j2 = idx(n - 1, m)
        if (m > n - 2) {
          P[i] = x * P[j2]
          dP[i] = x * dP[j2] - z * P[j2]
        } else {
          const j1 = idx(n - 2, m)
          const k = ((n - 1) * (n - 1) - m * m) / ((2 * n - 1) * (2 * n - 3))
          P[i] = x * P[j2] - k * P[j1]
          dP[i] = x * dP[j2] - z * P[j2] - k * dP[j1]
        }
      }
    }
  }

  // Gauss-normalised → Schmidt quasi-normalised.
  norm[0] = 1
  for (let n = 1; n <= nMax; n++) {
    norm[idx(n, 0)] = (norm[idx(n - 1, 0)] * (2 * n - 1)) / n
    for (let m = 1; m <= n; m++) {
      norm[idx(n, m)] = norm[idx(n, m - 1)] *
        Math.sqrt(((n - m + 1) * (m === 1 ? 2 : 1)) / (n + m))
    }
  }
  for (let n = 1; n <= nMax; n++) {
    for (let m = 0; m <= n; m++) {
      const i = idx(n, m)
      P[i] *= norm[i]
      dP[i] *= -norm[i]
    }
  }

  return { P, dP }
}

/**
 * The full magnetic field at a point, in nanotesla, plus declination.
 *
 * @param {number} lat   geodetic latitude, degrees
 * @param {number} lon   longitude, degrees
 * @param {number} year  decimal year, e.g. 2026.7
 * @param {number} altKm height above the ellipsoid, km
 */
export function field(lat, lon, year, altKm = 0) {
  if (!MODEL) return null

  const dt = year - MODEL.epoch
  const nMax = MODEL.nMax
  const rlon = lon * DEG
  const rlat = lat * DEG

  // Geodetic → geocentric spherical.
  const sinLat = Math.sin(rlat)
  const cosLat = Math.cos(rlat)
  const rc = A / Math.sqrt(1 - EPSSQ * sinLat * sinLat)
  const xp = (rc + altKm) * cosLat
  const zp = (rc * (1 - EPSSQ) + altKm) * sinLat
  const r = Math.hypot(xp, zp)
  const sinPhi = zp / r
  const cosPhi = xp / r
  const phig = Math.asin(Math.max(-1, Math.min(1, sinPhi)))

  const { P, dP } = legendre(sinPhi, nMax)

  const sinM = new Float64Array(nMax + 1)
  const cosM = new Float64Array(nMax + 1)
  for (let m = 0; m <= nMax; m++) { sinM[m] = Math.sin(m * rlon); cosM[m] = Math.cos(m * rlon) }

  let Bx = 0, By = 0, Bz = 0
  for (let n = 1; n <= nMax; n++) {
    const rr = Math.pow(RE / r, n + 2)
    for (let m = 0; m <= n; m++) {
      const i = idx(n, m)
      const g = MODEL.g[i] + dt * MODEL.gDot[i]
      const h = MODEL.h[i] + dt * MODEL.hDot[i]
      const gc = g * cosM[m] + h * sinM[m]
      const gs = g * sinM[m] - h * cosM[m]

      Bz -= rr * gc * (n + 1) * P[i]
      Bx -= rr * gc * dP[i]
      // At the poles cos(latitude) is zero and this term is a 0/0; the whole
      // east component vanishes there, and declination stops meaning much anyway.
      if (Math.abs(cosPhi) > 1e-10) By += rr * gs * m * P[i] / cosPhi
    }
  }

  // Rotate from the geocentric frame back to the geodetic one.
  const psi = phig - rlat
  const X = Bx * Math.cos(psi) - Bz * Math.sin(psi)
  const Z = Bx * Math.sin(psi) + Bz * Math.cos(psi)
  const Y = By

  const H = Math.hypot(X, Y)
  return {
    x: X, y: Y, z: Z,
    h: H,
    f: Math.hypot(H, Z),
    declination: Math.atan2(Y, X) / DEG,
    inclination: Math.atan2(Z, H) / DEG
  }
}

/** Declination in degrees: positive when magnetic north lies east of true north. */
export function declination(lat, lon, year, altKm = 0) {
  const f = field(lat, lon, year, altKm)
  return f && f.declination
}

/** Decimal year, which is what the model is parameterised by. */
export function decimalYear(d = new Date()) {
  const y = d.getUTCFullYear()
  const start = Date.UTC(y, 0, 1)
  const end = Date.UTC(y + 1, 0, 1)
  return y + (d.getTime() - start) / (end - start)
}
