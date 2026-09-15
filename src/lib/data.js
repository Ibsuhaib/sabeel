// Every read goes through here. Data is static JSON under /data, fetched once
// and then served by the service worker cache — there is no backend to call.
const mem = new Map()

const BASE = import.meta.env.BASE_URL || '/'

// One dropped packet on a phone should not read as "this surah is broken", so
// every fetch gets a timeout and one silent retry before it gives up. A failure
// evicts the cache entry, so a later retry genuinely re-fetches.
async function fetchOnce(url, timeoutMs) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const r = await fetch(url, { signal: ctrl.signal })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return await r.json()
  } finally {
    clearTimeout(timer)
  }
}

async function load(path) {
  if (mem.has(path)) return mem.get(path)
  const url = `${BASE}data/${path}`.replace(/\/{2,}/g, '/')

  const p = (async () => {
    try {
      return await fetchOnce(url, 15000)
    } catch (first) {
      try {
        return await fetchOnce(url, 20000)
      } catch (second) {
        mem.delete(path)
        const why = second.name === 'AbortError' ? 'the request timed out' : second.message
        throw new Error(`Could not load ${path} — ${why}.`)
      }
    }
  })()

  mem.set(path, p)
  return p
}

/* ---------------------------------- Quran --------------------------------- */

export const quranMeta = () => load('quran/meta.json')
export const surah = n => load(`quran/surah/${n}.json`)

export async function surahInfo(n) {
  const meta = await quranMeta()
  return meta.surahs.find(s => s.n === Number(n))
}

export async function ayahRange(fromSurah, fromAyah, count) {
  const { ayahs } = await surah(fromSurah)
  return ayahs.filter(a => a.v >= fromAyah).slice(0, count)
}

// Muṣḥaf page mode. A page can span two surahs, so it is assembled from the
// page index in meta.json rather than from any single surah file.
export async function pageAyahs(pageNumber) {
  const meta = await quranMeta()
  const page = meta.pages.find(p => p.p === Number(pageNumber))
  if (!page) throw new Error(`There is no page ${pageNumber} — the muṣḥaf has 604.`)

  const out = []
  for (let n = page.from.s; n <= page.to.s; n++) {
    const { ayahs } = await surah(n)
    const info = meta.surahs.find(s => s.n === n)
    for (const a of ayahs) {
      if (a.p !== page.p) continue
      out.push({ ...a, surah: n, surahName: info.name, surahEn: info.en })
    }
  }
  return { page, ayahs: out, meta }
}

export async function pageOf(surahNumber, ayahNumber) {
  const { ayahs } = await surah(surahNumber)
  return ayahs.find(a => a.v === Number(ayahNumber))?.p ?? null
}

export async function juzSurahs(juz) {
  const meta = await quranMeta()
  const out = []
  for (const s of meta.surahs) {
    const { ayahs } = await surah(s.n)
    const inJuz = ayahs.filter(a => a.j === juz)
    if (inJuz.length) out.push({ surah: s, from: inJuz[0].v, to: inJuz[inJuz.length - 1].v })
  }
  return out
}

/* --------------------------------- Hadith --------------------------------- */

export const hadithIndex = () => load('hadith/index.json')
export const hadithBook = (collection, book) => load(`hadith/${collection}/${book}.json`)
export const hadithSearchIndex = collection => load(`hadith/${collection}/_search.json`)

export async function hadithCollection(id) {
  const idx = await hadithIndex()
  return idx.collections.find(c => c.id === id)
}

export async function findHadith(collection, n) {
  const c = await hadithCollection(collection)
  if (!c) return null
  for (const b of c.books) {
    const { hadiths } = await hadithBook(collection, b.n)
    const h = hadiths.find(x => x.n === Number(n))
    if (h) return { hadith: h, book: b, collection: c }
  }
  return null
}

/* -------------------------------- Reciters -------------------------------- */

export const reciterCatalogue = () => load('reciters.json')
export const adhanCatalogue = () => load('adhan.json')

/* ----------------------------------- Dua ---------------------------------- */

export const duaIndex = () => load('dua/index.json')
export const duaCategory = slug => load(`dua/${slug}.json`)
export const asmaUlHusna = () => load('dua/asma-ul-husna.json')

/* --------------------------------- Search --------------------------------- */

// The World Magnetic Model, used to turn a magnetic compass reading into a true
// one. 1.6 KB, so it is fetched once and kept for the life of the session.
export const geomagModel = () => load('geomag/wmm.json')

export const quranSearchIndex = () => load('search/quran.json')
export const duaSearchIndex = () => load('search/dua.json')

/* ------------------------- Offline download helper ------------------------ */

// Warming the service worker cache for a whole collection. The SW's CacheFirst
// rule on /data/*.json means a plain fetch is enough to make it available offline.
export async function downloadCollection(id, onProgress) {
  const c = await hadithCollection(id)
  if (!c) throw new Error(`unknown collection ${id}`)
  let done = 0
  for (const b of c.books) {
    await hadithBook(id, b.n).catch(() => {})
    onProgress?.(++done, c.books.length)
  }
  await hadithSearchIndex(id).catch(() => {})
  return true
}
