// Unified search across Quran, hadith and dua — Part 3.10(d). Runs entirely
// on-device against the prebuilt indexes. No server, no rate limit.
//
// The indexes hold the text as written. Matching needs a normalised form, so we
// build one the first time a corpus is searched and keep it for the session:
// one pass over ~7,500 rows is a few milliseconds, and it means results are
// shown to the reader with their capitals and punctuation intact.
import { quranSearchIndex, duaSearchIndex, hadithSearchIndex, quranMeta, hadithIndex } from './data.js'

const norm = s => (s || '')
  .toLowerCase()
  .replace(/[‘’']/g, '')
  .replace(/[^a-z0-9\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const normCache = new WeakMap()

function normalised(rows) {
  let arr = normCache.get(rows)
  if (!arr) {
    arr = rows.map(r => norm(r.t))
    normCache.set(rows, arr)
  }
  return arr
}

function scoreOf(text, terms, phrase) {
  if (phrase && text.includes(phrase)) return 100 + Math.max(0, 40 - text.indexOf(phrase) / 10)
  let hits = 0
  for (const t of terms) if (text.includes(t)) hits++
  if (hits < terms.length) return 0
  return 40 + hits
}

function parse(query) {
  const phrase = norm(query)
  return { phrase, terms: phrase.split(' ').filter(t => t.length > 1) }
}

// Window the original text around the match, using the normalised text only to
// locate it. Offsets line up closely enough for a snippet; we widen to word
// boundaries so we never cut mid-word.
export function snippet(text, phrase, len = 190) {
  if (!text) return ''
  if (text.length <= len) return text
  const at = phrase ? norm(text).indexOf(phrase) : -1
  if (at < 0) return text.slice(0, len).replace(/\s+\S*$/, '') + '…'
  const start = Math.max(0, Math.min(at - 60, text.length - len))
  const cut = text.slice(start, start + len)
  const head = start > 0 ? '…' + cut.replace(/^\S*\s+/, '') : cut
  return head.replace(/\s+\S*$/, '') + (start + len < text.length ? '…' : '')
}

export async function searchQuran(query, limit = 40) {
  const { phrase, terms } = parse(query)
  if (phrase.length < 2) return []
  const [{ rows }, meta] = await Promise.all([quranSearchIndex(), quranMeta()])
  const hay = normalised(rows)
  const byNumber = new Map(meta.surahs.map(s => [s.n, s]))
  const out = []
  for (let i = 0; i < rows.length; i++) {
    const score = scoreOf(hay[i], terms, phrase)
    if (score) {
      out.push({ kind: 'quran', key: rows[i].k, score, text: rows[i].t, surah: byNumber.get(+rows[i].k.split(':')[0]) })
    }
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit)
}

export async function searchDua(query, limit = 20) {
  const { phrase, terms } = parse(query)
  if (phrase.length < 2) return []
  const { rows } = await duaSearchIndex()
  const hay = normalised(rows)
  const out = []
  for (let i = 0; i < rows.length; i++) {
    // A dua's title is part of what a reader searches for, so match it too.
    const score = scoreOf(`${norm(rows[i].title)} ${hay[i]}`, terms, phrase)
    if (score) out.push({ kind: 'dua', key: rows[i].k, title: rows[i].title, score, text: rows[i].t })
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit)
}

// Hadith indexes are a few megabytes each, so they load per collection on
// demand. Defaults to the six books plus Nawawi's forty.
export async function searchHadith(query, collections, limit = 40, onProgress) {
  const { phrase, terms } = parse(query)
  if (phrase.length < 2) return []

  const idx = await hadithIndex()
  const ids = collections?.length
    ? collections
    : idx.collections.filter(c => c.inSixBooks || c.id === 'nawawi').map(c => c.id)
  const meta = new Map(idx.collections.map(c => [c.id, c]))

  const out = []
  let done = 0
  for (const id of ids) {
    try {
      const { rows } = await hadithSearchIndex(id)
      const hay = normalised(rows)
      for (let i = 0; i < rows.length; i++) {
        const score = scoreOf(hay[i], terms, phrase)
        if (score) {
          out.push({
            kind: 'hadith', collection: id, collectionName: meta.get(id)?.name,
            book: rows[i].b, n: rows[i].n, score, text: rows[i].t
          })
        }
      }
    } catch { /* collection not downloaded yet — skip it */ }
    onProgress?.(++done, ids.length)
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit)
}

export async function searchAll(query, { onProgress } = {}) {
  const { phrase } = parse(query)
  const [quran, dua] = await Promise.all([searchQuran(query, 25), searchDua(query, 12)])
  const hadith = await searchHadith(query, null, 25, onProgress)
  return { phrase, quran, hadith, dua }
}
