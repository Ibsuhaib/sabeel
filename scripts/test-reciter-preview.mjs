// Every reciter in the picker must be able to play a sample.
//
// The picker is forty-two names, and a name is not something most people can
// choose between — you know a reciter by the sound of them. So each row has a
// listen button, and a row whose button cannot produce a URL is worse than no
// button at all: it looks available and does nothing.
//
// The two kinds are published differently — one file per āyah from EveryAyah,
// one file per surah from mp3quran — so a sample is built one way or the other
// and each needs a different field present in the catalogue.
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, DATA, log } from './_util.mjs'

let failed = 0
const fail = m => { failed++; console.log(`  ✗ ${m}`) }

// The real formulas, lifted out of the source rather than copied, so this fails
// if they change shape — the component imports React and a bundler, the way
// test-swipe.mjs does it.
const src = fs.readFileSync(path.join(ROOT, 'src', 'lib', 'audio.js'), 'utf8')
const every = /const EVERY_AYAH = '([^']+)'/.exec(src)?.[1]
if (!every) fail('could not find the EveryAyah base URL in audio.js')

// Sliced to the closing brace at the start of a line: the first `}` in these
// functions is inside a `${...}` in a template literal, not the end of the body.
const body = name => {
  const from = src.indexOf(`export function ${name}`)
  const to = src.indexOf('\n}', from)
  return src.slice(from, to + 2)
}
const build = new Function(`const EVERY_AYAH = ${JSON.stringify(every)};
${body('ayahUrl').replace('export ', '')}
${body('surahUrl').replace('export ', '')}
const ayahFileId = (surah, ayah) =>
  \`\${String(surah).padStart(3, '0')}\${String(ayah).padStart(3, '0')}\`;
return { ayahUrl, surahUrl }`)()

const cat = JSON.parse(fs.readFileSync(path.join(DATA, 'reciters.json'), 'utf8'))
const perAyah = cat.perAyah || []
const surah = cat.surah || []

// The sample is al-Fātiḥah: the passage everyone knows, so the ear has
// something to compare one voice against another with.
for (const r of perAyah) {
  const url = build.ayahUrl(r, 1, 1)
  if (!/^https?:\/\/\S+\/001001\.mp3$/.test(url)) fail(`${r.name || r.id}: sample URL looks wrong — ${url}`)
  if (!r.id) fail(`a per-ayah reciter has no id, so no sample can be fetched for it`)
}

for (const r of surah) {
  if (!r.server) { fail(`${r.name || r.id}: no server, so its listen button could never play anything`); continue }
  const url = build.surahUrl(r, 1)
  if (!/^https?:\/\/\S+\/001\.mp3$/.test(url)) fail(`${r.name || r.id}: sample URL looks wrong — ${url}`)
}

log('Sabeel · Reciter previews')
log(`  ${perAyah.length + surah.length} reciters · ${perAyah.length} sampled ayah by ayah, ${surah.length} by whole surah`)

/* ------------------------- one voice at a time ---------------------------- */

const comp = fs.readFileSync(path.join(ROOT, 'src', 'components', 'ReciterPreview.jsx'), 'utf8')

// A list where each row starts its own audio ends up with several reciters
// going at once, which is the opposite of letting someone compare them.
if (!/stopAll\(\)/.test(comp)) fail('ReciterPreview never stops whatever else is playing')
if (!comp.includes('e.stopPropagation()')) {
  fail('tapping listen would also fall through to the row and choose that reciter')
}
if (!/useEffect\(\(\) => \(\) =>/.test(comp)) fail('a sample would keep playing after the screen is gone')

// Recitation streams, and this is the first run — there may be no signal yet.
if (!/catch \{/.test(comp)) fail('a failed or refused play would leave the button spinning forever')

// Both pickers must offer it, not just one.
for (const [file, where] of [
  ['src/pages/Onboarding.jsx', 'the first-run picker'],
  ['src/components/Player.jsx', 'the picker inside the player']
]) {
  const s = fs.readFileSync(path.join(ROOT, file), 'utf8')
  if (!s.includes('<ReciterPreview')) fail(`${where} has no listen button`)
  // A button inside a button is invalid and the inner one may not receive taps.
  // The row's own </button> has to close before the preview appears, so the
  // match is only a nesting if no closing tag comes between the two.
  const nested = /<button[^>]*>(?:(?!<\/button>)[\s\S]){0,800}?<ReciterPreview/.test(s)
  if (nested) fail(`${where} nests the listen button inside the row button`)
}

if (failed) { console.log(`\n  ${failed} problem(s).`); process.exit(1) }
log('  every reciter can be heard before being chosen, one at a time, in both pickers.')
