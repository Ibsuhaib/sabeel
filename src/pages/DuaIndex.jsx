import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { duaIndex } from '../lib/data.js'
import { Screen, Header, Loading, Card, Section, IconButton } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'

export default function DuaIndex() {
  const [idx, setIdx] = useState(null)
  useEffect(() => { duaIndex().then(setIdx) }, [])
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

      <Section title="Tools">
        <div className="grid grid-cols-2 gap-2 px-4">
          <Card as={Link} to="/dua/tasbih" className="tap block p-4 active:bg-bg">
            <Icon name="counter" size={22} className="text-brand" />
            <p className="font-medium text-sm mt-2">Tasbih counter</p>
            <p className="text-[11px] text-muted mt-0.5">With haptics and targets</p>
          </Card>
          <Card as={Link} to="/dua/names" className="tap block p-4 active:bg-bg">
            <Icon name="star" size={22} className="text-gold" />
            <p className="font-medium text-sm mt-2">99 Names</p>
            <p className="text-[11px] text-muted mt-0.5">Asma ul-Husna with meanings</p>
          </Card>
        </div>
      </Section>

      <Section title="Collections">
        <div className="px-4 space-y-2">
          {idx.categories.map(c => (
            <Card key={c.slug} as={Link} to={`/dua/${c.slug}`} className="tap block px-4 py-3.5 active:bg-bg">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-brand/10 text-brand grid place-items-center shrink-0">
                  <Icon name={c.icon === 'sunrise' ? 'sunrise' : c.icon === 'sunset' ? 'sunset' : c.icon === 'prayer' ? 'prayer' : c.icon === 'book' ? 'book' : 'dua'} size={19} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-[15px]">{c.title}</span>
                  <span className="block text-xs text-muted mt-0.5 truncate">{c.blurb} · {c.count} entries</span>
                </span>
                <Icon name="forward" size={18} className="text-muted shrink-0" />
              </div>
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
