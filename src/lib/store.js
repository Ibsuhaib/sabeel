// All user data lives on the device. No account, no server, no sync.
// Export/import is a single JSON file the user controls.
import { get, set, del, keys } from 'idb-keyval'

const K = {
  bookmarksQuran: 'bm.quran',
  bookmarksHadith: 'bm.hadith',
  lastRead: 'lastRead',
  prayerLog: 'prayerLog',
  tasbih: 'tasbih',
  notes: 'notes',
  khatm: 'khatm',
  offlineCollections: 'offline.hadith'
}

export const store = {
  async bookmarksQuran() { return (await get(K.bookmarksQuran)) || [] },
  async toggleQuranBookmark(surah, ayah, snippet) {
    const list = await this.bookmarksQuran()
    const id = `${surah}:${ayah}`
    const i = list.findIndex(b => b.id === id)
    if (i >= 0) list.splice(i, 1)
    else list.unshift({ id, surah, ayah, snippet, at: Date.now() })
    await set(K.bookmarksQuran, list)
    return list
  },

  async bookmarksHadith() { return (await get(K.bookmarksHadith)) || [] },
  async toggleHadithBookmark(collection, book, n, snippet, collectionName) {
    const list = await this.bookmarksHadith()
    const id = `${collection}:${n}`
    const i = list.findIndex(b => b.id === id)
    if (i >= 0) list.splice(i, 1)
    else list.unshift({ id, collection, collectionName, book, n, snippet, at: Date.now() })
    await set(K.bookmarksHadith, list)
    return list
  },

  async lastRead() { return await get(K.lastRead) },
  async setLastRead(v) { return set(K.lastRead, { ...v, at: Date.now() }) },

  async prayerLog() { return (await get(K.prayerLog)) || {} },
  async logPrayer(dateKey, prayer, state) {
    const log = await this.prayerLog()
    log[dateKey] = { ...(log[dateKey] || {}), [prayer]: state }
    if (state === null) delete log[dateKey][prayer]
    await set(K.prayerLog, log)
    return log
  },

  async tasbih() { return (await get(K.tasbih)) || { count: 0, target: 33, total: 0, label: 'SubhanAllah' } },
  async setTasbih(v) { return set(K.tasbih, v) },

  async notes() { return (await get(K.notes)) || {} },
  async setNote(id, text) {
    const n = await this.notes()
    if (text?.trim()) n[id] = { text, at: Date.now() }
    else delete n[id]
    await set(K.notes, n)
    return n
  },

  async khatm() { return await get(K.khatm) },
  async setKhatm(v) { return v ? set(K.khatm, v) : del(K.khatm) },

  async offlineCollections() { return (await get(K.offlineCollections)) || [] },
  async markOffline(id) {
    const list = await this.offlineCollections()
    if (!list.includes(id)) list.push(id)
    await set(K.offlineCollections, list)
    return list
  },

  async exportAll() {
    const out = { app: 'sabeel', version: 1, exportedAt: new Date().toISOString(), data: {} }
    for (const k of await keys()) out.data[k] = await get(k)
    try { out.settings = JSON.parse(localStorage.getItem('sabeel.settings.v1') || 'null') } catch { /* ignore */ }
    return out
  },

  async importAll(payload) {
    if (payload?.app !== 'sabeel') throw new Error('Not a Sabeel backup file')
    for (const [k, v] of Object.entries(payload.data || {})) await set(k, v)
    if (payload.settings) localStorage.setItem('sabeel.settings.v1', JSON.stringify(payload.settings))
    return true
  }
}
