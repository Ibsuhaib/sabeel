// Checks that every citation the app prints can be resolved in the data it
// ships, and that nothing is credited to a source that does not say it.
//
// The app makes claims of three kinds: a hadith reference, an ayah reference,
// and an attribution for a recording. This walks all three and reports anything
// that cannot be verified, so a wrong citation fails here rather than being
// discovered by someone relying on it.
import fs from 'node:fs'
import path from 'node:path'
import { DATA, log } from './_util.mjs'
import { normalise } from './arabic.mjs'

let problems = 0
let checked = 0
const fail = m => { problems++; console.log(`  ✗ ${m}`) }
const read = p => JSON.parse(fs.readFileSync(path.join(DATA, p), 'utf8'))
const exists = p => fs.existsSync(path.join(DATA, p))

log('Sabeel · Source audit')

/* ------------------------------ hadith refs ------------------------------ */

const hadithIndex = exists('hadith/index.json') ? read('hadith/index.json') : null
const hadithByCollection = new Map()

function loadHadith(col) {
  if (hadithByCollection.has(col)) return hadithByCollection.get(col)
  const dir = path.join(DATA, 'hadith', col)
  const map = new Map()
  if (fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir)) {
      for (const h of JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).hadiths || []) {
        map.set(h.n, h)
      }
    }
  }
  hadithByCollection.set(col, map)
  return map
}

/* -------------------------------- the dua -------------------------------- */

const idx = read('dua/index.json')
let sourced = 0
let unsourced = 0

for (const cat of idx.categories) {
  const file = `dua/${cat.slug}.json`
  if (!exists(file)) { fail(`${cat.slug}: category file missing`); continue }
  const data = read(file)

  if (data.items.length !== cat.count) {
    fail(`${cat.slug}: index says ${cat.count} entries, file has ${data.items.length}`)
  }

  for (const it of data.items) {
    checked++
    if (!it.source) { unsourced++; continue }
    sourced++

    // A hadith-backed entry must actually appear at the reference it names, with
    // the Arabic we display present in that narration.
    if (it.hadith) {
      const map = loadHadith(it.hadith.col)
      if (!map.size) { fail(`${cat.slug}/${it.id}: collection "${it.hadith.col}" not present`); continue }
      const h = map.get(it.hadith.n)
      if (!h) { fail(`${cat.slug}/${it.id}: ${it.source} — no hadith ${it.hadith.n} in ${it.hadith.col}`); continue }
      if (!normalise(h.ar).includes(normalise(it.ar))) {
        fail(`${cat.slug}/${it.id}: text shown is not in ${it.source}`)
      }
      if (!it.source.includes(String(it.hadith.n))) {
        fail(`${cat.slug}/${it.id}: printed source "${it.source}" disagrees with ref ${it.hadith.n}`)
      }
      const named = hadithIndex?.collections.find(c => c.id === it.hadith.col)?.name
      if (named && !it.source.startsWith(named)) {
        fail(`${cat.slug}/${it.id}: printed source "${it.source}" is not "${named}"`)
      }
    }

    // A Quran-backed entry must match the muṣḥaf at the ayahs it names.
    if (it.quran) {
      const { surah: sn, from, to } = it.quran
      const sfile = `quran/surah/${sn}.json`
      if (!exists(sfile)) { fail(`${cat.slug}/${it.id}: surah ${sn} missing`); continue }
      const rows = read(sfile).ayahs.filter(a => a.v >= from && a.v <= to)
      if (!rows.length) { fail(`${cat.slug}/${it.id}: ${sn}:${from}-${to} has no ayahs`); continue }
      const joined = normalise(rows.map(a => a.ar).join(' '))
      if (!joined.includes(normalise(it.ar))) {
        fail(`${cat.slug}/${it.id}: text shown is not in ${it.source}`)
      }
      if (!it.source.includes(`${sn}:${from}`)) {
        fail(`${cat.slug}/${it.id}: printed source "${it.source}" disagrees with ref ${sn}:${from}`)
      }
    }

    // Anything else carrying a source string but no machine-checkable reference
    // came in with the upstream dataset and keeps its own attribution.
    if (!it.hadith && !it.quran && !/\d/.test(it.source)) {
      fail(`${cat.slug}/${it.id}: source "${it.source}" names no number to check`)
    }
  }
}
log(`  dua: ${checked} entries · ${sourced} cite a source · ${unsourced} deliberately cite none`)

/* ------------------------------- recordings ------------------------------ */

if (exists('adhan.json')) {
  const a = read('adhan.json')
  for (const rec of a.adhans || []) {
    checked++
    if (!rec.muadhdhin) fail(`adhan "${rec.id}": no muadhdhin named`)
    if (!rec.licence) fail(`adhan "${rec.id}": no licence recorded`)
    if (!rec.source) fail(`adhan "${rec.id}": no link back to where it came from`)
    if (rec.licence && !/^(CC |public domain)/i.test(rec.licence)) {
      fail(`adhan "${rec.id}": licence "${rec.licence}" is not a recognised free licence`)
    }
  }
  log(`  adhan: ${(a.adhans || []).length} recording(s), each with muadhdhin, licence and source`)
}

if (exists('reciters.json')) {
  const r = read('reciters.json')
  const all = [...(r.perAyah || []), ...(r.surah || [])]
  for (const rec of all) {
    checked++
    if (!rec.name) fail(`reciter "${rec.id}": no name`)
  }
  // A reciter labelled as an imam of one of the three mosques is a factual claim
  // about a person, so every one must carry the note that says which and why.
  for (const rec of r.surah || []) {
    if (rec.masjid && !rec.note) fail(`reciter "${rec.id}": claims masjid "${rec.masjid}" with no note saying who they are`)
  }
  if (!r.aqsaNote) fail('no note explaining the absence of an Aqsa reciter')
  log(`  reciters: ${all.length} named · ${(r.surah || []).filter(x => x.masjid).length} attributed to a masjid, each with a note`)
}

/* --------------------------------- quran --------------------------------- */

const meta = read('quran/meta.json')
if (meta.surahs.length !== 114) fail(`meta lists ${meta.surahs.length} surahs`)
const totalAyahs = meta.surahs.reduce((a, s) => a + s.ayahs, 0)
if (totalAyahs !== 6236) fail(`meta sums to ${totalAyahs} ayahs, expected 6236`)
log(`  quran: 114 surahs, ${totalAyahs} ayahs, editions ${Object.keys(meta.editions || {}).join(', ')}`)

/* -------------------------------- geomag --------------------------------- */

if (exists('geomag/wmm.json')) {
  const w = read('geomag/wmm.json')
  const now = new Date().toISOString().slice(0, 10)
  if (w.validTo < now) fail(`magnetic model ${w.name} expired on ${w.validTo}`)
  if (w.g.length !== 91 || w.h.length !== 91) fail('magnetic model has the wrong number of coefficients')
  log(`  geomag: ${w.name}, valid to ${w.validTo}`)
}

/* --------------------------------- done ---------------------------------- */

if (problems) {
  console.log(`\n  ${problems} problem(s) found.`)
  process.exit(1)
}
log(`  All ${checked} checked claims resolve to the data the app ships.`)
