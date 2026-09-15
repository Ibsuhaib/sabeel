// Build-time: the app's icon set.
//
// These were hand-drawn as SVG path data, which was a mistake. Authoring an icon
// blind and checking it by screenshot produces shapes that are *nearly* right —
// a dua icon that reads as a crown, a chain of narration that reads as an
// ampersand — and "nearly right" is exactly what makes an interface look
// unfinished. Icon design is a craft, and the geometry is worth taking from
// people who do it properly.
//
// Phosphor Icons (MIT) is that set. It also solves the second problem: it draws
// every icon in several weights from the same underlying geometry, so offering a
// choice of icon style is a matter of picking a weight rather than maintaining
// four drawings of everything.
//
// Two icons have no equivalent and stay hand-drawn, in app-icons.mjs — a Kaaba
// and the khatim star. Both are specific enough that no general set has them.
import path from 'node:path'
import { ROOT, ensure, writeJSON, log, kb } from './_util.mjs'

const CDN = 'https://cdn.jsdelivr.net/npm/@phosphor-icons/core@2/assets'
const WEIGHTS = ['regular', 'bold', 'fill', 'duotone']

// Our name → the Phosphor name. Chosen for what the icon has to say in this app,
// not for the closest literal match: hadith is a scroll rather than a second
// book, because a book beside the Quran's book is two icons that look the same.
const MAP = {
  home: 'house-line',
  quran: 'book-open-text',
  hadith: 'scroll',
  prayer: 'mosque',
  dua: 'hands-praying',

  search: 'magnifying-glass',
  back: 'caret-left',
  forward: 'caret-right',
  close: 'x',
  menu: 'list',
  more: 'dots-three',
  check: 'check',
  plus: 'plus',
  minus: 'minus',
  reset: 'arrow-counter-clockwise',
  filter: 'funnel',
  autoscroll: 'caret-double-down',

  play: 'play',
  pause: 'pause',
  download: 'download-simple',
  share: 'share-network',
  copy: 'copy',
  bookmark: 'bookmark-simple',
  note: 'note-pencil',
  flag: 'flag',
  star: 'star',
  heart: 'heart',
  bolt: 'lightning',

  settings: 'gear-six',
  info: 'info',
  warn: 'warning',
  location: 'map-pin',
  calendar: 'calendar-blank',
  chart: 'chart-bar',
  calc: 'calculator',
  book: 'book-bookmark',
  shield: 'shield-check',
  compass: 'compass',
  counter: 'circles-three',

  bell: 'bell',
  bellOff: 'bell-slash',
  chime: 'waveform',
  mute: 'speaker-simple-slash',

  sunrise: 'sun-horizon',
  sunset: 'sun-horizon',
  dawn: 'cloud-sun',
  sun: 'sun',
  sunLow: 'sun-dim',
  moon: 'moon-stars'
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function get(url, tries = 4) {
  for (let i = 1; i <= tries; i++) {
    const res = await fetch(url)
    if (res.ok) return res.text()
    if (res.status === 404) return null
    if (i === tries) throw new Error(`HTTP ${res.status} for ${url}`)
    await sleep(i * 800)
  }
}

// Pull the paths out, keeping the opacity that makes duotone duotone.
function extract(svg) {
  return [...svg.matchAll(/<path([^>]*)\/>/g)].map(m => {
    const attrs = m[1]
    const d = /d="([^"]+)"/.exec(attrs)?.[1]
    const o = /opacity="([^"]+)"/.exec(attrs)?.[1]
    return d ? (o ? { d, o: Number(o) } : { d }) : null
  }).filter(Boolean)
}

async function main() {
  log('Sabeel · Icons (Phosphor, MIT)')

  const out = {}
  const missing = []
  let count = 0

  for (const [ours, theirs] of Object.entries(MAP)) {
    out[ours] = {}
    for (const w of WEIGHTS) {
      const file = w === 'regular' ? theirs : `${theirs}-${w}`
      const svg = await get(`${CDN}/${w}/${file}.svg`)
      if (!svg) { missing.push(`${ours} (${theirs}) @ ${w}`); continue }
      const paths = extract(svg)
      if (!paths.length) { missing.push(`${ours} @ ${w}: no paths`); continue }
      out[ours][w] = paths
      count++
    }
    await sleep(40)
  }

  if (missing.length) {
    console.log('  could not fetch:')
    for (const m of missing) console.log(`    ${m}`)
    throw new Error(`${missing.length} icon/weight combination(s) missing`)
  }

  // Sunset is Phosphor's sun-horizon mirrored, so the two ends of the day do not
  // share one glyph. The flip is applied at render time from this flag.
  out.sunset.flip = true

  // Written into src rather than public/data: icons are needed on the first
  // paint, and fetching them would show a screen of empty buttons first. It is
  // generated source, committed like any other build output that the app itself
  // imports.
  const dir = ensure(path.join(ROOT, 'src', 'generated'))
  const size = writeJSON(path.join(dir, 'icons.json'), {
    viewBox: 256,
    weights: WEIGHTS,
    licence: 'Phosphor Icons, MIT — https://github.com/phosphor-icons/core',
    icons: out
  })

  log(`  ${Object.keys(MAP).length} icons × ${WEIGHTS.length} weights = ${count} drawings, ${kb(size)}`)
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
