import { Link } from 'react-router-dom'
import { duaIndex, duaCollections } from '../lib/data.js'
import { useData } from '../lib/useData.js'
import { Screen, Header, Loading, LoadError, Card, Section, IconButton } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import CollectionScene from '../components/CollectionScene.jsx'

// Tools that are not a list of duas but belong on this screen — reached far more
// often than anything buried in a menu.
const TOOLS = [
  { to: '/dua/tasbih', icon: 'counter', label: 'Tasbih', note: 'Counter with haptics' },
  { to: '/dua/names', icon: 'star', label: '99 Names', note: 'Asma ul-Husna' },
  { to: '/qibla', icon: 'compass', label: 'Qibla', note: 'Direction of the Kaaba' },
  { to: '/search?tab=dua', icon: 'search', label: 'Search duas', note: 'By word or situation' }
]

export default function DuaIndex() {
  const { data: idx, error, retry } = useData(duaIndex, [], { label: 'the dua list' })
  const { data: cols } = useData(duaCollections, [], { label: 'the collections' })
  if (error) return <LoadError message={error} onRetry={retry} back={false} />
  if (!idx) return <Loading />

  const total = idx.categories.reduce((a, c) => a + c.count, 0)

  return (
    <Screen>
      <Header
        title="Dua & Dhikr"
        subtitle={`${total} supplications from the Quran and Sunnah`}
        large
        actions={<IconButton name="search" label="Search duas" to="/search?tab=dua" />}
      />

      {/* The same duas, reachable by when you need one rather than by which
          book it is in. Both ways in are real: the sections below are the
          sources' own arrangement, this is an index over them. */}
      {cols && cols.groups.map(g => {
        const items = cols.collections.filter(c => c.group === g.id)
        if (!items.length) return null
        return (
          <Section key={g.id} title={g.label}>
            <div className="grid grid-cols-2 gap-3 px-4">
              {items.map(c => (
                <Link
                  key={c.slug} to={`/for/${c.slug}`}
                  className="tap relative rounded-2xl overflow-hidden aspect-[5/4] border border-line active:opacity-90"
                >
                  <CollectionScene scene={c.scene} className="absolute inset-0 w-full h-full" />
                  <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <span className="absolute inset-x-0 bottom-0 p-3">
                    <span className="block text-white text-[15px] font-semibold leading-tight drop-shadow">{c.title}</span>
                    <span className="block text-white/70 text-[10px] mt-0.5">{c.count} duas</span>
                  </span>
                </Link>
              ))}
            </div>
          </Section>
        )
      })}

      <Section title="Tools">
        <div className="grid grid-cols-2 gap-2.5 px-4">
          {TOOLS.map(t => (
            <Card key={t.to} as={Link} to={t.to} className="tap block p-4 active:bg-bg min-h-[92px]">
              <Icon name={t.icon} size={22} className="text-gold" />
              <p className="font-medium text-sm mt-2">{t.label}</p>
              <p className="text-[11px] text-muted mt-0.5 leading-snug">{t.note}</p>
            </Card>
          ))}
        </div>
      </Section>

      <p className="text-[11px] text-muted/70 text-center px-10 mt-8 leading-relaxed">
        Arabic is taken from the muṣḥaf and the hadith collections in this app, and
        each entry carries the reference it was taken from.
      </p>
    </Screen>
  )
}
