import SET from '../generated/icons.json'
import ILLUS from '../generated/icons3d.json'
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

// The two shapes no general icon set has, drawn on the same 256 grid as the rest
// so they carry the same visual weight beside them.
//
// `dua` is here because every set that has a praying-hands icon draws the palms
// pressed flat together. That is the añjali gesture — Hindu, and Christian — and
// it is not how a Muslim makes dua, which is with the hands held apart, cupped,
// palms turned up. Shipping the wrong gesture in an Islamic app is worse than
// shipping a plainer icon, so this one is drawn: two open palms side by side,
// fingers up, a gap between them, and a rounded base where the hands cup.
const HAND = (mirror) => {
  const at = x => (mirror ? 256 - x : x)
  // A finger is a capsule: straight sides, a half-round cap. Length matters more
  // than detail — fingers shorter than the palm read as a mitten, which is what
  // the first attempt looked like.
  const finger = (x0, x1, top) => {
    const r = (x1 - x0) / 2
    return `M${at(x0)} 148 V${top + r} a${r} ${r} 0 0 1 ${at(x1) - at(x0)} 0 V148 Z`
  }
  // The palm narrows towards the wrist and rounds off at the bottom, which is
  // where the cup of the hand is.
  const palm = mirror
    ? 'M228 144 H139 L148 198 C150 210 160 216 171 216 H196 C207 216 217 210 219 198 Z'
    : 'M28 144 H117 L108 198 C106 210 96 216 85 216 H60 C49 216 39 210 37 198 Z'
  return [
    { d: palm },
    { d: finger(28, 48, 104) },   // little
    { d: finger(51, 71, 82) },    // ring
    { d: finger(74, 94, 72) },    // middle, the longest
    { d: finger(97, 117, 86) }    // index
  ]
}

const LOCAL = {
  kaaba: [{ d: 'M128 24a8 8 0 0 0-3.1.6l-72 30A8 8 0 0 0 48 62v132a8 8 0 0 0 4.9 7.4l72 30a8 8 0 0 0 6.2 0l72-30a8 8 0 0 0 4.9-7.4V62a8 8 0 0 0-4.9-7.4l-72-30A8 8 0 0 0 128 24Zm0 16.7L185.2 64 128 87.9 70.8 64ZM64 75.9l56 23.4v112.8l-56-23.3Zm72 136.2V99.3l56-23.4v112.9Z' }],
  dua: [...HAND(false), ...HAND(true)]
}

const ILLUSTRATED = new Set(ILLUS.names)

// Under 18px there is no room for shading to read as shading.
const ILLUSTRATED_MIN = 18

export default function Icon({ name, size = 20, className = '', style }) {
  const chosen = style || useIconStyle()

  // The illustrated set is rendered art, not glyphs: full colour, with depth. It
  // covers the things you navigate by — the tabs, the tiles — and nothing else,
  // because a 3D render at 14px inside a line of text is mud. Anything it does
  // not cover falls through to the vector set, which is the right shape for a
  // small functional icon anyway.
  //
  // That was enforced by which names the set covers, which is the wrong test: it
  // covers `book`, and `book` is also the little mark beside a hadith reference
  // at twelve pixels, where the render came out as a coloured smudge. The size is
  // the test. Below this, the flat glyph, whatever set is chosen.
  if (chosen === 'illustrated' && size >= ILLUSTRATED_MIN && ILLUSTRATED.has(name)) {
    return (
      <img
        src={`icons3d/${name}.png`}
        width={size} height={size} alt="" aria-hidden="true" draggable="false"
        className={className}
        style={{ display: 'block', objectFit: 'contain' }}
      />
    )
  }

  const weight = STYLE_TO_WEIGHT[chosen === 'illustrated' ? 'duotone' : chosen] || 'regular'

  const entry = SET.icons[name]
  // Fall back to the regular weight, then to a local drawing, rather than
  // rendering nothing — a missing icon leaves a button with no face on it.
  // A local drawing takes precedence: where one exists it is because the set's
  // own version is wrong for this app, not merely missing.
  const paths = LOCAL[name] || entry?.[weight] || entry?.regular
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
