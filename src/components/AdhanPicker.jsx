import { useEffect, useRef, useState } from 'react'
import { prime, playAdhan, stopSound, setCustomAdhan, customAdhan } from '../lib/sounds.js'
import { Card, Button } from './ui.jsx'
import Icon from './Icon.jsx'

// One adhan slot. There are two of them — the ordinary call, and Fajr, which
// is a different adhan and not merely the same one earlier in the day.
export default function AdhanPicker({
  slot = 'default', title, note, adhans,
  selectedId, useCustom, onSelect, onUseCustom, onMessage
}) {
  const [custom, setCustom] = useState(null)
  const [playing, setPlaying] = useState(null)
  const fileRef = useRef(null)

  useEffect(() => { customAdhan(slot).then(setCustom) }, [slot])
  useEffect(() => () => stopSound(), [])

  async function preview(id) {
    await prime()
    stopSound()
    if (playing === id) { setPlaying(null); return }
    const isCustom = id === 'custom'
    const file = isCustom ? null : adhans?.find(a => a.id === id)?.file
    const el = await playAdhan({ adhanFile: file, useCustom: isCustom, slot, volume: 1 })
    if (!el) {
      onMessage?.({ tone: 'warn', text: 'The browser blocked audio. Tap the page once, then try again.' })
      return
    }
    setPlaying(id)
    el.addEventListener('ended', () => setPlaying(null))
  }

  async function pickFile(file) {
    if (!file) return
    if (!file.type.startsWith('audio/')) { onMessage?.({ tone: 'warn', text: 'That is not an audio file.' }); return }
    if (file.size > 12 * 1024 * 1024) { onMessage?.({ tone: 'warn', text: 'Please choose a file under 12 MB.' }); return }
    const rec = await setCustomAdhan(file, slot)
    setCustom(rec)
    onUseCustom(true)
    onMessage?.({ tone: 'ok', text: `Using “${rec.name}” for ${title.toLowerCase()}. It stays on this device.` })
  }

  return (
    <Card className="mx-4 p-4">
      <div className="flex items-start gap-2 mb-3">
        <Icon name={slot === 'fajr' ? 'sunrise' : 'prayer'} size={16} className="text-brand shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{title}</p>
          {note && <p className="text-[11px] text-muted mt-0.5 leading-relaxed">{note}</p>}
        </div>
      </div>

      <div className="space-y-2">
        {(adhans || []).map(a => {
          const active = !useCustom && selectedId === a.id
          return (
            <div
              key={a.id}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border ${
                active ? 'border-brand bg-brand/10' : 'border-line bg-bg'
              }`}
            >
              <button
                onClick={() => { onSelect(a.id); onUseCustom(false) }}
                className="tap flex-1 min-w-0 text-left"
              >
                <span className="block text-sm truncate">{a.muadhdhin}</span>
                <span className="block text-[11px] text-muted truncate">{a.licence} · {a.attribution.split(',')[1]?.trim() || 'Wikimedia Commons'}</span>
              </button>
              <button
                onClick={() => preview(a.id)}
                className={`tap p-2 rounded-lg shrink-0 ${playing === a.id ? 'text-brand' : 'text-muted'}`}
                aria-label={playing === a.id ? 'Stop preview' : `Preview ${a.muadhdhin}`}
              >
                <Icon name={playing === a.id ? 'pause' : 'play'} size={16} />
              </button>
            </div>
          )
        })}

        {/* Your own file — the only way to use a muadhdhin whose recording we
            cannot legally redistribute, which is most of the famous ones. */}
        <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border ${
          useCustom && custom ? 'border-brand bg-brand/10' : 'border-line bg-bg'
        }`}>
          <button
            onClick={() => { if (custom) onUseCustom(true); else fileRef.current?.click() }}
            className="tap flex-1 min-w-0 text-left"
          >
            <span className="block text-sm truncate">{custom ? custom.name : 'Use your own recording'}</span>
            <span className="block text-[11px] text-muted truncate">
              {custom ? `${(custom.size / 1024 / 1024).toFixed(1)} MB · on this device only` : 'Choose an audio file from this phone'}
            </span>
          </button>
          {custom && (
            <button
              onClick={() => preview('custom')}
              className={`tap p-2 rounded-lg shrink-0 ${playing === 'custom' ? 'text-brand' : 'text-muted'}`}
              aria-label="Preview your recording"
            >
              <Icon name={playing === 'custom' ? 'pause' : 'play'} size={16} />
            </button>
          )}
          <button
            onClick={() => fileRef.current?.click()}
            className="tap p-2 rounded-lg text-muted shrink-0"
            aria-label={custom ? 'Replace file' : 'Choose a file'}
          >
            <Icon name="download" size={16} />
          </button>
        </div>

        <input
          ref={fileRef} type="file" accept="audio/*" className="hidden"
          onChange={e => { pickFile(e.target.files?.[0]); e.target.value = '' }}
        />

        {custom && (
          <Button
            variant="ghost" size="sm"
            onClick={async () => { await setCustomAdhan(null, slot); setCustom(null); onUseCustom(false) }}
          >
            Remove your file
          </Button>
        )}
      </div>
    </Card>
  )
}
