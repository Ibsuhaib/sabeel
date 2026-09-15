// Warming the next few ayahs into the audio cache while the current one plays.
//
// Per-ayah recitation is one small file per ayah, so without this every ayah
// costs a fresh round trip — audible as a catch between ayahs on anything but a
// fast connection, and worse at the end of a surah where the next file is only
// asked for once the last one has finished.
//
// Downloading the whole surah before starting would also fix it, but it trades
// a gap between every ayah for a wait before any sound at all — two minutes of
// nothing before al-Baqarah. Warming a few ayahs ahead costs nothing at the
// start and stays ahead of the reciter for the rest of the surah.
//
// Everything lands in the same Cache Storage bucket the offline download uses,
// under the same keys, so a warmed ayah is indistinguishable from a downloaded
// one and neither is fetched twice.
// The cache name lives here rather than in offlineAudio.js so that this module
// depends on nothing: audio.js needs it to warm ahead, offlineAudio.js needs it
// to download, and offlineAudio.js already imports audio.js — putting it there
// would close a three-way import cycle.
export const AUDIO_CACHE = 'sabeel-audio'

const MAX_PARALLEL = 3

const inFlight = new Set()
const known = new Set()      // urls we have already confirmed are cached
let bucket = null

async function cache() {
  if (bucket) return bucket
  if (typeof caches === 'undefined') return null
  try { bucket = await caches.open(AUDIO_CACHE) } catch { return null }
  return bucket
}

/**
 * Fetch these urls into the audio cache, quietly and in the background.
 * Already-cached and in-flight urls are skipped. Never throws and never
 * blocks the caller — a warm that fails just means the normal load path
 * fetches it when the time comes.
 */
export async function warm(urls) {
  const c = await cache()
  if (!c || !urls?.length) return

  const queue = []
  for (const url of urls) {
    if (!url || known.has(url) || inFlight.has(url)) continue
    queue.push(url)
  }
  if (!queue.length) return

  const workers = Array.from({ length: Math.min(MAX_PARALLEL, queue.length) }, async () => {
    while (queue.length) {
      const url = queue.shift()
      if (known.has(url) || inFlight.has(url)) continue
      inFlight.add(url)
      try {
        if (await c.match(url)) { known.add(url); continue }
        const res = await fetch(url, { mode: 'cors' })
        if (res.ok) { await c.put(url, res); known.add(url) }
      } catch {
        // Offline, or the file is not there. The player will surface it if and
        // when it actually tries to play this ayah.
      } finally {
        inFlight.delete(url)
      }
    }
  })
  await Promise.all(workers)
}

/** Is this url already on the device? Used to decide whether to wait for it. */
export async function isCached(url) {
  if (known.has(url)) return true
  const c = await cache()
  if (!c) return false
  const hit = Boolean(await c.match(url))
  if (hit) known.add(url)
  return hit
}

/** Forget what we think is cached — after a delete, so warming refetches. */
export function forget() {
  known.clear()
}
