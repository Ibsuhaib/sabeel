// Downloading recitation to the device.
//
// Two paths, and they write to the same place:
//
//   * Anything you play is kept. The service worker's CacheFirst rule for
//     everyayah.com and mp3quran.net stores each file the first time it is
//     fetched, so listening once is enough to have it offline afterwards.
//   * Anything you ask for is fetched ahead of time, into that same Cache
//     Storage bucket under the same keys — so a surah downloaded here is served
//     by exactly the same code path as one that was cached by playing it.
//
// Writing through the Cache API rather than leaving it all to the service
// worker is what makes the rest possible: knowing precisely what is on the
// device, reporting real progress, and deleting exactly one surah again.
import { ayahUrl, surahUrl } from './audio.js'

export const AUDIO_CACHE = 'sabeel-audio'

const supported = () => typeof caches !== 'undefined'

async function bucket() {
  if (!supported()) return null
  try { return await caches.open(AUDIO_CACHE) } catch { return null }
}

/* ------------------------------- url lists ------------------------------- */

export function urlsForSurah(reciter, surah, ayahCount) {
  if (!reciter) return []
  if (reciter.mode === 'surah') return [surahUrl(reciter, surah)]
  return Array.from({ length: ayahCount }, (_, i) => ayahUrl(reciter, surah, i + 1))
}

/* -------------------------------- status --------------------------------- */

export async function cachedStatus(urls) {
  const c = await bucket()
  if (!c || !urls.length) return { cached: 0, total: urls.length, complete: false }
  let cached = 0
  // matchAll on the whole cache once is far cheaper than N individual matches
  // when a surah is 286 ayahs long.
  const keys = new Set((await c.keys()).map(r => r.url))
  for (const u of urls) if (keys.has(new Request(u).url)) cached++
  return { cached, total: urls.length, complete: cached === urls.length && urls.length > 0 }
}

/* ------------------------------- download -------------------------------- */

// Six at a time: enough to saturate a phone connection without the browser
// queueing them anyway or the device running out of sockets.
const CONCURRENCY = 6

export async function download(urls, { onProgress, signal } = {}) {
  const c = await bucket()
  if (!c) throw new Error('This browser cannot store audio offline.')

  const keys = new Set((await c.keys()).map(r => r.url))
  const todo = urls.filter(u => !keys.has(new Request(u).url))
  let done = urls.length - todo.length
  let bytes = 0
  let failed = 0

  onProgress?.({ done, total: urls.length, bytes, failed })

  const queue = [...todo]
  async function worker() {
    while (queue.length) {
      if (signal?.aborted) return
      const url = queue.shift()
      try {
        const res = await fetch(url, { signal, mode: 'cors' })
        if (res.ok) {
          const clone = res.clone()
          await c.put(url, res)
          bytes += Number(clone.headers.get('content-length')) || 0
        } else {
          failed++
        }
      } catch (e) {
        if (e?.name === 'AbortError') return
        failed++
      }
      done++
      onProgress?.({ done, total: urls.length, bytes, failed })
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, Math.max(1, queue.length)) }, worker))
  if (signal?.aborted) return { aborted: true, done, total: urls.length, failed }
  return { aborted: false, done, total: urls.length, failed, bytes }
}

export async function remove(urls) {
  const c = await bucket()
  if (!c) return 0
  let n = 0
  for (const u of urls) if (await c.delete(u)) n++
  return n
}

/* ------------------------------- inventory ------------------------------- */

// What is actually on the device, grouped the way a person thinks about it:
// by reciter, then by surah.
export async function inventory() {
  const c = await bucket()
  if (!c) return { reciters: {}, files: 0 }

  const out = {}
  let files = 0
  for (const req of await c.keys()) {
    const url = req.url
    files++

    // EveryAyah: /data/<reciter>/SSSAAA.mp3
    let m = url.match(/everyayah\.com\/data\/([^/]+)\/(\d{3})(\d{3})\.mp3/)
    if (m) {
      const [, rid, s] = m
      const surah = Number(s)
      out[rid] = out[rid] || { mode: 'ayah', surahs: {} }
      out[rid].surahs[surah] = (out[rid].surahs[surah] || 0) + 1
      continue
    }

    // mp3quran: <server>/SSS.mp3
    m = url.match(/mp3quran\.net\/([^?]*)\/(\d{3})\.mp3/)
    if (m) {
      const rid = `mq:${m[1]}`
      const surah = Number(m[2])
      out[rid] = out[rid] || { mode: 'surah', surahs: {} }
      out[rid].surahs[surah] = 1
    }
  }
  return { reciters: out, files }
}

// Resolve inventory keys back to the catalogue so the UI can name them.
export function matchReciter(catalogue, key) {
  if (!catalogue) return null
  if (key.startsWith('mq:')) {
    const path = key.slice(3)
    return catalogue.surah.find(r => r.server.endsWith(path) || r.server.includes(path)) || null
  }
  return catalogue.perAyah.find(r => r.id === key) || null
}

export async function removeReciter(key) {
  const c = await bucket()
  if (!c) return 0
  const needle = key.startsWith('mq:') ? key.slice(3) : `/data/${key}/`
  let n = 0
  for (const req of await c.keys()) {
    if (req.url.includes(needle) && (await c.delete(req))) n++
  }
  return n
}

export async function clearAll() {
  if (!supported()) return false
  try { return await caches.delete(AUDIO_CACHE) } catch { return false }
}

/* -------------------------------- storage -------------------------------- */

export async function storage() {
  if (!navigator.storage?.estimate) return null
  try {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate()
    return { usage, quota, percent: quota ? (usage / quota) * 100 : 0 }
  } catch { return null }
}

// Without this, a phone under storage pressure can silently evict downloaded
// recitation — which is exactly what you do not want on a plane.
export async function isPersisted() {
  try { return (await navigator.storage?.persisted?.()) ?? false } catch { return false }
}

export async function requestPersistence() {
  try { return (await navigator.storage?.persist?.()) ?? false } catch { return false }
}

export function fmtBytes(n) {
  if (!n) return '0 MB'
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

// A per-ayah file averages roughly this much at the bitrates EveryAyah serves.
// Used only to warn before a large download; the real figure is reported as it
// runs, and is never presented as exact.
const AVG_AYAH_BYTES = 48 * 1024

export function estimateBytes(reciter, ayahCount) {
  if (!reciter) return 0
  if (reciter.mode === 'surah') return 2.5 * 1024 * 1024
  const bitrateHint = Number((reciter.id.match(/(\d+)kbps/) || [])[1]) || 128
  return Math.round(ayahCount * AVG_AYAH_BYTES * (bitrateHint / 128))
}
