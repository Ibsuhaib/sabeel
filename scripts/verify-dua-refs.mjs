// Simulates exactly what a reader does: take the reference printed under a du'a,
// look it up the way Find by reference does, and check the du'a's own words are
// in what comes back.
//
// This exists because a du'a printed "HR. Muslim No. 591" while the hadith at
// Muslim 591 in this app was about the siwak — the dataset numbered Sahih Muslim
// one way and this app's corpus another. Checking the reference resolves is not
// enough; it has to resolve to a hadith that actually contains the words above
// it, which is the only thing a reader cares about.
import fs from 'node:fs'
import path from 'node:path'
import { DATA, log } from './_util.mjs'
import { normalise } from './arabic.mjs'

// Mirrors findHadith(collection, n) in src/lib/data.js.
const cache = new Map()
function findHadith(col, n) {
  if (!cache.has(col)) {
    const dir = path.join(DATA, 'hadith', col)
    const map = new Map()
    if (fs.existsSync(dir)) {
      for (const f of fs.readdirSync(dir)) {
        const b = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))
        for (const h of b.hadiths || []) map.set(h.n, h)
      }
    }
    cache.set(col, map)
  }
  return cache.get(col).get(Number(n)) || null
}

// Whether a number appears in the text as a number in its own right. Done by
// splitting on non-digits rather than with a word boundary: the first version of
// this used `\b` inside a template literal, where it is the backspace character
// and not a boundary at all, so every check silently passed as a failure.
const namesNumber = (text, n) =>
  String(text).split(/\D+/).filter(Boolean).includes(String(n))

const names = Object.fromEntries(
  JSON.parse(fs.readFileSync(path.join(DATA, 'hadith', 'index.json'), 'utf8'))
    .collections.map(c => [c.id, c.name])
)

const idx = JSON.parse(fs.readFileSync(path.join(DATA, 'dua', 'index.json'), 'utf8'))
let checked = 0
let ok = 0
let quoted = 0
const problems = []

for (const cat of idx.categories) {
  const data = JSON.parse(fs.readFileSync(path.join(DATA, 'dua', `${cat.slug}.json`), 'utf8'))
  for (const it of data.items) {
    if (it.unverified || (!it.hadith && !it.source)) { quoted++; continue }
    if (!it.hadith) continue
    checked++

    const where = `${cat.slug}/${it.id} "${it.title}"`
    const h = findHadith(it.hadith.col, it.hadith.n)

    if (!h) {
      problems.push(`${where} — ${it.source}: no hadith ${it.hadith.n} in ${it.hadith.col}`)
      continue
    }
    const expected = names[it.hadith.col]
    if (expected && !it.source.startsWith(expected)) {
      problems.push(`${where}: prints "${it.source}" but the reference points into ${expected}`)
      continue
    }
    if (!namesNumber(it.source, it.hadith.n)) {
      problems.push(`${where}: prints "${it.source}", which does not name ${it.hadith.n}`)
      continue
    }
    if (!normalise(h.ar).includes(normalise(it.ar))) {
      problems.push(`${where}: ${it.source} does not contain these words`)
      continue
    }
    ok++
  }
}

log('Sabeel · Dua references')
log(`  ${checked} duas print a hadith reference · ${quoted} are shown as quotations instead`)

if (problems.length) {
  console.log(`  ${problems.length} reference(s) do not lead where they say:`)
  problems.slice(0, 25).forEach(p => console.log(`    ✗ ${p}`))
  process.exit(1)
}
log(`  all ${ok} resolve to a hadith that contains the du'a printed above them.`)
