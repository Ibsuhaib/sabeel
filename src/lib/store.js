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
  offlineCollections: 'offline.hadith',
  recents: 'recents'
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

  // Recording where you are also advances an active khatm plan, so the plan
  // reflects what you actually read rather than only what you remembered to
  // tap. Opt-out lives on the plan itself.
  async setLastRead(v) {
    await set(K.lastRead, { ...v, at: Date.now() })
    await this.pushRecent(v)
    if (v?.page) await this.syncKhatm(v.page)
    return v
  },

  // A short history of where you have been reading, so the Quran screen can
  // offer more than one place to pick up — which is how people actually read,
  // a little of one surah and a little of another.
  async recents() { return (await get(K.recents)) || [] },

  async pushRecent(v) {
    if (!v?.surah) return []
    const list = await this.recents()
    const id = `${v.surah}:${v.ayah}`
    // Collapse consecutive entries in the same surah rather than filling the
    // list with every ayah scrolled past.
    const filtered = list.filter(r => r.surah !== v.surah)
    filtered.unshift({ id, surah: v.surah, ayah: v.ayah, page: v.page, at: Date.now() })
    const trimmed = filtered.slice(0, 6)
    await set(K.recents, trimmed)
    return trimmed
  },

  async syncKhatm(page) {
    try {
      const raw = await get(K.khatm)
      if (!raw) return null
      const { normalise, markPage } = await import('./khatm.js')
      const plan = normalise(raw)
      // A page counts once you have read past it, so the plan advances to the
      // page *before* the one currently on screen.
      const reached = Math.max(0, Number(page) - 1)
      if (!plan || !plan.autoSync || plan.paused || reached <= plan.page) return plan
      const next = markPage(plan, reached)
      await set(K.khatm, next)
      return next
    } catch {
      return null
    }
  },

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

  // Always normalised on the way out, so a corrupt or older-version plan can
  // never reach the UI.
  async khatm() {
    const raw = await get(K.khatm)
    if (!raw) return null
    const { normalise } = await import('./khatm.js')
    const plan = normalise(raw)
    if (!plan) { await del(K.khatm); return null }
    return plan
  },

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
