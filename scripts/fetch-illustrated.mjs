// Build-time: the illustrated icon set.
//
// The flat vector icons are right for a 16px button inside a row of text. They
// are not what makes an app feel alive on the screens people actually look at —
// the tab bar, the tiles on the dua index — and the request was for something
// with depth and colour there.
//
// The reference images for this were stock illustrations, two of them still
// carrying their watermark, so they could not be used. Microsoft's Fluent Emoji
// is the same idea under a licence that permits it: MIT, rendered in 3D, and it
// happens to contain exactly the symbols an Islamic app needs.
//
// One of them matters more than the rest. 🤲 "palms up together" is the dua
// gesture — hands apart, cupped, palms turned up. 🙏 "folded hands", which is
// what a general icon set gives you when you ask for praying hands, is the
// añjali gesture: palms pressed flat together, Hindu and Christian. Getting that
// wrong in this app is not a style question.
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, ensure, writeJSON, log, kb } from './_util.mjs'

const RAW = 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets'
const OUT = ensure(path.join(ROOT, 'public', 'icons3d'))

// our name → [folder, file]. Skin-toned emoji sit under a tone folder; the rest
// have their 3D render directly inside.
const MAP = {
  dua: ['Palms up together/Default/3D', 'palms_up_together_3d_default.png'],
  prayer: ['Mosque/3D', 'mosque_3d.png'],
  quran: ['Open book/3D', 'open_book_3d.png'],
  hadith: ['Scroll/3D', 'scroll_3d.png'],
  home: ['House/3D', 'house_3d.png'],
  counter: ['Prayer beads/3D', 'prayer_beads_3d.png'],
  kaaba: ['Kaaba/3D', 'kaaba_3d.png'],
  compass: ['Compass/3D', 'compass_3d.png'],
  star: ['Star/3D', 'star_3d.png'],
  moon: ['Crescent moon/3D', 'crescent_moon_3d.png'],
  sunrise: ['Sunrise/3D', 'sunrise_3d.png'],
  sunset: ['Sunset/3D', 'sunset_3d.png'],
  bell: ['Bell/3D', 'bell_3d.png'],
  heart: ['Green heart/3D', 'green_heart_3d.png'],
  shield: ['Shield/3D', 'shield_3d.png'],
  calendar: ['Calendar/3D', 'calendar_3d.png'],
  chart: ['Bar chart/3D', 'bar_chart_3d.png'],
  book: ['Closed book/3D', 'closed_book_3d.png']
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function get(url, tries = 4) {
  for (let i = 1; i <= tries; i++) {
    const res = await fetch(url, { headers: { 'User-Agent': 'Sabeel/0.1 (open-source Islamic app)' } })
    if (res.ok) return Buffer.from(await res.arrayBuffer())
    if (res.status === 404) return null
    if (i === tries) throw new Error(`HTTP ${res.status}`)
    await sleep(i * 900)
  }
}

async function main() {
  log('Sabeel · Illustrated icons (Fluent Emoji, MIT)')

  const have = []
  const missing = []
  let bytes = 0

  for (const [name, [dir, file]] of Object.entries(MAP)) {
    const target = path.join(OUT, `${name}.png`)
    if (fs.existsSync(target) && fs.statSync(target).size > 2000) {
      bytes += fs.statSync(target).size
      have.push(name)
      continue
    }

    const buf = await get(`${RAW}/${encodeURI(dir)}/${file}`)
    if (!buf) { missing.push(`${name} (${dir}/${file})`); continue }
    // Byte comparison, not a string one: Node's 'ascii' encoding masks the high
    // bit, so the 0x89 that opens every PNG decodes to 0x09 and nothing matches.
    const isPng = buf[0] === 0x89 && buf.slice(1, 4).toString('latin1') === 'PNG'
    if (!isPng) { missing.push(`${name}: not a png`); continue }

    fs.writeFileSync(target, buf)
    bytes += buf.length
    have.push(name)
    await sleep(60)
  }

  if (missing.length) {
    console.log('  not found:')
    for (const m of missing) console.log(`    ${m}`)
  }

  writeJSON(path.join(ROOT, 'src', 'generated', 'icons3d.json'), {
    licence: 'Microsoft Fluent Emoji, MIT — https://github.com/microsoft/fluentui-emoji',
    names: have
  })

  log(`  ${have.length} illustrations, ${kb(bytes)}${missing.length ? ` · ${missing.length} unavailable` : ''}`)
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
