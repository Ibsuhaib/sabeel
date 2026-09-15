import { Link } from 'react-router-dom'
import { duaIndex } from '../lib/data.js'
import { useData } from '../lib/useData.js'
import { Screen, Header, Loading, LoadError, Card, Section, IconButton } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'

// Tools that are not a list of duas but belong on this screen — reached far more
// often than anything buried in a menu.
const TOOLS = [
  { to: '/dua/tasbih', icon: 'counter', label: 'Tasbih', note: 'Counter with haptics' },
  { to: '/dua/names', icon: 'star', label: '99 Names', note: 'Asma ul-Husna' },
  { to: '/qibla', icon: 'compass', label: 'Qibla', note: 'Direction of the Kaaba' },
  { to: '/search?tab=dua', icon: 'search', label: 'Search duas', note: 'By word or situation' }
]

const ICON_FOR = {
  sunrise: 'sunrise',
  sunset: 'sunset',
  prayer: 'prayer',
  book: 'book',
  day: 'dua'
}

export default function DuaIndex() {
  const { data: idx, error, retry } = useData(duaIndex, [], { label: 'the dua list' })
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

      <Section title="Collections">
        <div className="grid grid-cols-2 gap-2.5 px-4">
          {idx.categories.map(c => (
            <Link
              key={c.slug} to={`/dua/${c.slug}`}
              className="tap flex flex-col items-center text-center gap-2 px-3 py-5 rounded-2xl bg-surf border border-line active:border-brand/50 min-h-[128px]"
            >
              <span className="w-14 h-14 rounded-2xl bg-brand/10 text-brand grid place-items-center shrink-0">
                <Icon name={ICON_FOR[c.icon] || 'dua'} size={26} />
              </span>
              <span className="min-w-0 w-full">
                <span className="block text-sm font-medium leading-tight">{c.title}</span>
                <span className="block text-[11px] text-muted mt-1 leading-snug line-clamp-2">{c.blurb}</span>
                <span className="block text-[10px] text-brand mt-1.5 tabular-nums">{c.count} entries</span>
              </span>
            </Link>
          ))}
        </div>
      </Section>

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
        Every dua shows the source it comes from. Where a source is not recorded, it says so.
      </p>
    </Screen>
  )
}
