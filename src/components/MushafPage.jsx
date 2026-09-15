import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { toArabicNumber } from '../lib/format.js'
import SurahBanner from './SurahBanner.jsx'

const BISMILLAH = 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ'
const LINES = 15

// One page of the Madani muṣḥaf, laid out the way the printed page is: fifteen
// lines, each breaking on exactly the word the paper breaks on, the whole page
// visible at once with nothing to scroll.
//
// Two things have to be true for that, and they pull against each other.
//
// Height: fifteen lines have to fit whatever is left after the header and the
// pager. That fixes the line height, and from it the type size — so the size is
// measured from the container rather than set in the stylesheet.
//
// Width: every line has to end flush at the margin, as it does on paper. A
// printed muṣḥaf achieves that by stretching the letters themselves; a browser
// justifying Arabic can only stretch the spaces, which on a line of four long
// words tears it into pieces. So each line is instead scaled horizontally to
// meet the margin, by the small factor needed — under about a tenth either way,
// which the eye does not read as distortion, and far less than the gaps would
// have been. Lines needing more than that keep their scale and take the
// remainder in word spacing, which is rare and looks better than either extreme.
export default function MushafPage({
  page, lines, meta, audio, selected, onSelect, bookmarked, playingBasmala
}) {
  const frame = useRef(null)
  const rows = useRef([])
  const [fit, setFit] = useState(null)

  // Fitting the page is two constraints at once, and the naive version gets it
  // wrong: sizing the type so fifteen lines fill the height produces letters far
  // too big for a phone's width, because a phone is much narrower relative to
  // its height than a muṣḥaf page is. So the height gives a starting size, the
  // widest line is then measured, and the type is shrunk until that line fits.
  // The lines are laid out on their natural leading and the block is centred, so
  // what is left over becomes margin rather than gaps between lines.
  const fitPage = useCallback(() => {
    const box = frame.current
    if (!box) return
    const w = box.clientWidth
    const h = box.clientHeight
    if (!w || !h) return

    const ceiling = (h / LINES) / 1.92
    const trial = fit?.fontSize || ceiling

    // Measure every line unscaled at whatever size is currently applied.
    let widest = 0
    for (const row of rows.current) {
      const inner = row?.firstElementChild
      if (!inner) continue
      inner.style.transform = 'none'
      inner.style.wordSpacing = '0px'
      widest = Math.max(widest, inner.scrollWidth)
    }

    let fontSize = ceiling
    if (widest > 0) {
      // What the trial size would have to become for the widest line to fit.
      fontSize = Math.min(ceiling, trial * (w / widest))
    }
    fontSize = Math.max(9, fontSize)

    // Lines take an equal share of the page height rather than only their own
    // leading. On a phone the type is limited by width, so keeping the natural
    // leading would leave a band of empty page; spreading the lines evenly is
    // both a better use of the space and closer to how the page is set.
    const lineHeight = h / LINES
    const changed = !fit ||
      Math.abs(fit.fontSize - fontSize) > 0.4 ||
      Math.abs(fit.w - w) > 1
    if (changed) setFit({ w, lineHeight, fontSize })
    else stretch(w)
  }, [fit])

  // Stretch each line out to the margin once the type is settled.
  const stretch = useCallback(width => {
    for (const row of rows.current) {
      const inner = row?.firstElementChild
      if (!inner) continue
      inner.style.transform = 'none'
      inner.style.wordSpacing = '0px'
      const natural = inner.scrollWidth
      if (!natural) continue

      const k = width / natural
      if (k >= 0.9 && k <= 1.14) {
        inner.style.transform = `scaleX(${k.toFixed(4)})`
      } else if (k > 1.14) {
        // Too far to stretch the glyphs. Take 1.14 from the scale and give the
        // rest to the spaces, so a short line still reaches the margin.
        inner.style.transform = 'scaleX(1.14)'
        const gaps = Math.max(1, (inner.textContent.match(/\s/g) || []).length)
        inner.style.wordSpacing = `${Math.min(26, (width / 1.14 - natural) / gaps)}px`
      } else {
        // Narrower than the margin after fitting. Squeeze to meet it exactly
        // with no floor: a line set a shade tight still reads, whereas one left
        // overflowing gets its first word sliced off by the page edge.
        inner.style.transform = `scaleX(${k.toFixed(4)})`
      }
    }
  }, [])

  useLayoutEffect(() => {
    fitPage()
  }, [fitPage, lines, page])

  useLayoutEffect(() => {
    if (fit) stretch(fit.w)
  }, [fit, stretch, lines, page])

  useEffect(() => {
    const box = frame.current
    if (!box || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => setFit(null))
    ro.observe(box)
    return () => ro.disconnect()
  }, [])

  // The Arabic faces are web fonts, so the first measurement can happen against
  // a fallback whose metrics are nothing like theirs — the page then fits a text
  // that is about to change width underneath it, and lines end up clipped. Fit
  // again once the real faces are in.
  useEffect(() => {
    let alive = true
    document.fonts?.ready?.then(() => { if (alive) setFit(null) })
    return () => { alive = false }
  }, [page])

  if (!lines?.length) return null

  // Trailing blank lines are dropped before rendering, so a short page — the
  // opening pages, or the last one of a surah — sits centred on the page rather
  // than pushed to the top by empty rows below it. The height is still divided
  // fifteen ways, so the leading matches every other page.
  let last = lines.length - 1
  while (last > 0 && lines[last].type === 'blank') last--
  const shown = lines.slice(0, last + 1)

  return (
    <div
      ref={frame}
      className="absolute inset-0 flex flex-col justify-center overflow-hidden"
    >
      {shown.map((line, i) => {
        const style = fit ? { height: fit.lineHeight, fontSize: fit.fontSize } : { minHeight: 24 }

        if (line.type === 'surah') {
          const surah = meta?.surahs?.find(s => s.n === line.s)
          return (
            <div key={i} className="flex items-center justify-center overflow-hidden" style={style}>
              <SurahBanner surah={surah} />
            </div>
          )
        }

        if (line.type === 'basmala') {
          return (
            <div
              key={i}
              className={`ar flex items-center justify-center rounded transition-colors ${
                playingBasmala === line.s ? 'text-brand bg-brand/10' : 'text-ink/90'
              }`}
              style={{ ...style, fontSize: fit ? fit.fontSize * 0.92 : undefined }}
            >
              {BISMILLAH}
            </div>
          )
        }

        if (line.type !== 'ayah') return <div key={i} style={style} />

        return (
          <div
            key={i}
            ref={el => { rows.current[i] = el }}
            className="ar flex items-center overflow-hidden w-full"
            style={style}
          >
            {/* shrink-0 matters: as a flex item this would otherwise be squeezed
                to the row width, and the measurement taken from it would be of
                the squeezed box rather than of the text. Every line then looked
                short, got scaled up to "fill" the row, and overflowed it. */}
            <span
              className="inline-block whitespace-nowrap shrink-0"
              // Right, not centre: the line is right-to-left and so sits flush
              // against the right margin. Scaling about the centre moves that
              // edge, and the line ends up hanging off the page by half of
              // whatever it was stretched — which is exactly what it did.
              style={{ transformOrigin: 'right center', width: 'max-content' }}
            >
              {line.w.map((word, j) => {
                const id = `${word.s ?? line.s}:${word.a ?? line.a}`
                return word.end != null ? (
                  <span key={j} className={`ayah-mark ${bookmarked?.has(id) ? 'bg-gold/20' : ''}`}>
                    {toArabicNumber(word.end)}
                  </span>
                ) : (
                  <span key={j}>{word.t}{j < line.w.length - 1 ? ' ' : ''}</span>
                )
              })}
            </span>
          </div>
        )
      })}
    </div>
  )
}
