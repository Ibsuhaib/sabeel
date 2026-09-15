// Build-time: turns the adhkar seed into shippable dua categories.
//
// Every entry's Arabic is lifted out of data the app already carries — the hadith
// corpus or the muṣḥaf — so the text on screen is the collection's own, and the
// reference printed beneath it is derived from where the words were actually
// found rather than typed in by hand.
//
// Runs after data:quran and data:hadith. An entry whose words cannot be located
// is reported here and ships without a source line; it is never given a guess.
import fs from 'node:fs'
import path from 'node:path'
import { DATA, writeJSON, log, kb } from './_util.mjs'
import { locate, corpusSize } from './hadith-lookup.mjs'
import { normaliseMapped, normalise } from './arabic.mjs'

const QURAN = path.join(DATA, 'quran', 'surah')
const surahCache = new Map()

function surah(n) {
  if (!surahCache.has(n)) {
    surahCache.set(n, JSON.parse(fs.readFileSync(path.join(QURAN, `${n}.json`), 'utf8')))
  }
  return surahCache.get(n)
}

const META = JSON.parse(fs.readFileSync(path.join(DATA, 'quran', 'meta.json'), 'utf8'))
const NAME = Object.fromEntries(META.surahs.map(s => [s.n, s.en]))

// Locate a clip point inside an ayah, returning its index in the original text.
//
// The second attempt drops spaces from both sides. The muṣḥaf text separates a
// tanwīn from the alif that carries it — “عِلۡمࣰ ا” — so a clip written as one word
// would never match the two-word skeleton, though they are the same word.
function findClip(ar, clip) {
  const { norm, map } = normaliseMapped(ar)
  const needle = normalise(clip)

  const direct = norm.indexOf(needle)
  if (direct >= 0) return map[direct]

  // Second and third attempts drop spaces, then alifs as well. Muṣḥaf orthography
  // writes some long vowels with a dagger alif (“سُبۡحٰنَكَ”) and omits the alif
  // modern spelling keeps, so the two spellings of one word differ by an alif.
  for (const drop of [/ /g, /[ ا]/g]) {
    const tight = needle.replace(drop, '')
    if (!tight) continue
    const idx = []
    let squashed = ''
    for (let i = 0; i < norm.length; i++) {
      if (drop.test(norm[i])) { drop.lastIndex = 0; continue }
      drop.lastIndex = 0
      squashed += norm[i]
      idx.push(map[i])
    }
    const hit = squashed.indexOf(tight)
    if (hit >= 0) return idx[hit]
  }
  return -1
}

// [surah, from, to?] → the ayah text and translation straight out of the muṣḥaf.
//
// `clip` drops a narrative lead-in so the card opens on the supplication itself:
// 2:201 reads "and among them are those who say: Our Lord, give us…", and it is
// the du'a from "Our Lord" onwards that belongs on a du'a card. The ayah number
// printed underneath is unchanged, and the clip point is verified to exist.
function fromQuran([s, from, to = from], clip) {
  const rows = surah(s).ayahs.filter(a => a.v >= from && a.v <= to)
  if (rows.length !== to - from + 1) throw new Error(`missing ayahs for ${s}:${from}-${to}`)

  let ar = rows.map(a => a.ar).join(' ')
  let partial = false
  if (clip) {
    const at = findClip(ar, clip)
    if (at < 0) {
      // Keep the whole ayah rather than failing the build — the text and the
      // reference are still right, it just opens on the narrative lead-in.
      console.log(`    clip miss  ${s}:${from} — "${clip}" not found, showing the full ayah`)
    } else {
      ar = ar.slice(at).trim()
      partial = true
    }
  }

  return {
    ar,
    en: rows.map(a => a.en).join(' '),
    source: `Quran · ${NAME[s]} ${s}:${from}${to > from ? `-${to}` : ''}`,
    ref: { surah: s, from, to, partial }
  }
}

function main() {
  log('Sabeel · Adhkar builder')
  log(`  searching ${corpusSize().toLocaleString()} hadith`)

  const seedPath = new URL('./adhkar-seed.mjs', import.meta.url)
  return import(seedPath).then(({ CATEGORIES }) => {
    let total = 0
    let resolved = 0
    let unsourced = 0
    const index = []

    for (const cat of CATEGORIES) {
      const items = []
      for (const [i, seed] of cat.items.entries()) {
        const item = {
          id: i + 1,
          title: seed.title || '',
          ar: '', tr: seed.tr || '', en: seed.en || '',
          notes: seed.note || null,
          benefits: seed.benefits || null,
          source: null,
          count: seed.count || 1
        }

        if (seed.quran) {
          const q = fromQuran(seed.quran, seed.clip)
          item.ar = q.ar
          item.en = seed.en || q.en
          item.source = q.source
          item.quran = q.ref
          resolved++
        } else if (seed.find) {
          const hit = locate(seed.find, seed.to, seed.context)
          if (hit.exact) {
            item.ar = hit.ar
            item.source = hit.source
            item.hadith = { col: hit.col, n: hit.n }
            resolved++
          } else {
            // Not in the corpus we ship. Per the project's rule, it goes out with
            // no source rather than an invented one — and is named here so the
            // omission is visible at build time, not discovered by a reader.
            console.log(`    unsourced  ${cat.slug}/${seed.title} — best match ${(hit.miss * 100) | 0}%${hit.near ? ` near ${hit.near}` : ''}`)
            unsourced++
          }
        }

        // An entry with no Arabic at all would render as an empty card.
        if (item.ar || item.en) items.push(item)
      }

      total += writeJSON(path.join(DATA, 'dua', `${cat.slug}.json`), {
        slug: cat.slug, title: cat.title, blurb: cat.blurb, icon: cat.icon, items
      })
      index.push({ slug: cat.slug, title: cat.title, blurb: cat.blurb, icon: cat.icon, count: items.length })
      log(`  ${cat.slug.padEnd(14)} ${String(items.length).padStart(2)} entries`)
    }

    // Merge with the categories fetch-dua.mjs produced, keeping its order first.
    const indexFile = path.join(DATA, 'dua', 'index.json')
    const existing = fs.existsSync(indexFile) ? JSON.parse(fs.readFileSync(indexFile, 'utf8')).categories : []
    const merged = [...existing.filter(c => !index.some(n => n.slug === c.slug)), ...index]
    total += writeJSON(indexFile, { categories: merged })

    log(`  ${resolved} entries sourced from data we ship, ${unsourced} without a source`)
    log(`  wrote ${CATEGORIES.length + 1} files, ${kb(total)}`)
  })
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
