// Build-time: compact text indexes so unified search runs entirely on-device.
// Quran + dua load on first search; hadith indexes load per collection so we
// never ship a 25 MB inverted index nobody asked for.
//
// The indexes store the text AS WRITTEN, not a normalised form. Search results
// are shown to the reader, and "and seek help through patience and prayer"
// stripped of its capital and its full stop reads like a transcript of scripture
// rather than scripture. The client normalises once per corpus on first search
// and keeps that in memory \u2014 see src/lib/search.js.
import fs from 'node:fs'
import path from 'node:path'
import { DATA, writeJSON, log, mb, kb } from './_util.mjs'

const clean = s => (s || '').replace(/\s+/g, ' ').trim()

function quranIndex() {
  const meta = JSON.parse(fs.readFileSync(path.join(DATA, 'quran', 'meta.json'), 'utf8'))
  const rows = []
  for (const s of meta.surahs) {
    const { ayahs } = JSON.parse(fs.readFileSync(path.join(DATA, 'quran', 'surah', `${s.n}.json`), 'utf8'))
    for (const a of ayahs) rows.push({ k: `${s.n}:${a.v}`, t: clean(a.en) })
  }
  const size = writeJSON(path.join(DATA, 'search', 'quran.json'), { rows })
  log(`  quran   ${rows.length} ayahs \u00b7 ${mb(size)}`)
}

function duaIndex() {
  const idx = JSON.parse(fs.readFileSync(path.join(DATA, 'dua', 'index.json'), 'utf8'))
  const rows = []
  for (const c of idx.categories) {
    const cat = JSON.parse(fs.readFileSync(path.join(DATA, 'dua', `${c.slug}.json`), 'utf8'))
    for (const it of cat.items) {
      rows.push({ k: `${c.slug}/${it.id}`, title: it.title, t: clean(`${it.en} ${it.benefits || ''}`) })
    }
  }
  const size = writeJSON(path.join(DATA, 'search', 'dua.json'), { rows })
  log(`  dua     ${rows.length} entries \u00b7 ${kb(size)}`)
}

function hadithIndexes() {
  const idxPath = path.join(DATA, 'hadith', 'index.json')
  if (!fs.existsSync(idxPath)) { log('  hadith  skipped (run npm run data:hadith first)'); return }
  const idx = JSON.parse(fs.readFileSync(idxPath, 'utf8'))
  let total = 0
  for (const c of idx.collections) {
    const rows = []
    for (const b of c.books) {
      const f = path.join(DATA, 'hadith', c.id, `${b.n}.json`)
      if (!fs.existsSync(f)) continue
      const { hadiths } = JSON.parse(fs.readFileSync(f, 'utf8'))
      // Entries with no Arabic are holes in the source data and are filtered out
      // of every screen by src/lib/data.js; indexing them would make a search hit
      // land on a hadith the reader cannot then open.
      for (const h of hadiths) {
        if (!h.ar || !h.ar.trim()) continue
        rows.push({ n: h.n, b: b.n, t: clean(h.en) })
      }
    }
    total += writeJSON(path.join(DATA, 'hadith', c.id, '_search.json'), { rows })
  }
  log(`  hadith  ${idx.collections.length} collection indexes \u00b7 ${mb(total)}`)
}

log('Sabeel \u00b7 Search index')
quranIndex()
duaIndex()
hadithIndexes()
