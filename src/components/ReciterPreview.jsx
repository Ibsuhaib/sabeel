import { useEffect, useState } from 'react'
import Icon from './Icon.jsx'
import { ayahUrl, surahUrl } from '../lib/audio.js'

// Listen to a reciter before choosing one.
//
// The picker is a list of forty-two names, and a name is not something most
// people can choose between — you know a reciter by the sound of them. So each
// row plays a few seconds, and the choice becomes one anybody can make.
//
// Al-Fātiḥah is the sample deliberately: it is the one passage every Muslim
// knows by heart, so the ear has something to compare against rather than
// hearing an unfamiliar āyah in an unfamiliar voice. For a reciter published
// āyah by āyah that is a few seconds; for one published only whole-surah it is
// the shortest file there is.

// One at a time. A list where every row can start its own audio ends up with
// several reciters going at once, which is the opposite of letting someone
// compare them.
let current = null
let listeners = new Set()

function stopAll() {
  if (current) { try { current.el.pause() } catch { /* already gone */ } }
  current = null
  listeners.forEach(fn => fn(null))
}

export function stopPreview() { stopAll() }

export default function ReciterPreview({ reciter, className = '' }) {
  const [state, setState] = useState('idle')   // idle | loading | playing

  useEffect(() => {
    const fn = id => setState(id === reciter.id ? 'playing' : 'idle')
    listeners.add(fn)
    return () => { listeners.delete(fn) }
  }, [reciter.id])

  // Leaving the screen should not leave a voice playing behind it.
  useEffect(() => () => { if (current?.id === reciter.id) stopAll() }, [reciter.id])

  async function toggle(e) {
    e.stopPropagation()
    if (current?.id === reciter.id) { stopAll(); return }
    stopAll()
    setState('loading')

    const url = reciter.mode === 'surah' ? surahUrl(reciter, 1) : ayahUrl(reciter, 1, 1)
    const el = new Audio(url)
    el.preload = 'auto'
    current = { id: reciter.id, el }

    el.addEventListener('ended', () => { if (current?.id === reciter.id) stopAll() })
    el.addEventListener('error', () => {
      if (current?.id === reciter.id) { current = null; setState('idle') }
    })

    try {
      await el.play()
      if (current?.id === reciter.id) { listeners.forEach(fn => fn(reciter.id)) }
    } catch {
      // Autoplay refused, or there is no connection — recitation streams, and
      // this may well be someone's first run with no signal yet.
      if (current?.id === reciter.id) { current = null; setState('idle') }
    }
  }

  const playing = state === 'playing'
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={playing ? `Stop ${reciter.name}` : `Listen to ${reciter.name}`}
      className={`tap shrink-0 w-10 h-10 rounded-full grid place-items-center border transition-colors ${
        playing ? 'border-brand bg-brand/15 text-brand' : 'border-line text-muted'
      } ${className}`}
    >
      {state === 'loading'
        ? <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
        : <Icon name={playing ? 'pause' : 'play'} size={15} />}
    </button>
  )
}
