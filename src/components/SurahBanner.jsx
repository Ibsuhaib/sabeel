// The framed surah header that opens a surah in a printed muṣḥaf.
//
// Drawn as SVG rather than copied from an existing muṣḥaf scan: the ornament in
// a printed copy is someone's artwork, and this app does not ship artwork it has
// no licence to. The geometry is an ordinary interlace built from the same
// eight-pointed khatim as the app icon, so it belongs to the app's own language.
export default function SurahBanner({ surah, subtitle }) {
  if (!surah) return null
  return (
    <span className="block select-none" style={{ direction: 'rtl' }}>
      <span className="relative block mx-auto" style={{ maxWidth: '22em' }}>
        <svg viewBox="0 0 320 64" className="w-full h-auto block" role="presentation" aria-hidden="true">
          <defs>
            <pattern id="sb-weave" width="16" height="16" patternUnits="userSpaceOnUse">
              <path
                d="M0 8 L8 0 L16 8 L8 16 Z M8 4 L12 8 L8 12 L4 8 Z"
                fill="none" stroke="rgb(var(--c-gold))" strokeOpacity=".55" strokeWidth="1"
              />
            </pattern>
          </defs>

          <rect x="1" y="1" width="318" height="62" rx="5"
            fill="none" stroke="rgb(var(--c-gold))" strokeOpacity=".7" strokeWidth="1.5" />
          <rect x="5" y="5" width="310" height="54" rx="3" fill="url(#sb-weave)" />
          {/* The clear cartouche the name sits in. */}
          <rect x="72" y="9" width="176" height="46" rx="22"
            fill="rgb(var(--c-surf))" stroke="rgb(var(--c-gold))" strokeOpacity=".7" strokeWidth="1.5" />
          {[52, 268].map(cx => (
            <g key={cx}>
              <circle cx={cx} cy="32" r="17" fill="rgb(var(--c-surf))"
                stroke="rgb(var(--c-gold))" strokeOpacity=".7" strokeWidth="1.5" />
            </g>
          ))}
        </svg>

        {/* Text sits over the frame so it uses the real Arabic face rather than
            SVG text, which would not shape or ligate correctly. */}
        <span className="absolute inset-0 flex items-center justify-between px-[3%]">
          <span className="leading-none text-gold tabular-nums w-[12%] text-center" style={{ fontSize: '0.34em' }}>
            {surah.ayahs}
            <span className="block opacity-75 mt-0.5" style={{ fontSize: '0.72em' }}>آياتها</span>
          </span>
          <span className="flex-1 text-center text-brand" style={{ fontSize: '0.64em', lineHeight: 1.1 }}>
            {surah.name}
          </span>
          <span className="leading-none text-gold tabular-nums w-[12%] text-center" style={{ fontSize: '0.34em' }}>
            {surah.n}
            <span className="block opacity-75 mt-0.5" style={{ fontSize: '0.72em' }}>ترتيبها</span>
          </span>
        </span>
      </span>

      {subtitle && (
        <span className="block text-center text-muted mt-1" style={{ fontSize: '0.3em', direction: 'ltr' }}>
          {subtitle}
        </span>
      )}
    </span>
  )
}
