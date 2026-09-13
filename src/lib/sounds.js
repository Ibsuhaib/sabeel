// Notification sounds. Three modes, and the user picks:
//
//   'adhan'  — the full call to prayer
//   'beep'   — a short two-tone chime, synthesised here with Web Audio so it
//              costs zero bytes, needs no file and always works offline
//   'silent' — nothing audible; vibration only if that is on too
//
// Browsers block audio until the user has interacted with the page at least
// once, so `prime()` is called from the tap that turns notifications on. That
// unlocks the AudioContext for the rest of the session.
import { get, set } from 'idb-keyval'

// Two independent slots. The Fajr adhan is not the same call: it carries the
// tathwīb — "aṣ-ṣalātu khayrun min an-nawm", prayer is better than sleep —
// after the two "ḥayya ʿala-l-falāḥ", and using a standard recording for Fajr
// is simply the wrong adhan.
const CUSTOM_KEYS = { default: 'adhan.custom', fajr: 'adhan.custom.fajr' }

let ctx = null
let unlocked = false
let current = null   // the <audio> element playing an adhan, so it can be stopped

function audioContext() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  return ctx
}

// Call from a real user gesture. Resumes the context and plays a silent blip,
// which is what actually lifts the autoplay restriction on iOS.
export async function prime() {
  const ac = audioContext()
  if (!ac) return false
  try {
    if (ac.state === 'suspended') await ac.resume()
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    gain.gain.value = 0
    osc.connect(gain).connect(ac.destination)
    osc.start()
    osc.stop(ac.currentTime + 0.01)
    unlocked = true
    return true
  } catch {
    return false
  }
}

export const isUnlocked = () => unlocked

// A calm two-note chime rather than a phone alarm. Prayer is not an emergency.
export function playBeep({ repeats = 2 } = {}) {
  const ac = audioContext()
  if (!ac) return false
  if (ac.state === 'suspended') ac.resume().catch(() => {})

  const now = ac.currentTime
  const notes = [880, 1174.66]   // A5 then D6
  for (let r = 0; r < repeats; r++) {
    notes.forEach((freq, i) => {
      const t = now + r * 0.9 + i * 0.22
      const osc = ac.createOscillator()
      const gain = ac.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, t)
      // Soft attack and a long tail, so it reads as a chime, not a alarm clock.
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.22, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5)
      osc.connect(gain).connect(ac.destination)
      osc.start(t)
      osc.stop(t + 0.55)
    })
  }
  return true
}

export async function customAdhan(slot = 'default') {
  return (await get(CUSTOM_KEYS[slot] || CUSTOM_KEYS.default)) || null
}

export async function setCustomAdhan(file, slot = 'default') {
  const key = CUSTOM_KEYS[slot] || CUSTOM_KEYS.default
  if (!file) { await set(key, null); return null }
  const blob = new Blob([await file.arrayBuffer()], { type: file.type || 'audio/mpeg' })
  const record = { name: file.name, type: blob.type, size: blob.size, blob, slot }
  await set(key, record)
  return record
}

export function stopSound() {
  if (current) {
    current.pause()
    current.removeAttribute('src')
    current = null
  }
}

// Returns the <audio> element so a caller can stop it when the notification is
// dismissed — an adhan should not keep playing after you have acknowledged it.
export async function playAdhan({ adhanFile, useCustom = false, volume = 1, slot = 'default' } = {}) {
  stopSound()
  let src = null

  if (useCustom) {
    const rec = await customAdhan(slot)
    if (rec?.blob) src = URL.createObjectURL(rec.blob)
  }
  if (!src && adhanFile) src = `${import.meta.env.BASE_URL || '/'}adhan/${adhanFile}`.replace(/\/{2,}/g, '/')
  if (!src) return null

  const el = new Audio(src)
  el.volume = Math.max(0, Math.min(1, volume))
  el.addEventListener('ended', () => { if (src.startsWith('blob:')) URL.revokeObjectURL(src) })
  try {
    await el.play()
  } catch {
    // Autoplay blocked — the visual notification still fires, which is the part
    // that matters. Nothing to recover here.
    return null
  }
  current = el
  return el
}

export function vibrate(pattern = [200, 100, 200, 100, 400]) {
  try { return navigator.vibrate?.(pattern) ?? false } catch { return false }
}

// One entry point so callers never have to branch on the mode themselves.
// `prayer` decides which adhan slot is used — Fajr has its own.
export async function playFor(settings, { adhanFile, fajrFile, prayer } = {}) {
  const n = settings.notifications || {}
  if (n.vibrate) vibrate()
  if (n.sound === 'silent') return 'silent'
  if (n.sound === 'beep') return playBeep() ? 'beep' : 'blocked'

  const isFajr = prayer === 'fajr'
  const slot = isFajr ? 'fajr' : 'default'
  const useCustom = isFajr ? !!n.useCustomFajrAdhan : !!n.useCustomAdhan
  const file = isFajr ? (fajrFile || adhanFile) : adhanFile

  const el = await playAdhan({ adhanFile: file, useCustom, volume: n.volume ?? 1, slot })
  return el ? 'adhan' : 'blocked'
}
