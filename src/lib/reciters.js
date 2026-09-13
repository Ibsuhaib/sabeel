import { useEffect, useState } from 'react'
import { player } from './audio.js'
import { reciterCatalogue } from './data.js'

let cache = null

export async function loadReciters() {
  if (!cache) cache = await reciterCatalogue()
  return cache
}

export function allReciters(cat) {
  return [...cat.perAyah, ...cat.surah]
}

export function findReciter(cat, id) {
  return allReciters(cat).find(r => r.id === id) || cat.perAyah[0]
}

// Haramain first — it is what most people are looking for — then everyone else
// alphabetically. Within a masjid, per-ayah reciters come first because they are
// the ones the ayah controls actually work with.
export function groupReciters(cat) {
  const all = allReciters(cat)
  const byMasjid = m => all
    .filter(r => r.masjid === m)
    .sort((a, b) => (a.mode === b.mode ? a.name.localeCompare(b.name) : a.mode === 'ayah' ? -1 : 1))

  return [
    { id: 'haram', label: cat.masjids.haram.label, reciters: byMasjid('haram') },
    { id: 'nabawi', label: cat.masjids.nabawi.label, reciters: byMasjid('nabawi') },
    { id: 'other', label: 'Other reciters', reciters: all.filter(r => !r.masjid).sort((a, b) => a.name.localeCompare(b.name)) }
  ].filter(g => g.reciters.length)
}

export function usePlayer() {
  const [state, setState] = useState(player.state)
  useEffect(() => player.subscribe(setState), [])
  return state
}

// Keeps the global player pointed at whichever reciter the settings say, without
// interrupting playback that is already using that reciter.
export function useReciterSync(reciterId) {
  const [catalogue, setCatalogue] = useState(null)

  useEffect(() => { loadReciters().then(setCatalogue) }, [])

  useEffect(() => {
    if (!catalogue) return
    const wanted = findReciter(catalogue, reciterId)
    if (player.state.reciter?.id !== wanted.id) player.setReciter(wanted)
  }, [catalogue, reciterId])

  return catalogue
}

export function fmtClock(seconds) {
  if (!seconds || Number.isNaN(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}
