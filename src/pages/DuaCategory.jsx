import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { duaCategory } from '../lib/data.js'
import { Screen, Header, Loading, LoadError, Card, IconButton } from '../components/ui.jsx'
import { useData } from '../lib/useData.js'
import Icon from '../components/Icon.jsx'
import Tooltip from '../components/Tooltip.jsx'

// Only worth a toggle if there is something behind it.
const hasMore = d => Boolean(d.tr || d.en || d.benefits)

export default function DuaCategory() {
  const { slug } = useParams()
  const { data: cat, error, retry } = useData(() => duaCategory(slug), [slug], { label: 'these duas' })
  const [counts, setCounts] = useState({})
  const [showArabicOnly, setShowArabicOnly] = useState(false)
  const [open, setOpen] = useState({})

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

              <p className="ar ar-sm">{d.ar}</p>

              {/* The Arabic alone by default. With the transliteration, the
                  translation and the note all open at once, a single entry fills
                  the screen and finding the next one means scrolling past three
                  paragraphs you may not want — so the rest is behind a toggle,
                  and opening one leaves the others shut. */}
              {!showArabicOnly && hasMore(d) && (
                <button
                  onClick={() => setOpen(o => ({ ...o, [d.id]: !o[d.id] }))}
                  aria-expanded={!!open[d.id]}
                  className="tap mt-3 flex items-center gap-1.5 text-[11px] text-muted hover:text-ink"
                >
                  <Icon
                    name="forward" size={13}
                    className={`transition-transform duration-200 ${open[d.id] ? 'rotate-90' : ''}`}
                  />
                  {open[d.id] ? 'Hide translation' : 'Translation & transliteration'}
                </button>
              )}

              {!showArabicOnly && open[d.id] && (
                <div className="mt-3 space-y-3 anim-reveal">
                  {d.tr && <p className="text-[13px] text-muted italic leading-relaxed">{d.tr}</p>}
                  {d.en && <p className="translation text-ink/85">{d.en}</p>}
                  {d.benefits && (
                    <p className="text-xs text-muted bg-bg border border-line rounded-xl px-3 py-2 leading-relaxed">
                      <Icon name="info" size={12} className="inline mr-1.5 -mt-0.5" />{d.benefits}
                    </p>
                  )}
                </div>
              )}

              {/* Where an entry has no recorded source, nothing is shown in its place —
                  no divider, no note. The footer only exists when it has something
                  to carry. */}
              {(d.source || d.citedAs || target > 1) && (
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-line/60">
                  {d.source ? (
                    // Verified against the corpus in this app, so the number is
                    // one you can actually look up here.
                    <span className="text-[11px] text-muted flex items-center gap-1.5 flex-1 min-w-0">
                      <Icon name="book" size={12} className="shrink-0" />
                      <span className="truncate">{d.source}</span>
                    </span>
                  ) : d.citedAs ? (
                    // Cited by the dataset this du'a came from, in a numbering
                    // scheme that is not the one this app's hadith section uses —
                    // or in a collection it does not carry at all. Shown as a
                    // quotation rather than as a reference, so nobody types it
                    // into Find by reference and lands on an unrelated hadith.
                    <Tooltip label="Quoted from the source this du'a came from. Its numbering follows a different edition, so it will not match this app's hadith numbers.">
                      <span className="text-[11px] text-muted/80 flex items-center gap-1.5 flex-1 min-w-0 italic">
                        <Icon name="info" size={12} className="shrink-0" />
                        <span className="truncate">Cited as {d.citedAs}</span>
                      </span>
                    </Tooltip>
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
