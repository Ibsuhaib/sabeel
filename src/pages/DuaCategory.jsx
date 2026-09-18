import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { duaCategory } from '../lib/data.js'
import { Screen, Header, Loading, LoadError, Card, IconButton } from '../components/ui.jsx'
import { useData } from '../lib/useData.js'
import DuaBody from '../components/DuaBody.jsx'

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

      <div className="px-4 pt-4 space-y-3 stagger">
        {cat.items.map(d => {
          const done = counts[d.id] || 0
          const target = d.count || 1
          return (
            <Card key={d.id} className="p-4">
              {d.title && <p className="text-xs font-semibold uppercase tracking-wide text-brand mb-3">{d.title}</p>}

              <DuaBody
                d={d}
                showArabicOnly={showArabicOnly}
                counter={target > 1 ? (
                  <button
                    onClick={() => tick(d.id, target)}
                    className={`tap shrink-0 px-3 py-1.5 rounded-lg text-xs tabular-nums border transition-colors ${
                      done >= target ? 'border-brand bg-brand/15 text-brand' : 'border-line text-muted'
                    }`}
                  >
                    {done} / {target}
                  </button>
                ) : null}
              />
            </Card>
          )
        })}
      </div>
    </Screen>
  )
}
