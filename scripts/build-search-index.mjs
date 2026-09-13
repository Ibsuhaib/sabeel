// Build-time: compact lowercase text indexes so unified search runs entirely
// on-device. Quran + dua load on first search; hadith indexes load per
// collection so we never ship a 25 MB inverted index nobody asked for.
import fs from 'node:fs'
import path from 'node:path'
import { DATA, writeJSON, log, mb, kb } from './_util.mjs'

const norm = s => (s || '')
  .toLowerCase()
  .replace(/[\u2018\u2019']/g, '')
  .replace(/[^a-z0-9\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

function quranIndex() {
  const meta = JSON.parse(fs.readFileSync(path.join(DATA, 'quran', 'meta.json'), 'utf8'))
  const rows = []
  for (const s of meta.surahs) {
    const { ayahs } = JSON.parse(fs.readFileSync(path.join(DATA, 'quran', 'surah', `${s.n}.json`), 'utf8'))
    for (const a of ayahs) rows.push({ k: `${s.n}:${a.v}`, t: norm(a.en) })
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
      rows.push({ k: `${c.slug}/${it.id}`, title: it.title, t: norm(`${it.title} ${it.en} ${it.benefits || ''}`) })
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
      for (const h of hadiths) rows.push({ n: h.n, b: b.n, t: norm(h.en) })
    }
    total += writeJSON(path.join(DATA, 'hadith', c.id, '_search.json'), { rows })
  }
  log(`  hadith  ${idx.collections.length} collection indexes \u00b7 ${mb(total)}`)
}

log('Sabeel \u00b7 Search index')
quranIndex()
duaIndex()
hadithIndexes()
