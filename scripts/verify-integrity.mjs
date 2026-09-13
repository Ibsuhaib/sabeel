// Build-time: the muṣḥaf must not drift. This checks the ayah count of every
// surah against the canonical Hafs numbering (hardcoded here, independent of
// whatever the upstream API returns) and pins a SHA-256 of each surah's Arabic
// text. Any change to a single letter fails the build until a human signs it off
// by regenerating scripts/checksums.json deliberately.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { DATA, ROOT, log } from './_util.mjs'

const CANONICAL = [
  7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,
  112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,
  54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,
  14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,
  29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,
  11,8,3,9,5,4,7,3,6,3,5,4,5,6
]

const MANIFEST = path.join(ROOT, 'scripts', 'checksums.json')
const sha = s => crypto.createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 16)

log('Sabeel \u00b7 Integrity check')

if (CANONICAL.length !== 114) throw new Error('canonical table is not 114 long')
const canonTotal = CANONICAL.reduce((a, b) => a + b, 0)
if (canonTotal !== 6236) throw new Error(`canonical table sums to ${canonTotal}, expected 6236`)

const digests = {}
const errors = []
let ayahs = 0

for (let n = 1; n <= 114; n++) {
  const file = path.join(DATA, 'quran', 'surah', `${n}.json`)
  if (!fs.existsSync(file)) { errors.push(`surah ${n}: file missing`); continue }
  const { ayahs: list } = JSON.parse(fs.readFileSync(file, 'utf8'))

  if (list.length !== CANONICAL[n - 1]) {
    errors.push(`surah ${n}: ${list.length} ayahs, canonical is ${CANONICAL[n - 1]}`)
  }
  const empty = list.filter(a => !a.ar || !a.ar.trim()).length
  if (empty) errors.push(`surah ${n}: ${empty} ayahs have empty Arabic text`)

  ayahs += list.length
  digests[n] = sha(list.map(a => a.ar).join('\n'))
}

if (errors.length) {
  console.error('\n  INTEGRITY FAILURES:')
  errors.forEach(e => console.error('   \u2717 ' + e))
  process.exit(1)
}

log(`  \u2713 114 surahs, ${ayahs} ayahs, all counts match canonical Hafs numbering`)

if (!fs.existsSync(MANIFEST)) {
  fs.writeFileSync(MANIFEST, JSON.stringify({ note: 'SHA-256 (truncated) of each surah\u2019s Arabic text. Regenerate only with intent.', digests }, null, 2))
  log('  \u2713 wrote scripts/checksums.json baseline (first run)')
} else {
  const prev = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')).digests
  const drift = Object.keys(digests).filter(n => prev[n] && prev[n] !== digests[n])
  if (drift.length) {
    console.error(`\n  \u2717 Arabic text changed in surah(s): ${drift.join(', ')}`)
    console.error('    If this is intended, delete scripts/checksums.json and re-run.')
    process.exit(1)
  }
  log(`  \u2713 Arabic text matches the pinned checksums (${Object.keys(prev).length} surahs)`)
}

const hIdx = path.join(DATA, 'hadith', 'index.json')
if (fs.existsSync(hIdx)) {
  const idx = JSON.parse(fs.readFileSync(hIdx, 'utf8'))
  let bad = 0
  for (const c of idx.collections) {
    if (c.sahihByCompilation) continue
    if (c.totalHadith > 100 && c.gradedCount / c.totalHadith < 0.95) {
      console.error(`   \u2717 ${c.id}: only ${c.gradedCount}/${c.totalHadith} hadith carry a grading`)
      bad++
    }
  }
  if (bad) process.exit(1)
  const t = idx.collections.reduce((a, c) => a + c.totalHadith, 0)
  log(`  \u2713 ${idx.collections.length} hadith collections, ${t} hadith, grading coverage OK`)
}

log('  All checks passed.')
