import { Card } from './ui.jsx'
import Icon from './Icon.jsx'

// Everything here is derived from the muṣḥaf data the app already ships —
// counts, spans, sajdah positions. No prose summaries of what a surah "is
// about": that is tafsir, and this app does not generate tafsir.
export default function SurahInfo({ surah, ayahs, meta }) {
  if (!surah || !ayahs?.length) return null

  const first = ayahs[0]
  const last = ayahs[ayahs.length - 1]
  const juzSpan = first.j === last.j ? `Juz ${first.j}` : `Juz ${first.j}–${last.j}`
  const pageSpan = first.p === last.p ? `Page ${first.p}` : `Pages ${first.p}–${last.p}`
  const rukus = new Set(ayahs.map(a => a.r)).size
  const sajdas = ayahs.filter(a => a.sajdah)
  const longest = ayahs.reduce((b, a) => (a.ar.length > (b?.ar.length ?? 0) ? a : b), null)

  // Revelation order is a scholarly ordering, not the muṣḥaf order, and the app
  // does not ship a sourced list of it — so it is deliberately not claimed here.
  const facts = [
    ['Name', surah.en],
    ['Meaning', surah.meaning],
    ['Revealed', surah.type === 'Meccan' ? 'Makkah' : 'Madinah'],
    ['Ayahs', String(surah.ayahs)],
    ['Rukus', String(rukus)],
    ['Position', `Surah ${surah.n} of 114`],
    ['In the muṣḥaf', `${pageSpan} · ${juzSpan}`]
  ]

  return (
    <Card className="mx-4 p-4">
      <div className="text-center pb-3 mb-3 border-b border-line">
        <p className="ar text-brand" style={{ textAlign: 'center', fontSize: 30, lineHeight: 1.6 }}>{surah.name}</p>
        <p className="text-sm font-medium mt-1">{surah.en}</p>
        <p className="text-[11px] text-muted">{surah.meaning}</p>
      </div>

      <dl className="space-y-1.5">
        {facts.map(([k, v]) => (
          <div key={k} className="flex gap-3 text-[13px]">
            <dt className="text-muted w-28 shrink-0">{k}</dt>
            <dd className="flex-1 text-right">{v}</dd>
          </div>
        ))}
      </dl>

      {sajdas.length > 0 && (
        <div className="mt-3 pt-3 border-t border-line flex items-start gap-2">
          <span className="text-gold shrink-0 mt-0.5" style={{ fontSize: 13 }}>۩</span>
          <p className="text-[11px] text-muted leading-relaxed">
            {sajdas.length === 1 ? 'A place of prostration at ayah' : 'Places of prostration at ayahs'}{' '}
            {sajdas.map(a => a.v).join(', ')}.
          </p>
        </div>
      )}

      {longest && (
        <div className="mt-3 pt-3 border-t border-line flex items-start gap-2">
          <Icon name="info" size={13} className="text-muted shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted leading-relaxed">
            Longest ayah in this surah is {surah.n}:{longest.v}.
          </p>
        </div>
      )}
    </Card>
  )
}
