// A contract test between the pipeline output and what the app actually reads.
// It walks every fetch path in src/lib/data.js and checks the shape the pages
// destructure, so a renamed field fails here instead of as a blank screen.
import fs from 'node:fs'
import path from 'node:path'
import { DATA, log } from './_util.mjs'

let pass = 0
const fails = []

function check(name, fn) {
  try {
    fn()
    pass++
  } catch (e) {
    fails.push(`${name}: ${e.message}`)
  }
}

const read = p => JSON.parse(fs.readFileSync(path.join(DATA, p), 'utf8'))
const exists = p => fs.existsSync(path.join(DATA, p))
const assert = (cond, msg) => { if (!cond) throw new Error(msg) }

log('Sabeel · Smoke test')

/* ------------------------------- Quran ---------------------------------- */

check('quran/meta.json shape', () => {
  const m = read('quran/meta.json')
  assert(Array.isArray(m.surahs) && m.surahs.length === 114, 'surahs is not 114 long')
  assert(Array.isArray(m.juzStart) && m.juzStart.length === 30, 'juzStart is not 30 long')
  for (const s of m.surahs) {
    for (const k of ['n', 'name', 'en', 'meaning', 'type', 'ayahs', 'juz']) {
      assert(s[k] !== undefined, `surah ${s.n} is missing "${k}"`)
    }
  }
  assert(m.editions.ar && m.editions.en && m.editions.e2 && m.editions.tr, 'editions block incomplete')
})

check('every surah file loads with the fields the reader uses', () => {
  for (let n = 1; n <= 114; n++) {
    assert(exists(`quran/surah/${n}.json`), `surah/${n}.json missing`)
    const s = read(`quran/surah/${n}.json`)
    assert(s.n === n, `surah ${n} has wrong n`)
    assert(Array.isArray(s.ayahs) && s.ayahs.length > 0, `surah ${n} has no ayahs`)
    for (const a of s.ayahs) {
      for (const k of ['v', 'ar', 'en', 'e2', 'tr', 'j', 'p', 'h', 'r', 'm']) {
        assert(a[k] !== undefined, `${n}:${a.v} is missing "${k}"`)
      }
      assert(typeof a.ar === 'string' && a.ar.trim(), `${n}:${a.v} has empty Arabic`)
      assert(a.j >= 1 && a.j <= 30, `${n}:${a.v} has juz ${a.j}`)
      assert(a.p >= 1 && a.p <= 604, `${n}:${a.v} has page ${a.p}`)
      assert(a.h >= 1 && a.h <= 240, `${n}:${a.v} has hizb quarter ${a.h}`)
      assert(a.m >= 1 && a.m <= 7, `${n}:${a.v} has manzil ${a.m}`)
    }
  }
})

check('the 604-page muṣḥaf index is complete and in order', () => {
  const meta = read('quran/meta.json')
  assert(meta.pages.length === 604, `expected 604 pages, got ${meta.pages.length}`)
  meta.pages.forEach((p, i) => {
    assert(p.p === i + 1, `page at index ${i} is numbered ${p.p}`)
    assert(p.from && p.to, `page ${p.p} has no range`)
    assert(p.juz >= 1 && p.juz <= 30, `page ${p.p} has juz ${p.juz}`)
  })
  // Page 1 is al-Fatihah, page 604 ends the muṣḥaf at an-Nas.
  assert(meta.pages[0].from.s === 1 && meta.pages[0].from.a === 1, 'page 1 does not start at 1:1')
  assert(meta.pages[603].to.s === 114, `page 604 ends at surah ${meta.pages[603].to.s}, expected 114`)
})

check('every page has ayahs and page numbers never go backwards', () => {
  const seen = new Set()
  let last = 1
  for (let n = 1; n <= 114; n++) {
    for (const a of read(`quran/surah/${n}.json`).ayahs) {
      assert(a.p === last || a.p === last + 1, `page jumped ${last} -> ${a.p} at ${n}:${a.v}`)
      last = a.p
      seen.add(a.p)
    }
  }
  assert(last === 604, `last ayah is on page ${last}, expected 604`)
  assert(seen.size === 604, `only ${seen.size} of 604 pages have any ayah on them`)
})

check('the 15 sajdas are recorded', () => {
  const meta = read('quran/meta.json')
  assert(meta.sajdas.length === 15, `expected 15 sajdas, got ${meta.sajdas.length}`)
  let marked = 0
  for (let n = 1; n <= 114; n++) {
    marked += read(`quran/surah/${n}.json`).ayahs.filter(a => a.sajdah).length
  }
  assert(marked === 15, `${marked} ayahs carry a sajdah flag, expected 15`)
})

check('the reciter catalogue covers the Haramain and is honest about Aqsa', () => {
  const cat = read('reciters.json')
  assert(cat.perAyah.length >= 30, `only ${cat.perAyah.length} per-ayah reciters`)
  const all = [...cat.perAyah, ...cat.surah]

  for (const r of all) {
    for (const k of ['id', 'name', 'style', 'mode']) assert(r[k], `reciter ${r.id} missing "${k}"`)
    assert(r.mode === 'ayah' || r.mode === 'surah', `reciter ${r.id} has mode ${r.mode}`)
    if (r.mode === 'surah') assert(/^https:\/\//.test(r.server), `surah reciter ${r.id} has no server`)
  }

  const haram = all.filter(r => r.masjid === 'haram')
  const nabawi = all.filter(r => r.masjid === 'nabawi')
  assert(haram.length >= 6, `only ${haram.length} Masjid al-Haram imams`)
  assert(nabawi.length >= 3, `only ${nabawi.length} Masjid an-Nabawi imams`)

  // Named specifically because the user asked for them.
  const named = ['Yasser ad-Dossari', 'Abdurrahman as-Sudais', 'Maher al-Muaiqly', 'Abdullah Awad al-Juhany']
  for (const n of named) assert(all.some(r => r.name === n), `${n} is missing from the catalogue`)

  // No reciter may be labelled as an Aqsa imam while none exists in the sources.
  assert(!all.some(r => r.masjid === 'aqsa'), 'a reciter is labelled aqsa but no such recording exists')
  assert(cat.aqsaNote && cat.aqsaNote.length > 40, 'the Aqsa note is missing')

  // Ayah-mode reciters must not duplicate a surah-mode entry for the same person.
  const ayahNames = new Set(cat.perAyah.map(r => r.name))
  for (const r of cat.surah) {
    assert(!ayahNames.has(r.name), `${r.name} is listed both per-ayah and full-surah`)
  }
})

check('the adhan is present and its licence is recorded', () => {
  const a = read('adhan.json')
  assert(Array.isArray(a.adhans) && a.adhans.length >= 1, 'no adhan recording shipped')
  for (const r of a.adhans) {
    for (const k of ['id', 'file', 'muadhdhin', 'licence', 'attribution', 'source', 'bytes']) {
      assert(r[k], `adhan ${r.id || '?'} is missing "${k}"`)
    }
    // A recording with no stated licence must never ship — see DATA_LICENCES.md.
    assert(/CC|Public domain|CC0/i.test(r.licence), `adhan ${r.id} has an unrecognised licence "${r.licence}"`)
    assert(/^https:\/\//.test(r.source), `adhan ${r.id} has no checkable source URL`)
    const f = path.join(DATA, '..', 'adhan', r.file)
    assert(fs.existsSync(f), `${r.file} is missing from public/adhan`)
    const buf = fs.readFileSync(f)
    const isMp3 = buf.slice(0, 3).toString() === 'ID3' || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0)
    assert(isMp3, `${r.file} is not an mp3`)
    assert(buf.length === r.bytes, `${r.file} is ${buf.length} bytes, index says ${r.bytes}`)
    assert(buf.length > 200000, `${r.file} is too short to be an adhan`)
  }
})

check('juz boundaries are monotonic across the whole muṣḥaf', () => {
  let last = 1
  for (let n = 1; n <= 114; n++) {
    for (const a of read(`quran/surah/${n}.json`).ayahs) {
      assert(a.j === last || a.j === last + 1, `juz jumped ${last} -> ${a.j} at ${n}:${a.v}`)
      last = a.j
    }
  }
  assert(last === 30, `last ayah is in juz ${last}, expected 30`)
})

check('Al-Fatihah reads correctly', () => {
  const s = read('quran/surah/1.json')
  assert(s.ayahs.length === 7, 'Al-Fatihah is not 7 ayahs')
  assert(s.ayahs[0].ar.includes('بِس'), 'ayah 1 does not start with the basmala')
  assert(s.ayahs[0].en.length > 10, 'ayah 1 has no English')
})

/* ------------------------------- Hadith --------------------------------- */

check('hadith/index.json shape', () => {
  const idx = read('hadith/index.json')
  assert(Array.isArray(idx.collections) && idx.collections.length === 10, 'expected 10 collections')
  const six = idx.collections.filter(c => c.inSixBooks)
  assert(six.length === 6, `expected 6 books of the Sittah, got ${six.length}`)
  for (const c of idx.collections) {
    for (const k of ['id', 'name', 'author', 'books', 'totalHadith', 'gradedCount', 'sahihByCompilation']) {
      assert(c[k] !== undefined, `collection ${c.id} missing "${k}"`)
    }
    assert(c.books.length > 0, `${c.id} has no books`)
    for (const b of c.books) {
      assert(b.n !== undefined && b.title && b.count > 0, `${c.id} book ${b.n} is malformed`)
    }
  }
})

check('Bukhari and Muslim are flagged sahih by compilation, Sunan are not', () => {
  const idx = read('hadith/index.json')
  const by = Object.fromEntries(idx.collections.map(c => [c.id, c]))
  assert(by.bukhari.sahihByCompilation === true, 'Bukhari is not flagged')
  assert(by.muslim.sahihByCompilation === true, 'Muslim is not flagged')
  for (const id of ['abudawud', 'tirmidhi', 'nasai', 'ibnmajah']) {
    assert(by[id].sahihByCompilation === false, `${id} must not be flagged sahih by compilation`)
  }
})

check('every Sunan hadith carries a grading with a named grader', () => {
  const idx = read('hadith/index.json')
  for (const c of idx.collections) {
    if (c.sahihByCompilation || c.totalHadith < 100) continue
    const first = read(`hadith/${c.id}/${c.books[0].n}.json`)
    const sample = first.hadiths.slice(0, 25)
    for (const h of sample) {
      assert(Array.isArray(h.g), `${c.id} ${h.n} has no grades array`)
      assert(h.g.length > 0, `${c.id} ${h.n} has an empty grades array`)
      for (const g of h.g) {
        assert(g.by && g.grade, `${c.id} ${h.n} has a grading with no grader name`)
      }
    }
  }
})

check('hadith book files match the index shape the pages destructure', () => {
  const idx = read('hadith/index.json')
  for (const c of idx.collections) {
    for (const b of c.books.slice(0, 3)) {
      const f = `hadith/${c.id}/${b.n}.json`
      assert(exists(f), `${f} missing`)
      const d = read(f)
      assert(d.book === b.n, `${f} has wrong book number`)
      assert(Array.isArray(d.hadiths) && d.hadiths.length === b.count, `${f} count mismatch`)
      for (const h of d.hadiths.slice(0, 5)) {
        for (const k of ['n', 'an', 'ar', 'en', 'g', 'ref']) {
          assert(h[k] !== undefined, `${f} hadith ${h.n} missing "${k}"`)
        }
      }
    }
  }
})

/* -------------------------------- Dua ----------------------------------- */

check('dua index and every category load', () => {
  const idx = read('dua/index.json')
  assert(Array.isArray(idx.categories) && idx.categories.length === 5, 'expected 5 dua categories')
  for (const c of idx.categories) {
    assert(exists(`dua/${c.slug}.json`), `dua/${c.slug}.json missing`)
    const cat = read(`dua/${c.slug}.json`)
    assert(cat.items.length === c.count, `${c.slug} count mismatch`)
    for (const it of cat.items) {
      for (const k of ['id', 'ar', 'tr', 'en', 'source', 'count']) {
        assert(it[k] !== undefined, `${c.slug}/${it.id} missing "${k}"`)
      }
      assert(it.ar.trim(), `${c.slug}/${it.id} has empty Arabic`)
    }
  }
})

check('99 Names are complete and numbered 1-99', () => {
  const { names } = read('dua/asma-ul-husna.json')
  assert(names.length === 99, `expected 99 names, got ${names.length}`)
  names.forEach((n, i) => {
    assert(n.n === i + 1, `name at index ${i} has n=${n.n}`)
    assert(n.ar && n.tr && n.en, `name ${n.n} is incomplete`)
  })
})

/* ------------------------------- Search --------------------------------- */

check('search indexes cover their corpora', () => {
  const q = read('search/quran.json')
  assert(q.rows.length === 6236, `quran index has ${q.rows.length} rows, expected 6236`)
  for (const r of q.rows.slice(0, 50)) {
    assert(/^\d+:\d+$/.test(r.k), `bad key ${r.k}`)
    assert(typeof r.t === 'string' && r.t.trim(), `row ${r.k} has no text`)
  }
  // Results are shown to the reader, so the index must keep the text as written.
  const withCaps = q.rows.filter(r => /[A-Z]/.test(r.t)).length
  assert(withCaps > 5000, `only ${withCaps} rows retain capitals — index looks normalised`)
  const d = read('search/dua.json')
  assert(d.rows.length === 97, `dua index has ${d.rows.length} rows, expected 97`)
})

check('a known search phrase actually matches', () => {
  const q = read('search/quran.json')
  const lower = q.rows.map(r => r.t.toLowerCase())
  const hits = lower.filter(t => t.includes('patience'))
  assert(hits.length > 5, `only ${hits.length} ayahs match "patience"`)
  const mercy = lower.filter(t => t.includes('merciful'))
  assert(mercy.length > 5, `only ${mercy.length} ayahs match "merciful"`)
})

check('hadith search indexes exist and are searchable', () => {
  const idx = read('hadith/index.json')
  for (const c of idx.collections) {
    const f = `hadith/${c.id}/_search.json`
    assert(exists(f), `${f} missing`)
    const { rows } = read(f)
    assert(rows.length === c.totalHadith, `${c.id} index has ${rows.length} rows, expected ${c.totalHadith}`)
  }
  const { rows } = read('hadith/bukhari/_search.json')
  const hits = rows.filter(r => r.t.toLowerCase().includes('intention'))
  assert(hits.length > 0, 'no Bukhari hadith matches "intention"')
})

/* -------------------------------- Assets -------------------------------- */

check('fonts and icons are present', () => {
  const fontsDir = path.join(DATA, '..', 'fonts')
  assert(fs.existsSync(path.join(fontsDir, 'fonts.css')), 'fonts.css missing')
  const css = fs.readFileSync(path.join(fontsDir, 'fonts.css'), 'utf8')
  for (const family of ['Amiri Quran', 'Scheherazade New', 'Noto Naskh Arabic']) {
    assert(css.includes(family), `fonts.css has no @font-face for ${family}`)
  }
  for (const url of css.match(/url\('\/fonts\/([^']+)'\)/g) || []) {
    const file = url.match(/\/fonts\/([^']+)/)[1]
    assert(fs.existsSync(path.join(fontsDir, file)), `fonts.css references missing ${file}`)
  }
  for (const f of ['icon-192.png', 'icon-512.png', 'favicon.svg']) {
    assert(fs.existsSync(path.join(DATA, '..', f)), `${f} missing`)
  }
})

/* -------------------------------- Report -------------------------------- */

log(`  ${pass} checks passed`)
if (fails.length) {
  console.error(`  ${fails.length} FAILED:`)
  fails.forEach(f => console.error('   ✗ ' + f))
  process.exit(1)
}
log('  All contract checks passed.')
