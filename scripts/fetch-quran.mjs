// Build-time: download the Quran text + translations, split per surah, ship static.
// Sources documented in DATA_LICENCES.md. Arabic text is never altered.
import path from 'node:path'
import { DATA, getJSON, writeJSON, log, mb } from './_util.mjs'

const CDN = 'https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions'

const EDITIONS = {
  ar:  'ara-quranuthmanihaf',   // Uthmani, Hafs — the muṣḥaf text
  en:  'eng-ummmuhammad',       // Saheeh International
  en2: 'eng-mustafakhattaba',   // The Clear Quran — Mustafa Khattab
  tr:  'ara-quran-la1'          // Latin transliteration
}

const JUZ_START = [
  '1:1','2:142','2:253','3:93','4:24','4:148','5:82','6:111','7:88','8:41',
  '9:93','11:6','12:53','15:1','17:1','18:75','21:1','23:1','25:21','27:56',
  '29:46','33:31','36:28','39:32','41:47','46:1','51:31','58:1','67:1','78:1'
]

// Walks the muṣḥaf in order and stamps each ayah with the division it falls in,
// given that division's list of starting ayahs. Used for pages, hizb and ruku
// alike — the boundaries differ, the logic does not.
function assign(order, starts) {
  const startSet = new Map(starts.map((k, i) => [k, i + 1]))
  const out = {}
  let current = 1
  for (const key of order) {
    if (startSet.has(key)) current = startSet.get(key)
    out[key] = current
  }
  return out
}

async function main() {
  log('Sabeel · Quran pipeline')

  const loaded = {}
  for (const [key, slug] of Object.entries(EDITIONS)) {
    process.stdout.write(`  fetching ${slug} ... `)
    const json = await getJSON(`${CDN}/${slug}.json`)
    const rows = json.quran || json
    loaded[key] = new Map(rows.map(r => [`${r.chapter}:${r.verse}`, r.text]))
    log(`${rows.length} ayahs`)
  }

  if (loaded.ar.size !== 6236) throw new Error(`Arabic ayah count is ${loaded.ar.size}, expected 6236`)

  process.stdout.write('  fetching muṣḥaf metadata ... ')
  const meta = await getJSON('https://api.alquran.cloud/v1/meta')
  const surahs = meta.data.surahs.references
  if (surahs.length !== 114) throw new Error(`expected 114 surahs, got ${surahs.length}`)

  const ref = r => `${r.surah}:${r.ayah}`
  const PAGE_START = meta.data.pages.references.map(ref)
  const HIZB_START = meta.data.hizbQuarters.references.map(ref)
  const RUKU_START = meta.data.rukus.references.map(ref)
  const MANZIL_START = meta.data.manzils.references.map(ref)
  const SAJDAH = new Map(meta.data.sajdas.references.map(r => [ref(r), r.recommended ? 'recommended' : 'obligatory']))
  log(`${PAGE_START.length} pages, ${HIZB_START.length} hizb quarters, ${SAJDAH.size} sajdas`)

  if (PAGE_START.length !== 604) throw new Error(`expected 604 pages, got ${PAGE_START.length}`)

  // Reading order, once, so every division is assigned from the same walk.
  const order = []
  for (const s of surahs) for (let v = 1; v <= s.numberOfAyahs; v++) order.push(`${s.number}:${v}`)

  const juzOf = assign(order, JUZ_START)
  const pageOf = assign(order, PAGE_START)
  const hizbOf = assign(order, HIZB_START)
  const rukuOf = assign(order, RUKU_START)
  const manzilOf = assign(order, MANZIL_START)

  let total = 0
  const index = []
  for (const s of surahs) {
    const ayahs = []
    for (let v = 1; v <= s.numberOfAyahs; v++) {
      const k = `${s.number}:${v}`
      const ar = loaded.ar.get(k)
      if (!ar) throw new Error(`missing Arabic for ${k}`)
      const ayah = {
        v,
        ar,
        en: loaded.en.get(k) || '',
        e2: loaded.en2.get(k) || '',
        tr: loaded.tr.get(k) || '',
        j: juzOf[k],
        p: pageOf[k],
        h: hizbOf[k],
        r: rukuOf[k],
        m: manzilOf[k]
      }
      if (SAJDAH.has(k)) ayah.sajdah = SAJDAH.get(k)
      ayahs.push(ayah)
    }
    total += writeJSON(path.join(DATA, 'quran', 'surah', `${s.number}.json`), { n: s.number, ayahs })
    index.push({
      n: s.number,
      name: s.name,
      en: s.englishName,
      meaning: s.englishNameTranslation,
      type: s.revelationType,
      ayahs: s.numberOfAyahs,
      juz: juzOf[`${s.number}:1`],
      page: pageOf[`${s.number}:1`]
    })
  }

  // Page index: which surahs a page covers, so page mode can label itself
  // without loading the whole muṣḥaf.
  const pages = PAGE_START.map((start, i) => {
    const [sn, av] = start.split(':').map(Number)
    const end = PAGE_START[i + 1]
    const last = end ? order[order.indexOf(end) - 1] : order[order.length - 1]
    const [en2, ev] = last.split(':').map(Number)
    return { p: i + 1, from: { s: sn, a: av }, to: { s: en2, a: ev }, juz: juzOf[start] }
  })

  total += writeJSON(path.join(DATA, 'quran', 'meta.json'), {
    surahs: index,
    pages,
    juzStart: JUZ_START,
    pageStart: PAGE_START,
    // The index screen lets you browse by any of these, so each needs its own
    // list of starting ayahs rather than only a per-ayah number.
    hizbStart: HIZB_START,
    rukuStart: RUKU_START,
    manzilStart: MANZIL_START,
    sajdas: [...SAJDAH.entries()].map(([k, kind]) => ({ key: k, kind })),
    // Keys here must match the per-ayah field names (ar/en/e2/tr) so the reader
    // can look up a label by the same key it renders text from.
    editions: {
      ar: { slug: EDITIONS.ar,  label: 'Uthmani (Hafs)' },
      en: { slug: EDITIONS.en,  label: 'Saheeh International' },
      e2: { slug: EDITIONS.en2, label: 'The Clear Quran — Mustafa Khattab' },
      tr: { slug: EDITIONS.tr,  label: 'Transliteration' }
    },
    builtAt: new Date().toISOString().slice(0, 10)
  })

  log(`  wrote 115 files, ${mb(total)}`)
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
