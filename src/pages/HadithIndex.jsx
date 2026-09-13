import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { hadithIndex } from '../lib/data.js'
import { Screen, Header, Loading, Card, Section, IconButton } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'

export default function HadithIndex() {
  const [idx, setIdx] = useState(null)
  useEffect(() => { hadithIndex().then(setIdx) }, [])

  if (!idx) return <Loading label="Loading collections" />

  const six = idx.collections.filter(c => c.inSixBooks)
  const rest = idx.collections.filter(c => !c.inSixBooks)
  const total = idx.collections.reduce((a, c) => a + c.totalHadith, 0)

  return (
    <Screen>
      <Header
        title="Hadith"
        subtitle={`${total.toLocaleString()} narrations · ${idx.collections.length} collections`}
        large
        actions={<IconButton name="search" label="Search hadith" to="/search?tab=hadith" />}
      />

      <div className="px-4 pt-4">
        <Card className="px-4 py-3 flex gap-3 border-brand/25">
          <Icon name="info" size={16} className="text-brand shrink-0 mt-0.5" />
          <p className="text-xs text-muted leading-relaxed">
            Every narration shows its grading and the scholar who gave it. Gradings differ
            between scholars — where they do, you will see each one.
          </p>
        </Card>
      </div>

      <div className="px-4 mt-3">
        <Card as={Link} to="/hadith/lookup" className="tap block px-4 py-3.5 active:bg-bg border-gold/30">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-gold/10 text-gold grid place-items-center shrink-0">
              <Icon name="search" size={19} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-[15px]">Find by reference number</p>
              <p className="text-xs text-muted mt-0.5 truncate">
                Someone quotes “Bukhari 1302” — check it yourself
              </p>
            </div>
            <Icon name="forward" size={18} className="text-muted shrink-0" />
          </div>
        </Card>
      </div>

      <Section title="Kutub as-Sittah — the six books">
        <div className="px-4 space-y-2">
          {six.map(c => <CollectionRow key={c.id} c={c} />)}
        </div>
      </Section>

      <Section title="Other collections">
        <div className="px-4 space-y-2">
          {rest.map(c => <CollectionRow key={c.id} c={c} />)}
        </div>
      </Section>
    </Screen>
  )
}

function CollectionRow({ c }) {
  return (
    <Card as={Link} to={`/hadith/${c.id}`} className="tap block px-4 py-3.5 active:bg-bg">
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl bg-brand/10 text-brand grid place-items-center shrink-0">
          <Icon name="hadith" size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-[15px] truncate">{c.name}</p>
          <p className="text-xs text-muted mt-0.5 truncate">
            {c.author}{c.died ? ` · d. ${c.died}` : ''}
          </p>
        </div>
        <Icon name="forward" size={18} className="text-muted shrink-0" />
      </div>
      <div className="flex items-center gap-2 mt-3 text-[11px]">
        <span className="px-2 py-0.5 rounded-md bg-bg border border-line text-muted tabular-nums">
          {c.totalHadith.toLocaleString()} hadith
        </span>
        <span className="px-2 py-0.5 rounded-md bg-bg border border-line text-muted tabular-nums">
          {c.books.length} books
        </span>
        {c.sahihByCompilation ? (
          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            Sahih throughout
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-md bg-bg border border-line text-muted tabular-nums">
            {c.gradedCount.toLocaleString()} graded
          </span>
        )}
      </div>
    </Card>
  )
}
