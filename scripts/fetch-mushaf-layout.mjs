// Build-time: where every line of the printed muṣḥaf breaks.
//
// The app already knows which ayahs fall on which page, but not how those ayahs
// are split across the fifteen lines of the page — and that is the whole of what
// makes a muṣḥaf page recognisable. Someone who has memorised by page knows that
// a particular word sits at the end of line nine; reflowing the text to whatever
// width a phone happens to be destroys exactly that.
//
// The layout comes from the quran.com API, which reports a line number for every
// word of the Madani (King Fahd Complex) muṣḥaf.
//
// The line text is stored rather than reconstructed by re-splitting the ayah
// text we already ship. That was the first plan and it does not survive contact
// with the data: our Uthmani edition and theirs disagree about where a word
// boundary falls in a small number of places, and a line-count that is right on
// most pages and wrong on a few is worse than useless in a muṣḥaf. Storing the
// words as the layout gives them keeps every line exact.
import fs from 'node:fs'
import path from 'node:path'
import { DATA, ensure, writeJSON, log, kb, mb } from './_util.mjs'

const API = 'https://api.quran.com/api/v4/verses/by_page'
const UA = 'Sabeel/0.1 (open-source Islamic app; contact via GitHub issues)'
const OUT = ensure(path.join(DATA, 'quran', 'page'))
const PAGES = 604
const LINES_PER_PAGE = 15

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function getPage(n, tries = 5) {
  const url = `${API}/${n}?words=true&word_fields=line_number,text_uthmani&per_page=300`
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, accept: 'application/json' } })
      if (res.ok) return await res.json()
      if (res.status === 429 || res.status >= 500) {
        await sleep(Math.min(i * 3000, 15000))
        continue
      }
      throw new Error(`HTTP ${res.status}`)
    } catch (e) {
      if (i === tries) throw new Error(`page ${n}: ${e.message}`)
      await sleep(i * 2000)
    }
  }
}

// Turn one page's verses into fifteen lines.
//
// A line carrying no words is a line the layout gives to something other than
// ayah text: the ornamental surah name, or the basmala beneath it. Which one it
// is follows from where a surah begins on the page — the name comes first, and
// the basmala after it for every surah but al-Fatihah, whose basmala is its
// first ayah, and at-Tawbah, which has none.
function toLines(json, page) {
  const byLine = new Map()
  const starts = []          // surahs that begin on this page

  for (const v of json.verses || []) {
    const [surah, ayah] = v.verse_key.split(':').map(Number)
    if (ayah === 1) starts.push(surah)

    for (const w of v.words || []) {
      const n = w.line_number
      if (!n) continue
      if (!byLine.has(n)) byLine.set(n, [])
      byLine.get(n).push({
        t: w.text_uthmani || w.text || '',
        end: w.char_type_name === 'end' ? ayah : undefined,
        s: surah,
        a: ayah
      })
    }
  }

  const used = [...byLine.keys()].sort((a, b) => a - b)
  const lines = []
  const pending = [...starts]

  for (let n = 1; n <= LINES_PER_PAGE; n++) {
    const words = byLine.get(n)
    if (words?.length) {
      lines.push({
        n,
        type: 'ayah',
        // Which ayah this line starts in, so the reader can highlight by line.
        s: words[0].s,
        a: words[0].a,
        w: words.map(x => (x.end ? { t: x.t, end: x.end } : { t: x.t }))
      })
      continue
    }

    // An empty line before any words have appeared, or sitting between two
    // surahs, belongs to whichever surah starts next on this page.
    if (n < (used[0] ?? LINES_PER_PAGE + 1) || used.includes(n) === false) {
      const surah = pending[0]
      if (surah != null) {
        const already = lines.some(l => l.type === 'surah' && l.s === surah)
        if (!already) { lines.push({ n, type: 'surah', s: surah }); continue }
        pending.shift()
        if (surah !== 1 && surah !== 9) { lines.push({ n, type: 'basmala', s: surah }); continue }
      }
    }
    lines.push({ n, type: 'blank' })
  }

  return { p: page, lines, surahs: starts }
}

async function main() {
  log('Sabeel · Muṣḥaf layout')

  let total = 0
  let fetched = 0
  let cached = 0

  for (let p = 1; p <= PAGES; p++) {
    const file = path.join(OUT, `${p}.json`)
    if (fs.existsSync(file) && fs.statSync(file).size > 120) {
      total += fs.statSync(file).size
      cached++
      continue
    }

    const json = await getPage(p)
    const page = toLines(json, p)

    const withWords = page.lines.filter(l => l.type === 'ayah').length
    if (!withWords) throw new Error(`page ${p} came back with no ayah lines`)

    total += writeJSON(file, page)
    fetched++
    if (fetched % 50 === 0) log(`  ${p}/${PAGES} …`)
    await sleep(120)
  }

  log(`  ${fetched} fetched, ${cached} already present · ${mb(total)} across ${PAGES} files`)
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
