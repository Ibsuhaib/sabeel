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

  process.stdout.write('  fetching surah metadata ... ')
  const meta = await getJSON('https://api.alquran.cloud/v1/meta')
  const surahs = meta.data.surahs.references
  log(`${surahs.length} surahs`)
  if (surahs.length !== 114) throw new Error(`expected 114 surahs, got ${surahs.length}`)

  const juzOf = {}
  let j = 0
  for (const s of surahs) {
    for (let v = 1; v <= s.numberOfAyahs; v++) {
      const key = `${s.number}:${v}`
      while (j < 29 && JUZ_START[j + 1] === key) j++
      juzOf[key] = j + 1
    }
  }

  let total = 0
  const index = []
  for (const s of surahs) {
    const ayahs = []
    for (let v = 1; v <= s.numberOfAyahs; v++) {
      const k = `${s.number}:${v}`
      const ar = loaded.ar.get(k)
      if (!ar) throw new Error(`missing Arabic for ${k}`)
      ayahs.push({
        v,
        ar,
        en: loaded.en.get(k) || '',
        e2: loaded.en2.get(k) || '',
        tr: loaded.tr.get(k) || '',
        j: juzOf[k]
      })
    }
    total += writeJSON(path.join(DATA, 'quran', 'surah', `${s.number}.json`), { n: s.number, ayahs })
    index.push({
      n: s.number,
      name: s.name,
      en: s.englishName,
      meaning: s.englishNameTranslation,
      type: s.revelationType,
      ayahs: s.numberOfAyahs,
      juz: juzOf[`${s.number}:1`]
    })
  }

  total += writeJSON(path.join(DATA, 'quran', 'meta.json'), {
    surahs: index,
    juzStart: JUZ_START,
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
