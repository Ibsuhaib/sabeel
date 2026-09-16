// Build-time: Kutub as-Sittah + Muwatta + Nawawi 40 + Qudsi + Dehlawi.
// Arabic and English are merged per hadith and chunked per book so the app
// never loads a 4 MB file to show one chapter. Gradings are preserved verbatim
// with the grader's name — see PART 7 of the design notes, this is non-negotiable.
import path from 'node:path'
import { DATA, getJSON, writeJSON, log, mb } from './_util.mjs'

const CDN = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions'

// `sahihByCompilation`: Bukhari and Muslim are accepted as authentic by the
// compiler's own criteria, so we show a collection-level note rather than a
// per-hadith grade. Sunan collections carry per-hadith gradings and must show them.
const COLLECTIONS = [
  { id: 'bukhari',  name: 'Sahih al-Bukhari',        author: 'Imam Muhammad al-Bukhari',   died: '256 AH', sahihByCompilation: true },
  { id: 'muslim',   name: 'Sahih Muslim',            author: 'Imam Muslim ibn al-Hajjaj',  died: '261 AH', sahihByCompilation: true },
  { id: 'abudawud', name: 'Sunan Abi Dawud',         author: 'Imam Abu Dawud as-Sijistani', died: '275 AH', sahihByCompilation: false },
  { id: 'tirmidhi', name: "Jami' at-Tirmidhi",       author: 'Imam Abu Isa at-Tirmidhi',   died: '279 AH', sahihByCompilation: false },
  { id: 'nasai',    name: "Sunan an-Nasa'i",         author: 'Imam Ahmad an-Nasa\u2019i',  died: '303 AH', sahihByCompilation: false },
  { id: 'ibnmajah', name: 'Sunan Ibn Majah',         author: 'Imam Muhammad ibn Majah',    died: '273 AH', sahihByCompilation: false },
  { id: 'malik',    name: 'Muwatta Malik',           author: 'Imam Malik ibn Anas',        died: '179 AH', sahihByCompilation: false },
  { id: 'nawawi',   name: '40 Hadith Nawawi',        author: 'Imam Yahya an-Nawawi',       died: '676 AH', sahihByCompilation: false },
  { id: 'qudsi',    name: '40 Hadith Qudsi',         author: 'Compiled tradition',         died: '',       sahihByCompilation: false },
  { id: 'dehlawi',  name: '40 Hadith Shah Waliullah', author: 'Shah Waliullah ad-Dehlawi', died: '1176 AH', sahihByCompilation: false }
]

const SIX = new Set(['bukhari', 'muslim', 'abudawud', 'tirmidhi', 'nasai', 'ibnmajah'])

// Mirrors hasText in src/lib/data.js: an entry with no Arabic is a hole in the
// source data, not a hadith — the Arabic is the text, and a translation with
// nothing behind it is not something to put in front of a reader.
const hasText = h => Boolean(h.ar && h.ar.trim())

async function main() {
  log('Sabeel \u00b7 Hadith pipeline')
  let total = 0
  const index = []

  for (const c of COLLECTIONS) {
    process.stdout.write(`  ${c.id.padEnd(9)} `)
    const [en, ar] = await Promise.all([
      getJSON(`${CDN}/eng-${c.id}.json`),
      getJSON(`${CDN}/ara-${c.id}.json`)
    ])

    const arabic = new Map(ar.hadiths.map(h => [h.hadithnumber, h.text]))
    const byBook = new Map()

    for (const h of en.hadiths) {
      const book = h.reference?.book ?? 0
      if (!byBook.has(book)) byBook.set(book, [])
      byBook.get(book).push({
        n: h.hadithnumber,
        // Some entries carry no separate Arabic numbering; fall back rather than
        // emitting an undefined field the UI would have to guard against.
        an: h.arabicnumber ?? h.hadithnumber,
        ar: arabic.get(h.hadithnumber) || '',
        en: h.text || '',
        g: (h.grades || []).map(g => ({ by: g.name, grade: g.grade })),
        ref: h.reference || null
      })
    }

    const sections = en.metadata?.sections || {}
    const books = []
    for (const [num, list] of [...byBook.entries()].sort((a, b) => a[0] - b[0])) {
      // Section 0 is the compiler's introduction (the Muqaddimah in Muslim),
      // which upstream leaves untitled.
      const title = (sections[num] || '').trim() || (num === 0 ? 'Introduction' : `Book ${num}`)
      total += writeJSON(path.join(DATA, 'hadith', c.id, `${num}.json`), { book: num, title, hadiths: list })

      // The file is always written, even when every entry in it is blank
      // upstream, because the numbering has to stay unbroken — a missing number
      // is indistinguishable from a dropped one, and then no reference in the
      // collection can be trusted. The book is simply left out of the index, so
      // no screen offers a book with nothing in it to read.
      if (!list.filter(hasText).length) continue
      // Counted by what can actually be read, not by how many numbers the book
      // spans. Upstream carries entries with no Arabic at all, and counting those
      // would advertise a total the app cannot show. They stay in the file so the numbering around
      // them is unbroken; src/lib/data.js filters them out of every screen.
      books.push({ n: num, title, count: list.filter(hasText).length })
    }

    const graded = [...byBook.values()].flat().filter(h => hasText(h) && h.g.length).length
    const readable = [...byBook.values()].flat().filter(hasText).length
    const blank = en.hadiths.length - readable
    index.push({
      ...c,
      inSixBooks: SIX.has(c.id),
      books,
      totalHadith: readable,
      blankInSource: blank,
      gradedCount: graded
    })
    log(`${String(readable).padStart(6)} hadith \u00b7 ${books.length} books \u00b7 ${graded} graded${blank ? ` \u00b7 ${blank} blank upstream, not counted` : ''}`)
  }

  total += writeJSON(path.join(DATA, 'hadith', 'index.json'), {
    collections: index,
    builtAt: new Date().toISOString().slice(0, 10)
  })

  log(`  total ${index.reduce((a, c) => a + c.totalHadith, 0)} hadith, ${mb(total)} on disk`)
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
