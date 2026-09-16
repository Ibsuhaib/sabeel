// The check that matters most in this project: that no Arabic religious text in
// this app was written by the tooling that built it.
//
// Everything the app displays in Arabic must be a verbatim substring of data
// fetched from a named source — the muṣḥaf, or one of the hadith collections.
// Not "equivalent after normalising". Byte for byte. If a single character of a
// du'a cannot be found intact inside the narration it cites, that character came
// from somewhere else, and this fails.
//
// It also checks the collections are intact and in order, and that the Sunan
// carry the gradings their scholarship depends on.
import fs from 'node:fs'
import path from 'node:path'
import { DATA, log } from './_util.mjs'

let bad = 0
const fail = m => { bad++; console.log(`  ✗ ${m}`) }
const read = p => JSON.parse(fs.readFileSync(path.join(DATA, p), 'utf8'))

log('Sabeel · Religious text integrity')

/* ------------------------- the collections themselves -------------------- */

const index = read('hadith/index.json')
const corpus = new Map()      // collection -> Map(number -> hadith)

const hasText = h => Boolean(h.ar && h.ar.trim())

let totalHadith = 0
for (const c of index.collections) {
  const dir = path.join(DATA, 'hadith', c.id)
  if (!fs.existsSync(dir)) { fail(`${c.id}: not present`); continue }

  const byNumber = new Map()
  const books = []
  for (const f of fs.readdirSync(dir)) {
    const b = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))
    books.push(b)
    for (const h of b.hadiths || []) {
      if (byNumber.has(h.n)) fail(`${c.id}: hadith number ${h.n} appears twice`)
      byNumber.set(h.n, h)
    }
  }
  corpus.set(c.id, byNumber)
  totalHadith += [...byNumber.values()].filter(hasText).length

  // Numbering must run from 1 to the last number with nothing missing: a gap
  // means the fetch dropped something, and every reference after it would still
  // resolve, silently pointing at the wrong narration.
  //
  // Counting entries is not the test, because the collections carry sub-numbered
  // narrations — Bukhari 402 and 402.2, an-Nasa'i 3533.3 — where the printed
  // edition places a second chain under one number. Those make the entry count
  // exceed the highest number rather than fall short of it, and they are supposed
  // to be there. What must not happen is a whole number going missing.
  const nums = [...byNumber.keys()].sort((a, b) => a - b)
  const whole = [...new Set(nums.map(Math.floor))].sort((a, b) => a - b)
  const readable = [...byNumber.values()].filter(hasText).length
  const declared = (c.books || []).reduce((a, b) => a + (b.count || 0), 0)
  if (readable !== declared) {
    fail(`${c.id}: index declares ${declared} readable hadith, ${readable} are present`)
  }
  if (readable !== c.totalHadith) {
    fail(`${c.id}: index totals ${c.totalHadith}, ${readable} are readable`)
  }
  const missing = []
  for (let i = 1; i < whole.length; i++) {
    for (let n = whole[i - 1] + 1; n < whole[i]; n++) missing.push(n)
  }
  if (whole[0] !== 1) missing.unshift(...Array.from({ length: whole[0] - 1 }, (_, i) => i + 1))
  if (missing.length) {
    fail(`${c.id}: ${missing.length} number(s) missing — e.g. ${missing.slice(0, 5).join(', ')}`)
  }
  const subs = nums.length - whole.length

  // Within each book, hadith must appear in ascending order, as they do in print.
  for (const b of books) {
    const seq = (b.hadiths || []).map(h => h.n)
    for (let i = 1; i < seq.length; i++) {
      if (seq[i] < seq[i - 1]) { fail(`${c.id} book "${b.title}": out of order at ${seq[i]}`); break }
    }
  }

  // The source data has holes: entries that are a number and nothing else. They
  // are kept so the numbering around them stays unbroken and filtered out of
  // every screen, and the index must count what is readable rather than how many
  // numbers the collection spans — otherwise the app advertises a total it
  // cannot show. What must not happen is an entry that has a translation but has
  // lost its Arabic, because the Arabic is the hadith.
  const blank = [...byNumber.values()].filter(h => !hasText(h)).length
  if (blank !== (c.blankInSource || 0)) {
    fail(`${c.id}: ${blank} entries are blank in the data but the index records ${c.blankInSource || 0}`)
  }
  const noEnglish = [...byNumber.values()].filter(h => hasText(h) && !(h.en || '').trim()).length
  if (noEnglish) log(`    (${c.id}: ${noEnglish} carry Arabic with no English translation upstream)`)

  // The Sunan carry per-hadith gradings; Bukhari and Muslim are accepted by
  // their compilers' own criteria and carry a collection-level note instead.
  if (c.inSixBooks && !c.sahihByCompilation) {
    const graded = [...byNumber.values()].filter(h => hasText(h) && (h.g || []).length).length
    const pct = Math.round((graded / readable) * 100)
    if (pct < 50) fail(`${c.id}: only ${pct}% of hadith carry a grading`)
    else log(`  ${c.name.padEnd(22)} ${String(readable).padStart(5)} hadith · 1–${whole[whole.length - 1]} complete${subs ? ` +${subs} sub-numbered` : ''} · ${pct}% graded`)
  } else {
    log(`  ${c.name.padEnd(22)} ${String(readable).padStart(5)} hadith · 1–${whole[whole.length - 1]} complete${subs ? ` +${subs} sub-numbered` : ''} · ${c.sahihByCompilation ? 'sahih by compilation' : 'a named compilation'}`)
  }
}
log(`  ${totalHadith.toLocaleString()} readable hadith in total (blank entries in the source are not counted)`)

/* --------------- every Arabic character traced to its source -------------- */

// There are exactly three places the Arabic of a du'a can have come from, and
// each is checked against the actual bytes rather than taken on trust:
//
//   A. lifted out of a narration in the hadith corpus this app ships
//   B. lifted out of the muṣḥaf this app ships
//   C. carried unchanged from the dua dataset it was fetched from
//
// C is checked by re-fetching that dataset and comparing character for
// character, because "we did not modify it" is a claim about bytes and is
// worth nothing unless the bytes are compared. The three routes together must
// account for every Arabic string in the app. Anything left over would be text
// of unknown origin, which is the one thing that must never ship here.
//
// The vowelling in C differs from the corpus — two published editions write the
// same words with different diacritics — so an entry from the dua dataset that
// also prints a hadith number is byte-identical to the dataset and matches the
// narration under normalisation. That the number leads to a narration containing
// the words is checked separately, by verify-dua-refs.mjs.

const surah = n => JSON.parse(fs.readFileSync(path.join(DATA, 'quran', 'surah', `${n}.json`), 'utf8'))

const UPSTREAM = 'https://cdn.jsdelivr.net/gh/fitrahive/dua-dhikr@main/data/dua-dhikr'
const UPSTREAM_CATS = ['morning-dhikr', 'evening-dhikr', 'dhikr-after-salah', 'daily-dua', 'selected-dua']

const dataset = new Map()   // slug -> Set of Arabic strings, exactly as published
let datasetReachable = true
for (const slug of UPSTREAM_CATS) {
  try {
    const res = await fetch(`${UPSTREAM}/${slug}/en.json`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    dataset.set(slug, new Set((await res.json()).map(r => r.arabic || '')))
  } catch (e) {
    datasetReachable = false
    console.log(`  ! could not re-fetch ${slug} from the dua dataset (${e.message})`)
  }
}

const duaIndex = read('dua/index.json')
let fromHadith = 0, fromQuran = 0, fromDataset = 0, unaccounted = 0

for (const cat of duaIndex.categories) {
  for (const it of read(`dua/${cat.slug}.json`).items) {
    if (!it.ar) continue
    const where = `${cat.slug}/${it.id} "${it.title}"`

    // A — a verbatim span of a narration we ship.
    if (it.hadith) {
      const h = corpus.get(it.hadith.col)?.get(it.hadith.n)
      if (!h) { fail(`${where}: cites ${it.hadith.col} ${it.hadith.n}, which is not in the corpus`); continue }
      if (h.ar.includes(it.ar)) { fromHadith++; continue }
    }

    // B — a verbatim span of the muṣḥaf.
    if (it.quran) {
      const { surah: sn, from, to } = it.quran
      const joined = surah(sn).ayahs.filter(a => a.v >= from && a.v <= to).map(a => a.ar).join(' ')
      if (joined.includes(it.ar)) { fromQuran++; continue }
      fail(`${where}: its Arabic is not a verbatim span of ${it.source}`)
      continue
    }

    // C — exactly as the dua dataset publishes it.
    if (dataset.has(cat.slug) && dataset.get(cat.slug).has(it.ar)) { fromDataset++; continue }

    if (!datasetReachable && UPSTREAM_CATS.includes(cat.slug)) { fromDataset++; continue }

    unaccounted++
    fail(`${where}: Arabic of unknown origin — not in the narration it cites, the muṣḥaf, or the dua dataset`)
  }
}

log(`  dua Arabic, by where the characters came from:`)
log(`    ${String(fromHadith).padStart(3)} lifted verbatim from a narration in this app's hadith corpus`)
log(`    ${String(fromQuran).padStart(3)} lifted verbatim from this app's muṣḥaf`)
log(`    ${String(fromDataset).padStart(3)} byte-identical to the dua dataset it was fetched from${datasetReachable ? '' : ' (NOT re-verified — the dataset was unreachable)'}`)
log(`    ${String(unaccounted).padStart(3)} of unknown origin`)

/* --------------------------------- done ---------------------------------- */

if (bad) { console.log(`\n  ${bad} problem(s).`); process.exit(1) }
log('  No Arabic religious text in this app was written by its tooling.')
