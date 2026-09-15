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

const EVERY_AYAH = 'https://everyayah.com/data'

export const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2]
export const REPEATS = [1, 2, 3, 5, 7, 10, Infinity]
// A pause between ayahs, for repeating after the reciter while memorising.
export const DELAYS = [0, 1, 2, 3, 5, 8]

export const ayahFileId = (surah, ayah) =>
  `${String(surah).padStart(3, '0')}${String(ayah).padStart(3, '0')}`

export function ayahUrl(reciter, surah, ayah) {
  return `${EVERY_AYAH}/${reciter.id}/${ayahFileId(surah, ayah)}.mp3`
}

export function surahUrl(reciter, surah) {
  return `${reciter.server}/${String(surah).padStart(3, '0')}.mp3`
}

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
  delay: 0,            // seconds of silence before the next ayah
  waiting: false       // sitting in that silence right now
}

let state = { ...initial }
let el = null
let delayTimer = null
const listeners = new Set()

function emit() {
  const snapshot = { ...state }
  listeners.forEach(fn => fn(snapshot))
}

function audio() {
  if (el) return el
  el = new Audio()
  el.preload = 'auto'

  el.addEventListener('play', () => { state.playing = true; state.error = null; emit() })
  el.addEventListener('pause', () => { state.playing = false; emit() })
  el.addEventListener('waiting', () => { state.loading = true; emit() })
  el.addEventListener('playing', () => { state.loading = false; emit() })
  el.addEventListener('loadedmetadata', () => {
    state.duration = el.duration || 0
    state.loading = false
    emit()
  })
  el.addEventListener('timeupdate', () => {
    state.time = el.currentTime || 0
    emit()
  })
  el.addEventListener('error', () => {
    state.loading = false
    state.playing = false
    state.error = 'Could not load this recitation. Check your connection, or try another reciter.'
    emit()
  })
  el.addEventListener('ended', onEnded)
  return el
}

function onEnded() {
  if (state.reciter?.mode === 'surah') {
    // A whole surah just finished. Repeat it, or stop.
    if (state.played + 1 < state.repeat) {
      state.played++
      el.currentTime = 0
      el.play().catch(() => {})
      emit()
      return
    }
    state.played = 0
    state.playing = false
    emit()
    return
  }

  // Per-ayah: repeat this ayah first.
  if (state.played + 1 < state.repeat) {
    state.played++
    el.currentTime = 0
    el.play().catch(() => {})
    emit()
    return
  }
  state.played = 0

  if (!state.autoAdvance) { state.playing = false; emit(); return }

  const next = state.ayah + 1
  const target = (state.range && next > state.range.to) ? state.range.from
    : (state.lastAyah && next > state.lastAyah) ? null
    : next

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

function load(surah, ayah, { autoplay = true } = {}) {
  // Every transport control routes through here, so this is the one place that
  // needs to know a reciter has actually been chosen. Without it, pressing next
  // before the catalogue has loaded throws.
  if (!state.reciter || !surah) return
  const a = audio()
  state.surah = surah
  state.ayah = ayah
  state.time = 0
  state.duration = 0
  state.loading = true
  state.error = null

  a.src = state.reciter.mode === 'surah'
    ? surahUrl(state.reciter, surah)
    : ayahUrl(state.reciter, surah, ayah)
  a.playbackRate = state.speed

  if (autoplay) a.play().catch(() => { state.playing = false; state.loading = false; emit() })
  emit()
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
    if (lastAyah) state.lastAyah = lastAyah
    state.played = 0
    load(surah, ayah)
  },

  toggle(surah, ayah, lastAyah) {
    if (!state.reciter) return
    const same = state.surah === surah && (state.reciter.mode === 'surah' || state.ayah === ayah)
    if (same && state.playing) { audio().pause(); return }
    if (same && el?.src) { audio().play().catch(() => {}); return }
    this.play(surah, ayah, lastAyah)
  },

  pause() { clearTimeout(delayTimer); state.waiting = false; el?.pause(); emit() },
  resume() { el?.play().catch(() => {}) },

  playPause() {
    if (!el?.src) return
    if (state.playing) el.pause()
    else el.play().catch(() => {})
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
    el.currentTime = Math.max(0, Math.min(seconds, el.duration || seconds))
    state.time = el.currentTime
    emit()
  },

  setSpeed(speed) {
    state.speed = speed
    if (el) el.playbackRate = speed
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
    el?.pause()
    if (el) el.removeAttribute('src')
    state = { ...initial, reciter: state.reciter, speed: state.speed }
    emit()
  }
}
