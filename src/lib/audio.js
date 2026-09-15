// One player for the whole app, so recitation keeps going while you browse.
//
// Two playback modes, and the difference is honest in the UI:
//   'ayah'  — EveryAyah, one file per ayah. Ayah controls, A→B range and
//             per-ayah repeat all work because each ayah is its own file.
//   'surah' — mp3quran, one file per surah. More imams (most of the current
//             Haramain), but a single file cannot be driven ayah by ayah.
//
// Nothing is hosted by us. Files stream and the service worker caches what has
// actually been played.

import { quranMeta } from './data.js'
import { warm } from './prefetch.js'

const EVERY_AYAH = 'https://everyayah.com/data'

// How many ayahs beyond the buffered element to pull into the cache.
const LOOKAHEAD = 4

export const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2]
export const REPEATS = [1, 2, 3, 5, 7, 10, Infinity]
// A pause between ayahs, for repeating after the reciter while memorising.
export const DELAYS = [0, 1, 2, 3, 5, 8]

// The basmala is recited before every surah except al-Fatihah, where it is the
// first ayah and so already has its own file, and at-Tawbah, which has none.
// Per-ayah recitations do not ship a basmala track per surah — the one recorded
// for 1:1 is the basmala, and that is the file every reciter has — so ayah 0 is
// used to mean "the basmala", and it loads 001001 from whichever reciter is playing.
export const BASMALA_AYAH = 0
export const hasBasmala = surah => surah !== 1 && surah !== 9

export function basmalaUrl(reciter) {
  return `${EVERY_AYAH}/${reciter.id}/001001.mp3`
}

export const ayahFileId = (surah, ayah) =>
  `${String(surah).padStart(3, '0')}${String(ayah).padStart(3, '0')}`

export function ayahUrl(reciter, surah, ayah) {
  return `${EVERY_AYAH}/${reciter.id}/${ayahFileId(surah, ayah)}.mp3`
}

export function surahUrl(reciter, surah) {
  return `${reciter.server}/${String(surah).padStart(3, '0')}.mp3`
}

// Ayah counts for all 114 surahs, so that finishing one surah can roll into the
// next without whoever pressed play having to know how long anything is. Loaded
// once from the muṣḥaf metadata the app already ships, and primed on play so it
// is in hand well before the last ayah of the surah arrives.
let lengths = null
let lengthsPromise = null

function primeLengths() {
  if (lengths || lengthsPromise) return lengthsPromise
  lengthsPromise = quranMeta()
    .then(m => { lengths = Object.fromEntries(m.surahs.map(x => [x.n, x.ayahs])) })
    .catch(() => { lengths = {} })
  return lengthsPromise
}

const lengthOf = n => (lengths ? lengths[n] : null) || null

const initial = {
  reciter: null,
  surah: null,
  ayah: null,
  lastAyah: null,      // ayah count of the surah being played
  playing: false,
  loading: false,
  error: null,
  time: 0,
  duration: 0,
  speed: 1,
  repeat: 1,           // repeats of the CURRENT ayah before moving on
  played: 0,
  range: null,         // { from, to } — loop this span of ayahs
  autoAdvance: true,   // continue into the next ayah when one finishes
  continuous: true,    // and on into the next surah when one finishes
  delay: 0,            // seconds of silence before the next ayah
  waiting: false,      // sitting in that silence right now
  preloadSurah: false, // fetch the whole surah before the first ayah sounds
  buffering: null      // { done, total } while that is happening
}

let state = { ...initial }

// Two elements, not one. A single <audio> has to take a new src, decode it and
// start again between every ayah, and that pause is audible even when the file
// is already on the device. With a pair, the next ayah is loaded and decoded
// while the current one is still playing, and the handover is a swap rather
// than a load.
let pair = null
let active = 0
let delayTimer = null
const listeners = new Set()

const el = () => (pair ? pair[active] : null)
const spare = () => (pair ? pair[1 - active] : null)

function emit() {
  const snapshot = { ...state }
  listeners.forEach(fn => fn(snapshot))
}

function build() {
  const a = new Audio()
  a.preload = 'auto'
  // Only the element actually playing may drive the UI. The other one is busy
  // loading the next ayah, and its events would otherwise report its progress
  // as though it were the recitation you can hear.
  const live = () => a === el()

  a.addEventListener('play', () => { if (live()) { state.playing = true; state.error = null; emit() } })
  a.addEventListener('pause', () => { if (live()) { state.playing = false; emit() } })
  a.addEventListener('waiting', () => { if (live()) { state.loading = true; emit() } })
  a.addEventListener('playing', () => { if (live()) { state.loading = false; emit() } })
  a.addEventListener('loadedmetadata', () => {
    if (!live()) return
    state.duration = a.duration || 0
    state.loading = false
    emit()
  })
  a.addEventListener('timeupdate', () => {
    if (!live()) return
    state.time = a.currentTime || 0
    emit()
  })
  a.addEventListener('error', () => {
    if (!live()) return
    state.loading = false
    state.playing = false
    state.error = 'Could not load this recitation. Check your connection, or try another reciter.'
    emit()
  })
  a.addEventListener('ended', () => { if (live()) onEnded() })
  return a
}

function audio() {
  if (!pair) pair = [build(), build()]
  return el()
}

function onEnded() {
  if (state.reciter?.mode === 'surah') {
    // A whole surah just finished. Repeat it, or stop.
    if (state.played + 1 < state.repeat) {
      state.played++
      el().currentTime = 0
      el().play().catch(() => {})
      emit()
      return
    }
    state.played = 0
    if (state.continuous && state.surah < 114) { startSurah(state.surah + 1); return }
    state.playing = false
    emit()
    return
  }

  // The basmala is an opening, not part of the count: it is never repeated and
  // always hands over to the first ayah.
  if (state.ayah === BASMALA_AYAH) {
    state.played = 0
    load(state.surah, 1)
    return
  }

  // Per-ayah: repeat this ayah first.
  if (state.played + 1 < state.repeat) {
    state.played++
    el().currentTime = 0
    el().play().catch(() => {})
    emit()
    return
  }
  state.played = 0

  if (!state.autoAdvance) { state.playing = false; emit(); return }

  const next = state.ayah + 1
  const endOfSurah = state.lastAyah && next > state.lastAyah
  const target = (state.range && next > state.range.to) ? state.range.from
    : endOfSurah ? null
    : next

  // A range is an explicit instruction to stay put, so it wins; otherwise the end
  // of a surah is just a boundary to cross, the way it is when reading.
  if (target == null && endOfSurah && !state.range && state.continuous && state.surah < 114) {
    startSurah(state.surah + 1)
    return
  }

  if (target == null) { state.playing = false; emit(); return }

  // The gap is the point when you are repeating after the reciter, so it has to
  // be real silence rather than the next ayah starting underneath you.
  if (state.delay > 0) {
    state.waiting = true
    emit()
    clearTimeout(delayTimer)
    delayTimer = setTimeout(() => {
      state.waiting = false
      load(state.surah, target)
    }, state.delay * 1000)
    return
  }
  load(state.surah, target)
}

// Move playback to the start of a surah: its basmala where it has one, and its
// own ayah count, so the next boundary is known before it is reached.
function startSurah(n) {
  state.lastAyah = lengthOf(n)
  state.played = 0
  const from = state.reciter?.mode !== 'surah' && hasBasmala(n) ? BASMALA_AYAH : 1

  if (lengthOf(n)) { load(n, from); return }
  // Metadata has not arrived yet — wait for it rather than playing a surah whose
  // end we cannot detect, which would stop the run after one more surah.
  state.loading = true
  emit()
  primeLengths().then(() => {
    state.lastAyah = lengthOf(n)
    load(n, from)
  })
}

// The file for a position, whatever kind of reciter is selected.
function urlFor(surah, ayah) {
  if (!state.reciter || !surah) return null
  if (state.reciter.mode === 'surah') return surahUrl(state.reciter, surah)
  return ayah === BASMALA_AYAH ? basmalaUrl(state.reciter) : ayahUrl(state.reciter, surah, ayah)
}

// Where playback will be after this position, for preloading. Mirrors the rules
// in onEnded — a repeat stays put, a range wraps, a surah rolls into the next —
// so the element being warmed is the one that will actually be needed.
function nextPosition(surah, ayah) {
  if (!state.reciter) return null
  if (state.reciter.mode === 'surah') {
    return state.continuous && surah < 114 ? { surah: surah + 1, ayah: 1 } : null
  }
  if (ayah === BASMALA_AYAH) return { surah, ayah: 1 }
  if (state.repeat > 1) return { surah, ayah }              // it will play again
  if (!state.autoAdvance) return null

  const next = ayah + 1
  if (state.range && next > state.range.to) return { surah, ayah: state.range.from }
  if (state.lastAyah && next > state.lastAyah) {
    if (state.range || !state.continuous || surah >= 114) return null
    const n = surah + 1
    return { surah: n, ayah: hasBasmala(n) ? BASMALA_AYAH : 1 }
  }
  return { surah, ayah: next }
}

// Load the element that is *not* playing with whatever comes next, and warm a
// few more into the cache behind it. The element does the decoding ahead of
// time; the cache covers the case where the run gets ahead of the buffer.
function primeNext(surah, ayah) {
  const sp = spare()
  if (!sp) return

  const at = nextPosition(surah, ayah)
  const url = at && urlFor(at.surah, at.ayah)
  if (url && sp.dataset.url !== url) {
    sp.dataset.url = url
    sp.src = url
    sp.playbackRate = state.speed
    try { sp.load() } catch { /* some browsers reject an early load; harmless */ }
  }

  // Warm further ahead than the single buffered element, so a fast reciter or a
  // run of very short ayahs does not outpace it.
  if (state.reciter?.mode !== 'surah' && at) {
    const ahead = []
    let cur = at
    for (let i = 0; i < LOOKAHEAD && cur; i++) {
      cur = nextPosition(cur.surah, cur.ayah)
      const u = cur && urlFor(cur.surah, cur.ayah)
      if (u) ahead.push(u)
    }
    if (ahead.length) warm(ahead)
  }
}

// Pull every ayah of a surah into the cache, then start. Progress is reported on
// the player state so the UI can show it rather than appearing to have hung.
async function preloadWholeSurah(surah, count, from) {
  const urls = []
  if (hasBasmala(surah)) urls.push(basmalaUrl(state.reciter))
  for (let v = 1; v <= count; v++) urls.push(ayahUrl(state.reciter, surah, v))

  state.buffering = { done: 0, total: urls.length }
  state.loading = true
  emit()

  // In chunks, so the count moves and a slow connection still shows progress.
  const CHUNK = 6
  for (let i = 0; i < urls.length; i += CHUNK) {
    if (state.buffering == null) return            // cancelled by another action
    await warm(urls.slice(i, i + CHUNK))
    state.buffering = { done: Math.min(i + CHUNK, urls.length), total: urls.length }
    emit()
  }

  state.buffering = null
  const start = (from === 1 && hasBasmala(surah)) ? BASMALA_AYAH : from
  load(surah, start)
}

function load(surah, ayah, { autoplay = true } = {}) {
  // Every transport control routes through here, so this is the one place that
  // needs to know a reciter has actually been chosen. Without it, pressing next
  // before the catalogue has loaded throws.
  if (!state.reciter || !surah) return
  audio()

  const url = urlFor(surah, ayah)
  const sp = spare()

  // If the spare was primed with exactly this file, it is already decoded and
  // ready — swap to it rather than loading the same thing again. This is what
  // removes the catch between ayahs.
  if (url && sp && sp.dataset.url === url && sp.readyState >= 2) {
    el()?.pause()
    active = 1 - active
  } else {
    const a = el()
    a.dataset.url = url || ''
    a.src = url || ''
  }

  const a = el()
  state.surah = surah
  state.ayah = ayah
  state.time = 0
  state.duration = a.duration && Number.isFinite(a.duration) ? a.duration : 0
  state.loading = a.readyState < 2
  state.error = null
  a.currentTime = 0
  a.playbackRate = state.speed

  if (autoplay) a.play().catch(() => { state.playing = false; state.loading = false; emit() })
  emit()

  primeNext(surah, ayah)
}

export const player = {
  subscribe(fn) {
    listeners.add(fn)
    fn({ ...state })
    return () => listeners.delete(fn)
  },

  get state() { return { ...state } },

  setReciter(reciter) {
    if (!reciter) return
    const wasPlaying = state.playing
    const { surah, ayah } = state
    state.reciter = reciter
    state.played = 0
    // Switching between modes invalidates any ayah range.
    if (reciter.mode === 'surah') state.range = null
    emit()
    if (surah && wasPlaying) load(surah, ayah || 1)
    else if (surah) load(surah, ayah || 1, { autoplay: false })
  },

  setSurahLength(n) { state.lastAyah = n },

  play(surah, ayah = 1, lastAyah) {
    if (!state.reciter) return
    primeLengths()
    if (lastAyah) state.lastAyah = lastAyah
    state.played = 0

    // Fetch the surah in full before anything sounds. Off by default: it trades
    // a gap between ayahs — which buffering ahead already removes — for a wait
    // before the first word, and that wait is minutes for a long surah. Worth
    // having for a connection too poor to stay ahead of the reciter.
    if (state.preloadSurah && state.reciter.mode !== 'surah') {
      const count = lastAyah || state.lastAyah || lengthOf(surah)
      if (count) {
        preloadWholeSurah(surah, count, ayah)
        return
      }
    }
    // Beginning a surah at its first ayah means beginning with the basmala.
    // Starting part-way through does not — you are resuming mid-surah, and an
    // opening formula there would be wrong.
    const start = (ayah === 1 && state.reciter.mode !== 'surah' && hasBasmala(surah))
      ? BASMALA_AYAH
      : ayah
    load(surah, start)
  },

  toggle(surah, ayah, lastAyah) {
    if (!state.reciter) return
    const atBasmalaFor = state.ayah === BASMALA_AYAH && ayah === 1
    const same = state.surah === surah &&
      (state.reciter.mode === 'surah' || state.ayah === ayah || atBasmalaFor)
    if (same && state.playing) { audio().pause(); return }
    if (same && el()?.src) { audio().play().catch(() => {}); return }
    this.play(surah, ayah, lastAyah)
  },

  setContinuous(on) { state.continuous = !!on; emit() },

  setPreloadSurah(on) { state.preloadSurah = !!on; emit() },

  pause() { clearTimeout(delayTimer); state.buffering = null; state.waiting = false; el()?.pause(); emit() },
  resume() { el()?.play().catch(() => {}) },

  playPause() {
    if (!el()?.src) return
    if (state.playing) el().pause()
    else el().play().catch(() => {})
  },

  next() {
    if (!state.reciter || !state.surah) return
    if (state.reciter.mode === 'surah') { this.seek(Math.min(state.duration, state.time + 30)); return }
    const n = (state.ayah || 0) + 1
    if (state.lastAyah && n > state.lastAyah) return
    state.played = 0
    load(state.surah, n)
  },

  previous() {
    if (!state.reciter || !state.surah) return
    if (state.reciter.mode === 'surah') { this.seek(Math.max(0, state.time - 30)); return }
    // Mirror every audio player ever: restart the ayah if you are past the start.
    if (state.time > 2.5) { this.seek(0); return }
    const p = state.ayah - 1
    if (p < 1) { this.seek(0); return }
    state.played = 0
    load(state.surah, p)
  },

  seek(seconds) {
    if (!el) return
    el().currentTime = Math.max(0, Math.min(seconds, el().duration || seconds))
    state.time = el().currentTime
    emit()
  },

  setSpeed(speed) {
    state.speed = speed
    if (pair) pair.forEach(a => { a.playbackRate = speed })
    emit()
  },

  setRepeat(repeat) { state.repeat = repeat; state.played = 0; emit() },
  setDelay(seconds) { state.delay = Math.max(0, Number(seconds) || 0); emit() },
  setAutoAdvance(on) { state.autoAdvance = on; emit() },

  // A→B: loop a span of ayahs. Starts playing from the beginning of the span.
  setRange(from, to) {
    if (from == null) { state.range = null; emit(); return }
    if (state.reciter?.mode === 'surah') return
    const lo = Math.min(from, to)
    const hi = Math.max(from, to)
    state.range = { from: lo, to: hi }
    state.played = 0
    emit()
    if (state.surah) load(state.surah, lo)
  },

  clearRange() { state.range = null; emit() },

  stop() {
    clearTimeout(delayTimer)
    state.waiting = false
    el()?.pause()
    if (pair) pair.forEach(a => { a.pause(); a.removeAttribute('src') })
    state = { ...initial, reciter: state.reciter, speed: state.speed }
    emit()
  }
}
