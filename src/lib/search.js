// Unified search across Quran, hadith and dua — Part 3.10(d). Runs entirely
// on-device against the prebuilt lowercase indexes. No server, no rate limit.
import { quranSearchIndex, duaSearchIndex, hadithSearchIndex, quranMeta, hadithIndex } from './data.js'

const norm = s => (s || '')
  .toLowerCase()
  .replace(/[‘’']/g, '')
  .replace(/[^a-z0-9\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

function scoreOf(text, terms, phrase) {
  if (phrase && text.includes(phrase)) return 100 + Math.max(0, 40 - text.indexOf(phrase) / 10)
  let hits = 0
  for (const t of terms) if (text.includes(t)) hits++
  if (hits < terms.length) return 0
  return 40 + hits
}

export function snippet(text, phrase, len = 190) {
  if (!text) return ''
  const i = phrase ? text.toLowerCase().indexOf(phrase) : -1
  if (i < 0) return text.length > len ? text.slice(0, len).trimEnd() + '…' : text
  const start = Math.max(0, i - 60)
  const cut = text.slice(start, start + len)
  return (start > 0 ? '…' : '') + cut.trimEnd() + (start + len < text.length ? '…' : '')
}

export async function searchQuran(query, limit = 40) {
  const phrase = norm(query)
  if (phrase.length < 2) return []
  const terms = phrase.split(' ').filter(t => t.length > 1)
  const [{ rows }, meta] = await Promise.all([quranSearchIndex(), quranMeta()])
  const byNumber = new Map(meta.surahs.map(s => [s.n, s]))
  const out = []
  for (const r of rows) {
    const score = scoreOf(r.t, terms, phrase)
    if (score) out.push({ kind: 'quran', key: r.k, score, text: r.t, surah: byNumber.get(+r.k.split(':')[0]) })
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit)
}

export async function searchDua(query, limit = 20) {
  const phrase = norm(query)
  if (phrase.length < 2) return []
  const terms = phrase.split(' ').filter(t => t.length > 1)
  const { rows } = await duaSearchIndex()
  const out = []
  for (const r of rows) {
    const score = scoreOf(r.t, terms, phrase)
    if (score) out.push({ kind: 'dua', key: r.k, title: r.title, score, text: r.t })
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit)
}

// Hadith indexes are a few MB each, so they load per collection on demand.
// `collections` defaults to the six books plus Nawawi.
export async function searchHadith(query, collections, limit = 40, onProgress) {
  const phrase = norm(query)
  if (phrase.length < 2) return []
  const terms = phrase.split(' ').filter(t => t.length > 1)

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
      for (const r of rows) {
        const score = scoreOf(r.t, terms, phrase)
        if (score) out.push({ kind: 'hadith', collection: id, collectionName: meta.get(id)?.name, book: r.b, n: r.n, score, text: r.t })
      }
    } catch { /* collection not downloaded yet — skip it */ }
    onProgress?.(++done, ids.length)
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit)
}

export async function searchAll(query, { onProgress } = {}) {
  const phrase = norm(query)
  const [quran, dua] = await Promise.all([searchQuran(query, 25), searchDua(query, 12)])
  const hadith = await searchHadith(query, null, 25, onProgress)
  return { phrase, quran, hadith, dua }
}
