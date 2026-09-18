import { useState } from 'react'
import Icon from './Icon.jsx'
import Tooltip from './Tooltip.jsx'

// One du'a, rendered the same way wherever it appears.
//
// It is shown in two places now — the section it belongs to, and the collections
// that gather duas by the hour or the feeling rather than by the book. Two copies
// of this markup would drift, and the half that drifted would be the source line,
// which is the half that must not.

// Only worth a toggle if there is something behind it.
export const hasMore = d => Boolean(d.tr || d.en || d.benefits)

export default function DuaBody({ d, showArabicOnly = false, counter = null }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <p className="ar ar-sm">{d.ar}</p>

      {/* The Arabic alone by default. With the transliteration, the translation
          and the note all open at once, a single entry fills the screen and
          finding the next one means scrolling past three paragraphs you may not
          want — so the rest is behind a toggle. */}
      {!showArabicOnly && hasMore(d) && (
        <button
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
          className="tap mt-3 flex items-center gap-1.5 text-[11px] text-muted hover:text-ink"
        >
          <Icon
            name="forward" size={13}
            className={`transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
          />
          {open ? 'Hide translation' : 'Translation & transliteration'}
        </button>
      )}

      {!showArabicOnly && open && (
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
          no divider, no note. The footer only exists when it has something to
          carry. */}
      {(d.source || d.citedAs || counter) && (
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-line/60">
          {d.source ? (
            // Verified against the corpus in this app, so the number is one you
            // can actually look up here.
            <span className="text-[11px] text-muted flex items-center gap-1.5 flex-1 min-w-0">
              <Icon name="book" size={12} className="shrink-0" />
              <span className="truncate">{d.source}</span>
            </span>
          ) : d.citedAs ? (
            // Cited by the dataset this du'a came from, in a numbering scheme
            // that is not the one this app's hadith section uses — or in a
            // collection it does not carry at all. Shown as a quotation rather
            // than as a reference, so nobody types it into Find by reference and
            // lands on an unrelated hadith.
            <Tooltip label={d.common
              ? 'These words run through hundreds of narrations on every subject, so no single hadith number can be called their source. This is the attribution the collection carries.'
              : "Quoted from the source this du'a came from. Its numbering follows a different edition, so it will not match this app's hadith numbers."}>
              <span className="text-[11px] text-muted/80 flex items-center gap-1.5 flex-1 min-w-0 italic">
                <Icon name="info" size={12} className="shrink-0" />
                <span className="truncate">Cited as {d.citedAs}</span>
              </span>
            </Tooltip>
          ) : (
            <span className="flex-1" />
          )}
          {counter}
        </div>
      )}
    </>
  )
}
