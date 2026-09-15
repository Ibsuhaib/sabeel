// Build-time: the World Magnetic Model, so the qibla compass can point at true
// north anywhere on earth.
//
// Why this is needed at all: a phone's compass reads *magnetic* north. The angle
// between that and true north — the declination — is zero on a line through the
// Americas and exceeds 20° across much of Asia, the Atlantic and the far north.
// The qibla bearing is calculated from true north, so without correcting for
// declination the arrow is simply wrong by that much, and wrong differently in
// every country. For an app meant to work globally that is not a detail.
//
// The coefficients are the US Government's World Magnetic Model (NOAA/NCEI and
// the British Geological Survey), which is public domain. They are taken from
// the `geomagnetism` npm package (Apache-2.0), which also ships NOAA's official
// test values — and this script checks our own evaluation against every one of
// them before writing anything, so a wrong implementation fails the build
// instead of quietly pointing people in the wrong direction.
import path from 'node:path'
import { DATA, getJSON, getText, writeJSON, log, kb } from './_util.mjs'
import { declination, loadModel } from '../src/lib/geomag.js'

const BASE = 'https://cdn.jsdelivr.net/npm/geomagnetism@0.2.0'

async function main() {
  log('Sabeel · Geomagnetic model')

  const wmm = await getJSON(`${BASE}/data/wmm-2025.json`)
  if (wmm.n_max !== 12 || wmm.main_field_coeff_g.length !== 91) {
    throw new Error(`unexpected WMM shape: n_max=${wmm.n_max}, ${wmm.main_field_coeff_g.length} coefficients`)
  }
  log(`  ${wmm.name}, epoch ${wmm.epoch}, valid to ${wmm.end_date.slice(0, 10)}`)

  const model = {
    name: wmm.name,
    epoch: wmm.epoch,
    validTo: wmm.end_date.slice(0, 10),
    nMax: wmm.n_max,
    g: wmm.main_field_coeff_g,
    h: wmm.main_field_coeff_h,
    gDot: wmm.secular_var_coeff_g,
    hDot: wmm.secular_var_coeff_h
  }

  // --- verify against NOAA's published test values -------------------------
  const csv = await getText(`${BASE}/test/values.csv`)
  const rows = csv.trim().split('\n').slice(1)
    .map(line => {
      const [date, alt, lat, lon, , , , , , , decl] = line.split(',').map(Number)
      return { date, alt, lat, lon, decl }
    })
    // Only the rows for this model's own epoch can be checked against it.
    .filter(r => r.date >= wmm.epoch && r.date < wmm.epoch + 5)

  if (rows.length < 10) throw new Error(`only ${rows.length} test rows for epoch ${wmm.epoch}`)

  loadModel(model)
  let worst = 0
  let worstAt = null
  for (const r of rows) {
    const ours = declination(r.lat, r.lon, r.date, r.alt)
    // Declination wraps, so compare the shortest angle between the two.
    const diff = Math.abs(((ours - r.decl + 540) % 360) - 180)
    if (diff > worst) { worst = diff; worstAt = r }
  }

  // NOAA publish the test values to two decimals; anything beyond a hundredth of
  // a degree of drift means the evaluation is wrong, not merely rounded.
  if (worst > 0.02) {
    throw new Error(
      `declination disagrees with NOAA by ${worst.toFixed(3)}° at ` +
      `lat ${worstAt.lat}, lon ${worstAt.lon}, ${worstAt.date} — the model evaluation is wrong`
    )
  }
  log(`  checked ${rows.length} NOAA test values · worst error ${worst.toFixed(4)}°`)

  const size = writeJSON(path.join(DATA, 'geomag', 'wmm.json'), model)
  log(`  wrote wmm.json, ${kb(size)}`)
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
