import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { duaCollections, duaCategory } from '../lib/data.js'
import { Screen, Header, Loading, LoadError, Card } from '../components/ui.jsx'
import { useData } from '../lib/useData.js'
import Icon from '../components/Icon.jsx'
import DuaBody from '../components/DuaBody.jsx'
import CollectionScene from '../components/CollectionScene.jsx'

// A collection opens as a list of what is in it, not as the first du'a.
//
// Which is the whole point of it: someone who taps "Anxious or Grieving" wants to
// see that there are six of them and pick, rather than land in the middle of one
// and have to guess whether there is a better one further down.
export default function Collection() {
  const { slug } = useParams()
  const { data: all, error, retry } = useData(duaCollections, [], { label: 'these collections' })
  const [cats, setCats] = useState(null)
  const [open, setOpen] = useState(null)

  const col = all?.collections.find(c => c.slug === slug)

  // The titles come from collections.json so the list draws at once; the duas
  // themselves are fetched alongside, and by the time anything is tapped they
  // are almost always already here.
  useEffect(() => {
    if (!col) return
    let alive = true
    const slugs = [...new Set(col.items.map(i => i.cat))]
    Promise.all(slugs.map(s => duaCategory(s).catch(() => null)))
      .then(loaded => {
        if (!alive) return
        const map = {}
        slugs.forEach((s, i) => {
          if (!loaded[i]) return
          map[s] = Object.fromEntries(loaded[i].items.map(it => [it.id, it]))
        })
        setCats(map)
      })
    return () => { alive = false }
  }, [col])

  if (error) return <LoadError message={error} onRetry={retry} />
  if (!all) return <Loading />

  if (!col) {
    return (
      <Screen>
        <Header title="Not found" back />
        <p className="px-6 py-10 text-center text-sm text-muted">
          There is no collection called “{slug}”.{' '}
          <Link to="/dua" className="text-brand">See all duas</Link>.
        </p>
      </Screen>
    )
  }

  const group = all.groups.find(g => g.id === col.group)

  return (
    <Screen>
      <Header title={col.title} subtitle={`${col.count} ${col.count === 1 ? 'dua' : 'duas'}`} back />

      <div className="px-4 pt-4">
        <div className="relative rounded-2xl overflow-hidden h-28 border border-line">
          <CollectionScene scene={col.scene} className="absolute inset-0 w-full h-full" />
          <div className="absolute inset-0 flex flex-col justify-end p-4 bg-gradient-to-t from-black/55 to-transparent">
            <p className="text-white text-[15px] font-semibold leading-tight">{col.blurb}</p>
            {group && <p className="text-white/70 text-[11px] mt-0.5">{group.label}</p>}
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-2 stagger">
        {col.items.map((it, i) => {
          const key = `${it.cat}/${it.id}`
          const d = cats?.[it.cat]?.[it.id]
          const isOpen = open === key
          return (
            <Card key={key} className="overflow-hidden">
              <button
                onClick={() => setOpen(isOpen ? null : key)}
                aria-expanded={isOpen}
                className="tap w-full text-left px-3 py-3 flex items-center gap-3"
              >
                <span className={`shrink-0 w-8 h-8 rounded-full grid place-items-center text-xs tabular-nums border transition-colors ${
                  isOpen ? 'border-brand bg-brand/15 text-brand' : 'border-line text-muted'
                }`}>{i + 1}</span>
                <span className="flex-1 min-w-0 text-sm leading-snug">{it.title}</span>
                <Icon
                  name="forward" size={14}
                  className={`shrink-0 text-muted transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
                />
              </button>

              {isOpen && (
                <div className="px-4 pb-4 anim-reveal">
                  {d
                    ? <DuaBody d={d} />
                    : <p className="text-xs text-muted py-2">Loading…</p>}
                  {/* Where it sits in the app's own arrangement, for anyone who
                      wants the rest of that section. */}
                  <Link
                    to={`/dua/${it.cat}`}
                    className="tap inline-flex items-center gap-1.5 mt-4 text-[11px] text-muted hover:text-ink"
                  >
                    <Icon name="book" size={12} />See the whole section
                  </Link>
                </div>
              )}
            </Card>
          )
        })}
      </div>

      <p className="px-6 pt-6 text-[11px] text-muted/70 leading-relaxed">
        Grouped this way to make them findable. Every du'a here is the same text,
        with the same source, as it carries in its own section.
      </p>
    </Screen>
  )
}
