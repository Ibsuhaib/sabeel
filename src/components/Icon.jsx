import SET from '../generated/icons.json'
import { useIconStyle } from '../lib/settings.jsx'

// The app's icons: Phosphor Icons (MIT), fetched and baked by
// scripts/fetch-icons.mjs. See that file for why they are no longer drawn here.
//
// Phosphor draws each icon in several weights from one underlying geometry,
// which is what makes a choice of icon style possible without maintaining four
// separate drawings of everything. The reader's choice maps to a weight:
//
//   Line     regular   an even stroke, quiet
//   Bold     bold      heavier, easier to pick out at a glance
//   Solid    fill      filled silhouettes
//   Duotone  duotone   filled, with a second layer at low opacity for depth
//
// Everything is on a 256 viewBox and filled with currentColor, so an icon takes
// its colour from whatever it sits in, exactly as the old stroked set did.

const STYLE_TO_WEIGHT = {
  line: 'regular',
  bold: 'bold',
  solid: 'fill',
  duotone: 'duotone'
}

// The one shape no general icon set has. Drawn on the same 256 grid as the rest
// so it carries the same visual weight beside them.
const LOCAL = {
  kaaba: [{ d: 'M128 24a8 8 0 0 0-3.1.6l-72 30A8 8 0 0 0 48 62v132a8 8 0 0 0 4.9 7.4l72 30a8 8 0 0 0 6.2 0l72-30a8 8 0 0 0 4.9-7.4V62a8 8 0 0 0-4.9-7.4l-72-30A8 8 0 0 0 128 24Zm0 16.7L185.2 64 128 87.9 70.8 64ZM64 75.9l56 23.4v112.8l-56-23.3Zm72 136.2V99.3l56-23.4v112.9Z' }]
}

export default function Icon({ name, size = 20, className = '', style }) {
  const chosen = style || useIconStyle()
  const weight = STYLE_TO_WEIGHT[chosen] || 'regular'

  const entry = SET.icons[name]
  // Fall back to the regular weight, then to a local drawing, rather than
  // rendering nothing — a missing icon leaves a button with no face on it.
  const paths = entry?.[weight] || entry?.regular || LOCAL[name]
  if (!paths) return null

  return (
    <svg
      width={size} height={size} viewBox={`0 0 ${SET.viewBox} ${SET.viewBox}`}
      fill="currentColor" aria-hidden="true" className={className}
    >
      {/* Sunset is sunrise mirrored, so the two ends of the day are not one glyph. */}
      <g transform={entry?.flip ? `translate(${SET.viewBox} 0) scale(-1 1)` : undefined}>
        {paths.map((p, i) => <path key={i} d={p.d} opacity={p.o ?? undefined} />)}
      </g>
    </svg>
  )
}
