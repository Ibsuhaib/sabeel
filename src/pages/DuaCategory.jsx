import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { duaCategory } from '../lib/data.js'
import { Screen, Header, Loading, LoadError, Card, IconButton } from '../components/ui.jsx'
import { useData } from '../lib/useData.js'
import Icon from '../components/Icon.jsx'

export default function DuaCategory() {
  const { slug } = useParams()
  const { data: cat, error, retry } = useData(() => duaCategory(slug), [slug], { label: 'these duas' })
  const [counts, setCounts] = useState({})
  const [showArabicOnly, setShowArabicOnly] = useState(false)

  if (error) return <LoadError message={error} onRetry={retry} />
  if (!cat) return <Loading />

  const tick = (id, target) => {
    const next = ((counts[id] || 0) + 1) % (target + 1)
    setCounts(c => ({ ...c, [id]: next }))
    if (navigator.vibrate) navigator.vibrate(next === target ? [30, 40, 30] : 12)
  }

  return (
    <Screen>
      <Header
        title={cat.title}
        subtitle={`${cat.blurb} · ${cat.items.length} entries`}
        back
        actions={
          <IconButton
            name="dua" label={showArabicOnly ? 'Show translation' : 'Arabic only'}
            onClick={() => setShowArabicOnly(v => !v)} active={showArabicOnly}
          />
        }
      />

      <div className="px-4 pt-4 space-y-3">
        {cat.items.map(d => {
          const done = counts[d.id] || 0
          const target = d.count || 1
          return (
            <Card key={d.id} className="p-4">
              {d.title && <p className="text-xs font-semibold uppercase tracking-wide text-brand mb-3">{d.title}</p>}

              <p className="ar ar-sm">{d.ar}</p>

              {!showArabicOnly && (
                <>
                  {d.tr && <p className="text-[13px] text-muted italic mt-3 leading-relaxed">{d.tr}</p>}
                  {d.en && <p className="translation mt-3 text-ink/85">{d.en}</p>}
                </>
              )}

              {d.benefits && !showArabicOnly && (
                <p className="text-xs text-muted mt-3 bg-bg border border-line rounded-xl px-3 py-2 leading-relaxed">
                  <Icon name="info" size={12} className="inline mr-1.5 -mt-0.5" />{d.benefits}
                </p>
              )}

              {/* Where an entry has no recorded source, nothing is shown in its place —
                  no divider, no note. The footer only exists when it has something
                  to carry. */}
              {(d.source || target > 1) && (
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-line/60">
                  {d.source ? (
                    <span className="text-[11px] text-muted flex items-center gap-1.5 flex-1 min-w-0">
                      <Icon name="book" size={12} className="shrink-0" />
                      <span className="truncate">{d.source}</span>
                    </span>
                  ) : (
                    <span className="flex-1" />
                  )}

                  {target > 1 && (
                    <button
                      onClick={() => tick(d.id, target)}
                      className={`tap shrink-0 px-3 py-1.5 rounded-lg text-xs tabular-nums border transition-colors ${
                        done >= target ? 'border-brand bg-brand/15 text-brand' : 'border-line text-muted'
                      }`}
                    >
                      {done} / {target}
                    </button>
                  )}
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </Screen>
  )
}
