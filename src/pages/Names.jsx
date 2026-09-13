import { useEffect, useMemo, useState } from 'react'
import { asmaUlHusna } from '../lib/data.js'
import { Screen, Header, Loading, LoadError, Card } from '../components/ui.jsx'
import { useData } from '../lib/useData.js'

export default function Names() {
  const { data, error, retry } = useData(asmaUlHusna, [], { label: 'the 99 Names' })
  const [q, setQ] = useState('')

  const list = useMemo(() => {
    if (!data) return []
    const needle = q.trim().toLowerCase()
    if (!needle) return data.names
    return data.names.filter(n =>
      n.tr.toLowerCase().includes(needle) ||
      n.en.toLowerCase().includes(needle) ||
      n.ar.includes(q.trim())
    )
  }, [data, q])

  if (error) return <LoadError message={error} onRetry={retry} />
  if (!data) return <Loading />

  return (
    <Screen>
      <Header title="99 Names of Allah" subtitle="Asma ul-Husna" back />

      <div className="px-4 pt-3">
        <input
          value={q} onChange={e => setQ(e.target.value)}
          placeholder="Search by name or meaning"
          className="w-full px-4 py-2.5 rounded-xl bg-surf border border-line text-sm outline-none focus:border-brand"
        />
      </div>

      <div className="px-4 mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {list.map(n => (
          <Card key={n.n} className="p-4 flex items-center gap-4">
            <span className="w-8 shrink-0 text-xs tabular-nums text-muted/60">{n.n}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{n.tr}</p>
              <p className="text-xs text-muted mt-0.5">{n.en}</p>
            </div>
            <p className="ar text-brand shrink-0" style={{ fontSize: 24, lineHeight: 1.8 }}>{n.ar}</p>
          </Card>
        ))}
      </div>

      {list.length === 0 && <p className="text-center text-sm text-muted py-12">No name matches “{q}”.</p>}

      <p className="text-[11px] text-muted/70 text-center px-10 mt-8 leading-relaxed">
        Meanings in English are approximations. The Arabic carries what a translation cannot.
      </p>
    </Screen>
  )
}
