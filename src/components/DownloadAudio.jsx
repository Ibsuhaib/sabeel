import { useCallback, useEffect, useRef, useState } from 'react'
import {
  urlsForSurah, cachedStatus, download, remove,
  estimateBytes, fmtBytes, requestPersistence, isPersisted
} from '../lib/offlineAudio.js'
import { Sheet, Button } from './ui.jsx'
import Icon from './Icon.jsx'

// The download control that sits in the reader header. Shows, at a glance,
// whether this surah is on the device for the reciter you are actually using —
// because "downloaded" is per reciter, and that trips people up otherwise.
export default function DownloadAudio({ reciter, surah, ayahCount, surahName }) {
  const [status, setStatus] = useState(null)
  const [progress, setProgress] = useState(null)
  const [open, setOpen] = useState(false)
  const abort = useRef(null)

  const urls = reciter ? urlsForSurah(reciter, surah, ayahCount) : []

  const refresh = useCallback(() => {
    if (!urls.length) return
    cachedStatus(urls).then(setStatus)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reciter?.id, surah, ayahCount])

  useEffect(() => { refresh() }, [refresh])

  // Playing also fills the cache, so keep the badge honest while you listen.
  useEffect(() => {
    if (progress) return
    const t = setInterval(refresh, 8000)
    return () => clearInterval(t)
  }, [refresh, progress])

  async function start() {
    if (!reciter) return
    await requestPersistence()
    abort.current = new AbortController()
    setProgress({ done: 0, total: urls.length, bytes: 0, failed: 0 })
    const result = await download(urls, { onProgress: setProgress, signal: abort.current.signal })
    setProgress(null)
    abort.current = null
    refresh()
    if (result?.failed) {
      // Partial is still useful — say so rather than calling it a failure.
      setStatus(s => s && { ...s, note: `${result.failed} file${result.failed === 1 ? '' : 's'} could not be fetched. Tap again to retry those.` })
    }
  }

  function cancel() {
    abort.current?.abort()
    abort.current = null
    setProgress(null)
    refresh()
  }

  async function erase() {
    await remove(urls)
    refresh()
    setOpen(false)
  }

  if (!reciter || !urls.length) return null

  const pct = progress ? Math.round((progress.done / progress.total) * 100) : 0
  const partial = status && status.cached > 0 && !status.complete

  return (
    <>
      <button
        onClick={() => (progress ? cancel() : setOpen(true))}
        aria-label={
          progress ? `Downloading, ${pct}% — tap to cancel`
            : status?.complete ? 'Saved on this device'
            : 'Download this surah for offline'
        }
        className={`tap relative p-2 rounded-full transition-colors ${
          status?.complete ? 'text-brand' : progress ? 'text-gold' : 'text-muted hover:text-ink'
        }`}
      >
        <Icon name={status?.complete ? 'check' : 'download'} size={20} />
        {progress && (
          <span className="absolute inset-0 grid place-items-center">
            <svg viewBox="0 0 36 36" className="w-8 h-8 -rotate-90">
              <circle cx="18" cy="18" r="16" fill="none" stroke="rgb(var(--c-line))" strokeWidth="2.5" />
              <circle
                cx="18" cy="18" r="16" fill="none" stroke="rgb(var(--c-gold))" strokeWidth="2.5"
                strokeLinecap="round" strokeDasharray={2 * Math.PI * 16}
                strokeDashoffset={2 * Math.PI * 16 * (1 - pct / 100)}
              />
            </svg>
          </span>
        )}
        {!progress && partial && (
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-gold" />
        )}
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title={`${surahName} · offline audio`}>
        <div className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-10 h-10 rounded-xl bg-brand/10 text-brand grid place-items-center shrink-0">
              <Icon name={status?.complete ? 'check' : 'download'} size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{reciter.name}</p>
              <p className="text-[11px] text-muted tabular-nums">
                {status
                  ? status.complete
                    ? `All ${status.total} file${status.total === 1 ? '' : 's'} saved on this device`
                    : `${status.cached} of ${status.total} saved · about ${fmtBytes(estimateBytes(reciter, ayahCount))} in total`
                  : 'Checking…'}
              </p>
            </div>
          </div>

          {status?.note && (
            <p className="text-[11px] text-amber-500 mb-3 leading-relaxed">{status.note}</p>
          )}

          <p className="text-xs text-muted leading-relaxed mb-4">
            Anything you listen to is saved automatically. Downloading fetches the whole surah now,
            so it plays with no signal at all. It is stored by your browser on this device — nothing
            is uploaded, and it counts against this app's storage, not your photo roll.
          </p>

          {progress ? (
            <>
              <div className="h-1.5 bg-line rounded-full overflow-hidden">
                <div className="h-full bg-gold transition-all" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-[11px] text-muted mt-2 tabular-nums">
                {progress.done} of {progress.total} · {fmtBytes(progress.bytes)}
                {progress.failed > 0 && ` · ${progress.failed} failed`}
              </p>
              <Button variant="soft" size="lg" className="mt-3" onClick={cancel}>Cancel</Button>
            </>
          ) : (
            <div className="space-y-2">
              {!status?.complete && (
                <Button size="lg" onClick={start}>
                  <Icon name="download" size={16} />
                  {partial ? `Finish downloading (${status.total - status.cached} left)` : 'Download this surah'}
                </Button>
              )}
              {status?.cached > 0 && (
                <Button variant="soft" size="lg" onClick={erase}>
                  <Icon name="close" size={15} />Remove from this device
                </Button>
              )}
            </div>
          )}

          <PersistenceNote />
        </div>
      </Sheet>
    </>
  )
}

function PersistenceNote() {
  const [persisted, setPersisted] = useState(null)
  useEffect(() => { isPersisted().then(setPersisted) }, [])
  if (persisted !== false) return null
  return (
    <p className="text-[11px] text-muted/70 mt-4 leading-relaxed">
      <Icon name="info" size={12} className="inline mr-1 -mt-0.5" />
      Your browser has not marked this storage as permanent, so it may clear downloads if the
      device runs low on space. Installing Sabeel to your home screen usually fixes that.
    </p>
  )
}
