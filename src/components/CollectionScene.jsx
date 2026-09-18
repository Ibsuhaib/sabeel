// The artwork on the collection cards.
//
// Drawn here rather than shipped as images, for three reasons that all matter to
// this project: there is no licence to get wrong, nothing to download, and it
// stays sharp at any size on any screen. Two dozen small scenes as PNGs would be
// a megabyte and a set of attributions; as vectors they are a few kilobytes and
// belong to the app.
//
// The palette is deliberately not the bright primary colours these grids usually
// use. Sabeel opens on sepia, and a wall of saturated blue and red against warm
// paper looks like someone else's app pasted in. These are the app's own greens,
// golds and dusk blues, so the grid reads as one thing.

const TINT = {
  night:  ['#1B2A4A', '#0E1730'],
  dusk:   ['#2A3A5C', '#17223D'],
  dawn:   ['#B8794A', '#7A4A2E'],
  green:  ['#1F5A3D', '#123626'],
  deep:   ['#134034', '#0A241D'],
  gold:   ['#9A6E28', '#5E4116'],
  clay:   ['#8A4A3C', '#57291F'],
  teal:   ['#1C5560', '#0E3038'],
  olive:  ['#4E5A26', '#2C3314'],
  plum:   ['#4A2F52', '#2A1930'],
  sand:   ['#8A7439', '#544620'],
  slate:  ['#3A4654', '#212B36']
}

// scene name -> [tint, what is drawn on it]
const SCENES = {
  'night-window': ['night', Window],
  'night-house': ['dusk', NightHouse],
  dawn: ['dawn', Dawn],
  mat: ['green', Mat],
  lantern: ['gold', Lantern],
  'open-hands': ['plum', OpenHands],
  storm: ['slate', Storm],
  ember: ['clay', Ember],
  shield: ['teal', Shield],
  sunburst: ['gold', Sunburst],
  mountain: ['slate', Mountain],
  path: ['olive', Path],
  compass: ['teal', Compass],
  leaf: ['green', Leaf],
  scales: ['sand', Scales],
  'house-heart': ['clay', HouseHeart],
  anchor: ['deep', Anchor],
  'shield-star': ['deep', ShieldStar],
  door: ['clay', Door],
  road: ['olive', Road],
  bowl: ['sand', Bowl],
  dome: ['teal', Dome],
  rain: ['slate', Rain],
  lamp: ['plum', Lamp]
}

const GOLD = '#E3B657'
const PALE = 'rgba(255,255,255,0.90)'
const SOFT = 'rgba(255,255,255,0.22)'
const DARK = 'rgba(0,0,0,0.30)'

export default function CollectionScene({ scene, className = '' }) {
  const [tint, Draw] = SCENES[scene] || SCENES.mat
  const [from, to] = TINT[tint]
  const id = `cs-${scene}`

  return (
    <svg
      viewBox="0 0 160 120" preserveAspectRatio="xMidYMid slice"
      className={className} aria-hidden="true" focusable="false"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
      </defs>
      <rect width="160" height="120" fill={`url(#${id})`} />
      {/* One soft highlight in the corner on every card, which is what makes a
          flat gradient look lit rather than printed. */}
      <circle cx="128" cy="-6" r="52" fill="rgba(255,255,255,0.07)" />
      <Draw />
    </svg>
  )
}

/* ------------------------------ the scenes -------------------------------- */

function stars(pts) {
  return pts.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill={PALE} opacity={0.85} />)
}

function Window() {
  return (
    <g>
      {stars([[22, 22, 1.3], [38, 14, 1], [16, 44, 1], [50, 30, 1.2]])}
      {/* A mihrab-shaped window with a crescent in it. */}
      <path d="M96 100V54c0-16 10-26 20-26s20 10 20 26v46z" fill="#0B1226" stroke={GOLD} strokeWidth="2.5" />
      <path d="M120 44a13 13 0 1 0 9 22 10.5 10.5 0 1 1-9-22z" fill={GOLD} />
      {stars([[104, 66, 1], [130, 78, 1], [110, 86, 0.9]])}
      <rect x="78" y="100" width="76" height="6" rx="3" fill={DARK} />
    </g>
  )
}

function NightHouse() {
  return (
    <g>
      {stars([[26, 20, 1.2], [46, 12, 1], [18, 38, 1], [64, 26, 1.1], [104, 16, 1]])}
      <path d="M124 34a12 12 0 1 0 8 20 9.5 9.5 0 1 1-8-20z" fill={GOLD} />
      <path d="M0 100c24-14 44-14 62-4s34 10 52 2 30-8 46-2v24H0z" fill="rgba(0,0,0,0.28)" />
      <path d="M78 104V78l22-16 22 16v26z" fill="#16233F" stroke="rgba(255,255,255,0.25)" strokeWidth="2" />
      <path d="M72 80l28-20 28 20" fill="none" stroke={GOLD} strokeWidth="3" strokeLinecap="round" />
      <rect x="93" y="88" width="14" height="16" rx="6" fill={GOLD} opacity="0.9" />
    </g>
  )
}

function Dawn() {
  return (
    <g>
      <circle cx="88" cy="74" r="26" fill={GOLD} opacity="0.95" />
      <circle cx="88" cy="74" r="38" fill={GOLD} opacity="0.16" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map(a => {
        const r = (a * Math.PI) / 180
        return (
          <line key={a}
            x1={88 + Math.cos(r) * 44} y1={74 + Math.sin(r) * 44}
            x2={88 + Math.cos(r) * 54} y2={74 + Math.sin(r) * 54}
            stroke={PALE} strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
        )
      })}
      <path d="M0 96h160v24H0z" fill="rgba(0,0,0,0.30)" />
      <path d="M0 96c26-10 48-10 72-2s40 8 88-4v10H0z" fill="rgba(0,0,0,0.20)" />
    </g>
  )
}

function Mat() {
  return (
    <g>
      <g transform="rotate(-12 96 70)">
        <rect x="58" y="32" width="76" height="74" rx="8" fill="#B8503F" />
        <rect x="64" y="38" width="64" height="62" rx="5" fill="none" stroke={GOLD} strokeWidth="2" />
        <path d="M96 52c8 0 13 6 13 13v22H83V65c0-7 5-13 13-13z" fill={GOLD} opacity="0.85" />
        {[0, 1, 2, 3, 4].map(i => (
          <rect key={i} x={64 + i * 14} y="26" width="4" height="10" rx="2" fill={GOLD} />
        ))}
      </g>
      <rect x="0" y="104" width="160" height="16" fill="rgba(0,0,0,0.22)" />
    </g>
  )
}

function Lantern() {
  return (
    <g>
      <line x1="80" y1="6" x2="80" y2="24" stroke={PALE} strokeWidth="2.5" opacity="0.5" />
      <path d="M62 34h36l8 14v34l-8 14H62l-8-14V48z" fill="#2A1C06" stroke={GOLD} strokeWidth="2.5" />
      <path d="M70 46h20v40H70z" fill={GOLD} opacity="0.85" />
      <circle cx="80" cy="66" r="26" fill={GOLD} opacity="0.16" />
      <circle cx="80" cy="66" r="38" fill={GOLD} opacity="0.08" />
      <path d="M72 24h16v10H72z" fill={GOLD} />
    </g>
  )
}

function OpenHands() {
  return (
    <g>
      <circle cx="80" cy="42" r="12" fill={GOLD} opacity="0.35" />
      <circle cx="80" cy="42" r="5" fill={GOLD} />
      {/* Two cupped palms, the gesture of dua. */}
      <path d="M46 96c-6-14-4-30 2-38 3-4 8-3 8 2l2 16" fill="none" stroke={PALE} strokeWidth="6" strokeLinecap="round" />
      <path d="M114 96c6-14 4-30-2-38-3-4-8-3-8 2l-2 16" fill="none" stroke={PALE} strokeWidth="6" strokeLinecap="round" />
      <path d="M52 78c8-10 20-14 28-14s20 4 28 14c4 6 2 16-6 20H58c-8-4-10-14-6-20z" fill={PALE} />
    </g>
  )
}

function Storm() {
  return (
    <g>
      <path d="M44 72c-10 0-18-8-18-17s8-17 18-17c3-12 14-20 26-20 15 0 28 11 30 26 10 1 18 9 18 19s-9 19-20 19H44z" fill="rgba(255,255,255,0.80)" />
      {[[56, 92], [80, 100], [104, 92]].map(([x, y], i) => (
        <line key={i} x1={x} y1={y} x2={x - 6} y2={y + 16} stroke={PALE} strokeWidth="3" strokeLinecap="round" opacity="0.55" />
      ))}
      <path d="M86 78l-12 18h10l-6 16 18-22H86l6-12z" fill={GOLD} />
    </g>
  )
}

function Ember() {
  return (
    <g>
      <path d="M80 18c14 18 26 26 26 44a26 26 0 0 1-52 0c0-10 6-16 10-22 2 8 6 12 10 12-2-14 2-24 6-34z" fill={GOLD} />
      <path d="M80 52c6 8 12 12 12 22a12 12 0 0 1-24 0c0-8 6-14 12-22z" fill="rgba(255,255,255,0.85)" />
      <path d="M0 104h160v16H0z" fill="rgba(0,0,0,0.25)" />
      <ellipse cx="80" cy="104" rx="42" ry="7" fill={GOLD} opacity="0.18" />
    </g>
  )
}

function Shield() {
  return (
    <g>
      <path d="M80 18l38 14v28c0 24-16 40-38 48-22-8-38-24-38-48V32z" fill="rgba(255,255,255,0.14)" stroke={PALE} strokeWidth="3" />
      <path d="M80 34l24 9v18c0 15-10 25-24 31-14-6-24-16-24-31V43z" fill={GOLD} opacity="0.85" />
    </g>
  )
}

function ShieldStar() {
  return (
    <g>
      <path d="M80 16l40 15v29c0 25-17 42-40 51-23-9-40-26-40-51V31z" fill="rgba(255,255,255,0.12)" stroke={PALE} strokeWidth="3" />
      <path d="M80 40l7 15 16 2-12 11 3 16-14-8-14 8 3-16-12-11 16-2z" fill={GOLD} />
    </g>
  )
}

function Sunburst() {
  return (
    <g>
      {[...Array(12)].map((_, i) => {
        const r = (i * 30 * Math.PI) / 180
        return (
          <line key={i}
            x1={80 + Math.cos(r) * 30} y1={60 + Math.sin(r) * 30}
            x2={80 + Math.cos(r) * 52} y2={60 + Math.sin(r) * 52}
            stroke={GOLD} strokeWidth="4" strokeLinecap="round" opacity="0.7" />
        )
      })}
      <circle cx="80" cy="60" r="26" fill={GOLD} />
      <circle cx="80" cy="60" r="26" fill="rgba(255,255,255,0.25)" />
    </g>
  )
}

function Mountain() {
  return (
    <g>
      <path d="M0 108l44-58 26 32 18-22 34 48z" fill="rgba(255,255,255,0.18)" />
      <path d="M0 108l44-58 18 24-30 34z" fill="rgba(255,255,255,0.10)" />
      <path d="M44 50l12 16H32z" fill={PALE} />
      <path d="M122 60l16 22h-32z" fill={PALE} opacity="0.7" />
      <circle cx="126" cy="28" r="12" fill={GOLD} opacity="0.85" />
      <rect x="0" y="106" width="160" height="14" fill="rgba(0,0,0,0.28)" />
    </g>
  )
}

function Path() {
  return (
    <g>
      <path d="M0 118c30 0 44-14 48-30s6-26 20-32 26-2 36-12" fill="none" stroke={GOLD} strokeWidth="7" strokeLinecap="round" opacity="0.9" />
      <path d="M0 118c30 0 44-14 48-30s6-26 20-32 26-2 36-12" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeDasharray="6 8" />
      <circle cx="116" cy="40" r="9" fill={PALE} />
      <path d="M116 22l3 8h8l-6 6 2 9-7-5-7 5 2-9-6-6h8z" fill={GOLD} />
    </g>
  )
}

function Compass() {
  return (
    <g>
      <circle cx="80" cy="60" r="38" fill="rgba(255,255,255,0.12)" stroke={PALE} strokeWidth="3" />
      <circle cx="80" cy="60" r="28" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
      <path d="M80 34l9 24-9 26-9-26z" fill={GOLD} />
      <path d="M80 34l9 24-9 4z" fill="rgba(255,255,255,0.55)" />
      <circle cx="80" cy="60" r="4" fill={PALE} />
    </g>
  )
}

function Leaf() {
  return (
    <g>
      <path d="M40 104c0-36 24-62 62-66 6 30-12 66-62 66z" fill={PALE} opacity="0.85" />
      <path d="M40 104c14-26 34-44 62-56" fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="118" cy="30" r="10" fill={GOLD} opacity="0.8" />
    </g>
  )
}

function Scales() {
  return (
    <g>
      <line x1="80" y1="26" x2="80" y2="100" stroke={PALE} strokeWidth="4" strokeLinecap="round" />
      <line x1="40" y1="42" x2="120" y2="42" stroke={PALE} strokeWidth="4" strokeLinecap="round" />
      <path d="M26 46h28l-14 22z" fill={GOLD} />
      <path d="M106 46h28l-14 22z" fill={GOLD} opacity="0.75" />
      <rect x="62" y="100" width="36" height="6" rx="3" fill={PALE} />
      <circle cx="80" cy="24" r="6" fill={GOLD} />
    </g>
  )
}

function HouseHeart() {
  return (
    <g>
      <path d="M36 106V62l44-32 44 32v44z" fill="rgba(255,255,255,0.14)" stroke={PALE} strokeWidth="3" />
      <path d="M28 64L80 26l52 38" fill="none" stroke={GOLD} strokeWidth="4" strokeLinecap="round" />
      <path d="M80 96c-14-9-22-16-22-25a11 11 0 0 1 22-5 11 11 0 0 1 22 5c0 9-8 16-22 25z" fill={GOLD} />
    </g>
  )
}

function Anchor() {
  return (
    <g>
      <circle cx="80" cy="28" r="9" fill="none" stroke={PALE} strokeWidth="5" />
      <line x1="80" y1="37" x2="80" y2="96" stroke={PALE} strokeWidth="6" strokeLinecap="round" />
      <line x1="56" y1="50" x2="104" y2="50" stroke={PALE} strokeWidth="5" strokeLinecap="round" />
      <path d="M40 72c0 20 18 32 40 32s40-12 40-32" fill="none" stroke={GOLD} strokeWidth="7" strokeLinecap="round" />
    </g>
  )
}

function Door() {
  return (
    <g>
      <rect x="44" y="24" width="72" height="88" rx="4" fill="rgba(0,0,0,0.25)" />
      <path d="M54 112V56c0-14 11-24 26-24s26 10 26 24v56z" fill={GOLD} opacity="0.9" />
      <path d="M54 112V56c0-14 11-24 26-24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2.5" />
      <circle cx="96" cy="76" r="4" fill="#3A2408" />
      <rect x="36" y="108" width="88" height="8" rx="4" fill="rgba(0,0,0,0.35)" />
    </g>
  )
}

function Road() {
  return (
    <g>
      <path d="M58 120L74 44h14l14 76z" fill="rgba(255,255,255,0.18)" />
      {[0, 1, 2, 3].map(i => (
        <rect key={i} x="77" y={54 + i * 18} width="6" height="10" rx="3" fill={PALE} opacity="0.8" />
      ))}
      <path d="M0 44h160v-4H0z" fill="none" />
      <circle cx="126" cy="26" r="11" fill={GOLD} opacity="0.85" />
      <path d="M0 44c26-8 44-8 62-2s44 6 98-6v-8H0z" fill="rgba(0,0,0,0.20)" />
    </g>
  )
}

function Bowl() {
  return (
    <g>
      <path d="M34 62h92c0 26-20 42-46 42S34 88 34 62z" fill={PALE} />
      <path d="M34 62h92c0 6-1 11-3 16H37c-2-5-3-10-3-16z" fill="rgba(0,0,0,0.12)" />
      <rect x="26" y="104" width="108" height="8" rx="4" fill="rgba(0,0,0,0.30)" />
      {[60, 80, 100].map((x, i) => (
        <path key={i} d={`M${x} 48c4-6-4-10 0-16`} fill="none" stroke={GOLD} strokeWidth="3" strokeLinecap="round" opacity="0.8" />
      ))}
    </g>
  )
}

function Dome() {
  return (
    <g>
      <rect x="46" y="70" width="68" height="42" fill="rgba(255,255,255,0.14)" />
      <path d="M46 70c0-22 15-34 34-34s34 12 34 34z" fill={GOLD} opacity="0.9" />
      <path d="M80 22v12" stroke={GOLD} strokeWidth="3" strokeLinecap="round" />
      <path d="M80 14a7 7 0 1 0 5 12 5.5 5.5 0 1 1-5-12z" fill={GOLD} />
      <rect x="28" y="78" width="10" height="34" rx="5" fill="rgba(255,255,255,0.20)" />
      <rect x="122" y="78" width="10" height="34" rx="5" fill="rgba(255,255,255,0.20)" />
      <path d="M68 112V94c0-7 5-12 12-12s12 5 12 12v18z" fill="rgba(0,0,0,0.30)" />
    </g>
  )
}

function Rain() {
  return (
    <g>
      <path d="M50 64c-10 0-18-8-18-18s8-18 18-18c4-11 14-18 26-18 14 0 26 10 29 24 10 1 17 9 17 18 0 10-8 18-18 18H50z" fill="rgba(255,255,255,0.82)" />
      {[[46, 78], [64, 86], [82, 78], [100, 86], [116, 78]].map(([x, y], i) => (
        <path key={i} d={`M${x} ${y}c-4 6-6 9-6 12a6 6 0 0 0 12 0c0-3-2-6-6-12z`} fill={PALE} opacity="0.75" />
      ))}
    </g>
  )
}

function Lamp() {
  return (
    <g>
      <path d="M52 44h56l-10 18a22 22 0 0 1-36 0z" fill={GOLD} />
      <rect x="72" y="62" width="16" height="12" fill={GOLD} opacity="0.8" />
      <path d="M58 74h44l8 30H50z" fill="rgba(255,255,255,0.85)" />
      <circle cx="80" cy="88" r="30" fill={GOLD} opacity="0.14" />
      <line x1="80" y1="14" x2="80" y2="44" stroke={PALE} strokeWidth="2.5" opacity="0.5" />
      <rect x="40" y="104" width="80" height="7" rx="3.5" fill="rgba(0,0,0,0.30)" />
    </g>
  )
}
