import { useCallback, useEffect, useRef, useState } from 'react'
import { useSettings } from '../lib/settings.jsx'
import { quranMeta } from '../lib/data.js'
import { loadReciters, findReciter } from '../lib/reciters.js'
import {
  inventory, matchReciter, removeReciter, clearAll, storage,
  urlsForSurah, download, fmtBytes, estimateBytes,
  isPersisted, requestPersistence
} from '../lib/offlineAudio.js'
import { Screen, Header, Card, Section, Loading, Button, Empty } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'

// Everything the app has put on the device, and the controls to add to it or
// take it back. Storage on a phone is finite and recitation is by far the
// largest thing here, so this screen exists to make that visible rather than
// letting the app quietly fill someone's device.
export default function OfflineAudio() {
  const { settings } = useSettings()
  const [inv, setInv] = useState(null)
  const [catalogue, setCatalogue] = useState(null)
  const [meta, setMeta] = useState(null)
  const [space, setSpace] = useState(null)
  const [persisted, setPersisted] = useState(null)
  const [bulk, setBulk] = useState(null)
  const abort = useRef(null)

  const refresh = useCallback(() => {
    inventory().then(setInv)
    storage().then(setSpace)
    isPersisted().then(setPersisted)
  }, [])

  useEffect(() => {
    refresh()
    loadReciters().then(setCatalogue)
    quranMeta().then(setMeta)
  }, [refresh])

  useEffect(() => () => abort.current?.abort(), [])

  if (!inv || !catalogue || !meta) return <Loading label="Checking what is saved" />

  const current = findReciter(catalogue, settings.reciter)
  const entries = Object.entries(inv.reciters)
    .map(([key, v]) => ({
      key,
      reciter: matchReciter(catalogue, key),
      surahs: Object.entries(v.surahs).map(([n, files]) => ({ n: Number(n), files })).sort((a, b) => a.n - b.n),
      mode: v.mode
    }))
    .filter(e => e.surahs.length)
    .sort((a, b) => (b.surahs.length - a.surahs.length))

  // Downloading the entire Quran for one reciter — offered, but with the real
  // size in front of you first.
  async function downloadAll() {
    const total = meta.surahs.reduce((a, s) => a + s.ayahs, 0)
    const bytes = estimateBytes(current, total)
    const ok = confirm(
      `Download the whole Quran recited by ${current.name}?\n\n` +
      `That is ${total.toLocaleString()} files, roughly ${fmtBytes(bytes)}. ` +
      `Use Wi-Fi, and keep Sabeel open while it runs.`
    )
    if (!ok) return

    abort.current = new AbortController()
    const urls = meta.surahs.flatMap(s => urlsForSurah(current, s.n, s.ayahs))
    setBulk({ done: 0, total: urls.length, bytes: 0, failed: 0 })
    await download(urls, { onProgress: setBulk, signal: abort.current.signal })
    setBulk(null)
    abort.current = null
    refresh()
  }

  const pct = bulk ? Math.round((bulk.done / bulk.total) * 100) : 0

  return (
    <Screen>
      <Header title="Offline audio" subtitle="Recitation saved on this device" back />

      {space && (
        <div className="px-4 pt-4">
          <Card className="p-4">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-sm font-medium">Storage used by Sabeel</span>
              <span className="text-sm text-brand tabular-nums">{fmtBytes(space.usage)}</span>
            </div>
            <div className="h-1.5 bg-line rounded-full overflow-hidden">
              <div className="h-full bg-brand" style={{ width: `${Math.min(100, space.percent)}%` }} />
            </div>
            <p className="text-[11px] text-muted mt-2 tabular-nums">
              {fmtBytes(space.quota)} available to this app · {inv.files.toLocaleString()} audio file{inv.files === 1 ? '' : 's'} saved
            </p>
            {persisted === false && (
              <div className="mt-3 pt-3 border-t border-line">
                <p className="text-[11px] text-muted leading-relaxed mb-2">
                  This storage is not marked permanent, so Android may clear it when space runs low.
                </p>
                <Button
                  variant="soft" size="sm"
                  onClick={async () => { await requestPersistence(); setPersisted(await isPersisted()) }}
                >
                  Ask to keep it permanently
                </Button>
              </div>
            )}
            {persisted === true && (
              <p className="text-[11px] text-brand mt-2 flex items-center gap-1.5">
                <Icon name="check" size={12} />Marked permanent — downloads will not be cleared automatically
              </p>
            )}
          </Card>
        </div>
      )}

      <Section title="How it works">
        <Card className="mx-4 p-4">
          <p className="text-xs text-muted leading-relaxed">
            <strong className="text-ink">Anything you listen to is saved automatically.</strong>{' '}
            Play an ayah once and it stays on the device — the next time it plays with no signal at
            all. Downloading a surah simply fetches the whole thing ahead of time.
          </p>
          <p className="text-xs text-muted leading-relaxed mt-2">
            Downloads are per reciter. Switching reciter means the new one is downloaded separately.
          </p>
        </Card>
      </Section>

      <Section title={`Download for ${current?.name || 'this reciter'}`}>
        <div className="px-4">
          {bulk ? (
            <Card className="p-4">
              <div className="h-1.5 bg-line rounded-full overflow-hidden">
                <div className="h-full bg-gold transition-all" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-[11px] text-muted mt-2 tabular-nums">
                {bulk.done.toLocaleString()} of {bulk.total.toLocaleString()} · {fmtBytes(bulk.bytes)}
                {bulk.failed > 0 && ` · ${bulk.failed} failed`}
              </p>
              <Button variant="soft" size="lg" className="mt-3" onClick={() => { abort.current?.abort(); setBulk(null); refresh() }}>
                Stop
              </Button>
            </Card>
          ) : (
            <Button variant="soft" size="lg" onClick={downloadAll} disabled={!current}>
              <Icon name="download" size={16} />Download the whole Quran
            </Button>
          )}
          <p className="text-[11px] text-muted/70 mt-2 leading-relaxed">
            Large — use Wi-Fi. To save just one surah, use the download button in the reader.
          </p>
        </div>
      </Section>

      <Section title="Saved on this device">
        {entries.length === 0 ? (
          <Empty
            icon="download" title="Nothing saved yet"
            body="Play any ayah and it is kept automatically, or download a surah from the reader."
            action={<Button to="/quran">Open the Quran</Button>}
          />
        ) : (
          <div className="px-4 space-y-2">
            {entries.map(e => {
              const files = e.surahs.reduce((a, s) => a + s.files, 0)
              return (
                <Card key={e.key} className="p-4">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-xl bg-brand/10 text-brand grid place-items-center shrink-0">
                      <Icon name="play" size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{e.reciter?.name || e.key}</p>
                      <p className="text-[11px] text-muted tabular-nums">
                        {e.surahs.length} surah{e.surahs.length === 1 ? '' : 's'} · {files.toLocaleString()} file{files === 1 ? '' : 's'}
                        {e.mode === 'surah' && ' · full-surah recording'}
                      </p>
                    </div>
                    <button
                      onClick={async () => { await removeReciter(e.key); refresh() }}
                      className="tap p-2 rounded-lg text-muted hover:text-red-400"
                      aria-label={`Remove ${e.reciter?.name || e.key}`}
                    >
                      <Icon name="close" size={16} />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1 mt-3">
                    {e.surahs.slice(0, 24).map(s => {
                      const info = meta.surahs.find(x => x.n === s.n)
                      const whole = e.mode === 'surah' || (info && s.files >= info.ayahs)
                      return (
                        <span
                          key={s.n}
                          title={`${info?.en || 'Surah ' + s.n} — ${s.files}${info ? ' of ' + info.ayahs : ''} files`}
                          className={`px-1.5 py-0.5 rounded text-[10px] tabular-nums border ${
                            whole ? 'border-brand/40 text-brand' : 'border-line text-muted'
                          }`}
                        >{s.n}</span>
                      )
                    })}
                    {e.surahs.length > 24 && (
                      <span className="px-1.5 py-0.5 text-[10px] text-muted">+{e.surahs.length - 24} more</span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted/60 mt-2">
                    Green means the whole surah is saved; grey means only the ayahs you have played.
                  </p>
                </Card>
              )
            })}
          </div>
        )}
      </Section>

      {entries.length > 0 && (
        <div className="px-4 mt-6">
          <Button
            variant="danger" size="lg"
            onClick={async () => {
              if (!confirm('Delete every downloaded recitation? Your bookmarks, notes and prayer log are not affected.')) return
              await clearAll()
              refresh()
            }}
          >
            Delete all downloaded audio
          </Button>
        </div>
      )}

      <p className="text-[11px] text-muted/70 text-center px-8 mt-8 leading-relaxed">
        Audio streams from EveryAyah and mp3quran and is cached on your device as you listen.
        Sabeel hosts no audio and tracks nothing about what you play.
      </p>
    </Screen>
  )
}
