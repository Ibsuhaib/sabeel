// Recitation streams straight from EveryAyah — we never host a gigabyte of mp3.
// The service worker caches each file on first play, so a surah you have
// listened to once is available offline afterwards.
import { ayahAudioId } from './format.js'

const CDN = 'https://everyayah.com/data'

// Every folder below was verified to resolve before shipping.
export const RECITERS = [
  { id: 'Alafasy_128kbps', name: 'Mishary Rashid Alafasy', style: 'Murattal' },
  { id: 'Abdul_Basit_Murattal_192kbps', name: 'Abdul Basit Abdus Samad', style: 'Murattal' },
  { id: 'Husary_128kbps', name: 'Mahmoud Khalil al-Husary', style: 'Murattal' },
  { id: 'Minshawy_Murattal_128kbps', name: 'Muhammad Siddiq al-Minshawi', style: 'Murattal' },
  { id: 'Abdurrahmaan_As-Sudais_192kbps', name: 'Abdurrahman as-Sudais', style: 'Murattal' },
  { id: 'Saood_ash-Shuraym_128kbps', name: 'Saud ash-Shuraim', style: 'Murattal' },
  { id: 'Hudhaify_128kbps', name: 'Ali al-Hudhaify', style: 'Murattal' },
  { id: 'Ahmed_ibn_Ali_al_Ajamy_128kbps', name: 'Ahmed ibn Ali al-Ajamy', style: 'Murattal' },
  { id: 'Muhammad_Ayyoub_128kbps', name: 'Muhammad Ayyoub', style: 'Murattal' },
  { id: 'MaherAlMuaiqly128kbps', name: 'Maher al-Muaiqly', style: 'Murattal' },
  { id: 'Nasser_Alqatami_128kbps', name: 'Nasser al-Qatami', style: 'Murattal' },
  { id: 'Yasser_Ad-Dussary_128kbps', name: 'Yasser ad-Dussary', style: 'Murattal' },
  { id: 'Mohammad_al_Tablaway_128kbps', name: 'Mohammad al-Tablaway', style: 'Murattal' },
  { id: 'Ghamadi_40kbps', name: 'Saad al-Ghamdi', style: 'Murattal' },
  { id: 'Menshawi_16kbps', name: 'al-Minshawi (light)', style: 'Murattal, low bandwidth' }
]

export const ayahUrl = (reciter, surah, ayah) => `${CDN}/${reciter}/${ayahAudioId(surah, ayah)}.mp3`

export const SPEEDS = [0.75, 1, 1.25, 1.5, 2]

// A tiny state machine over one <audio> element. Handles continuous playback,
// ayah repeat and A→B range repeat without pulling in a media library.
export function createPlayer() {
  const el = new Audio()
  el.preload = 'auto'

  let state = {
    playing: false, surah: null, ayah: null, reciter: null,
    repeatAyah: 1, played: 0, range: null, speed: 1, lastAyah: null
  }
  const listeners = new Set()
  const emit = () => listeners.forEach(fn => fn({ ...state }))

  el.addEventListener('ended', () => {
    if (state.played + 1 < state.repeatAyah) {
      state.played++
      el.currentTime = 0
      el.play().catch(() => {})
      emit()
      return
    }
    state.played = 0
    const next = state.ayah + 1
    const endOfRange = state.range && next > state.range.to
    const endOfSurah = state.lastAyah && next > state.lastAyah

    if (endOfRange) return play(state.surah, state.range.from)
    if (endOfSurah) { state.playing = false; emit(); return }
    play(state.surah, next)
  })

  el.addEventListener('play', () => { state.playing = true; emit() })
  el.addEventListener('pause', () => { state.playing = false; emit() })
  el.addEventListener('error', () => { state.playing = false; emit() })

  function play(surah, ayah) {
    state.surah = surah
    state.ayah = ayah
    el.src = ayahUrl(state.reciter, surah, ayah)
    el.playbackRate = state.speed
    el.play().catch(() => { state.playing = false; emit() })
    emit()
  }

  return {
    subscribe(fn) { listeners.add(fn); fn({ ...state }); return () => listeners.delete(fn) },
    configure(patch) { Object.assign(state, patch); if (patch.speed) el.playbackRate = patch.speed; emit() },
    play,
    toggle(surah, ayah) {
      if (state.playing && state.surah === surah && state.ayah === ayah) { el.pause(); return }
      if (!state.playing && state.surah === surah && state.ayah === ayah && el.src) { el.play().catch(() => {}); return }
      play(surah, ayah)
    },
    pause() { el.pause() },
    stop() { el.pause(); el.removeAttribute('src'); state.playing = false; state.ayah = null; emit() },
    get state() { return { ...state } }
  }
}
