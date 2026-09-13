// Every read goes through here. Data is static JSON under /data, fetched once
// and then served by the service worker cache — there is no backend to call.
const mem = new Map()

const BASE = import.meta.env.BASE_URL || '/'

async function load(path) {
  if (mem.has(path)) return mem.get(path)
  const p = fetch(`${BASE}data/${path}`.replace(/\/{2,}/g, '/'))
    .then(r => {
      if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`)
      return r.json()
    })
    .catch(e => { mem.delete(path); throw e })
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
  if (!page) return null

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

/* ----------------------------------- Dua ---------------------------------- */

export const duaIndex = () => load('dua/index.json')
export const duaCategory = slug => load(`dua/${slug}.json`)
export const asmaUlHusna = () => load('dua/asma-ul-husna.json')

/* --------------------------------- Search --------------------------------- */

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
