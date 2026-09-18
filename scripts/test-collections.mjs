// The collections are an index over the duas, not a copy of them.
//
// That distinction is the whole safety of the feature: there is one text of each
// du'a and one source line under it, and the collections only point. The moment a
// collection carries its own copy, two versions of the same supplication can drift
// apart and the one with the wrong reference is the one nobody notices.
//
// So this checks the pointing: every reference resolves, every title shown in a
// list is still the title of the du'a it names, every scene has a drawing, and
// nothing is listed twice.
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, DATA, log } from './_util.mjs'
import { normalise } from './arabic.mjs'

let failed = 0
const fail = m => { failed++; console.log(`  ✗ ${m}`) }

const file = path.join(DATA, 'dua', 'collections.json')
if (!fs.existsSync(file)) {
  console.log('  ✗ dua/collections.json is missing — run `npm run data:collections`')
  process.exit(1)
}
const { groups, collections } = JSON.parse(fs.readFileSync(file, 'utf8'))

/* ------------------------- every reference resolves ----------------------- */

const cats = new Map()
for (const c of JSON.parse(fs.readFileSync(path.join(DATA, 'dua', 'index.json'), 'utf8')).categories) {
  const f = path.join(DATA, 'dua', `${c.slug}.json`)
  if (!fs.existsSync(f)) continue
  cats.set(c.slug, new Map(JSON.parse(fs.readFileSync(f, 'utf8')).items.map(i => [i.id, i])))
}

let refs = 0
let sourced = 0
const covered = new Set()

for (const col of collections) {
  if (!groups.some(g => g.id === col.group)) fail(`${col.slug}: group "${col.group}" is not declared`)
  if (!col.items.length) fail(`${col.slug}: is empty`)
  if (col.count !== col.items.length) fail(`${col.slug}: says ${col.count} but lists ${col.items.length}`)

  const seen = new Set()
  for (const it of col.items) {
    refs++
    const key = `${it.cat}/${it.id}`
    if (seen.has(key)) fail(`${col.slug}: lists ${key} twice`)
    seen.add(key)
    covered.add(key)

    const d = cats.get(it.cat)?.get(it.id)
    if (!d) { fail(`${col.slug}: ${key} does not exist`); continue }

    // The list draws from the title stored here, before the du'a itself has
    // loaded. If the two ever disagree, the list is captioning the wrong thing.
    if (d.title !== it.title) {
      fail(`${col.slug}: ${key} is titled "${d.title}" but the collection says "${it.title}"`)
    }
    if (!d.ar) fail(`${col.slug}: ${key} has no Arabic`)
    if (d.source) sourced++
  }
}

/* ------------------- the same du'a must not appear twice ------------------ */

// Reported from a phone: "on waking 1 and 2 are same, tahajjud 4 and 5 are same,
// one is half and one is completed". They were — the same supplication sits in
// two sections under two names, and a collection that referenced both listed it
// as two numbered entries.
//
// The sections themselves are exempt: an `all:` collection is the app's own
// arrangement of a source, where the bismillah before eating and the bismillah
// before wudu really are two entries.
const sameDua = (a, b) => {
  if (!a || !b) return false
  const [short, long] = a.length <= b.length ? [a, b] : [b, a]
  if (short.length < 10) return short === long
  return long.includes(short) && short.length / long.length >= 0.7
}

for (const col of collections) {
  if (col.whole) continue
  const texts = col.items.map(it => ({ it, n: normalise(cats.get(it.cat)?.get(it.id)?.ar || '') }))
  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      if (sameDua(texts[i].n, texts[j].n)) {
        fail(`${col.slug}: #${i + 1} "${texts[i].it.title}" and #${j + 1} "${texts[j].it.title}" are the same du'a`)
      }
    }
  }
}

log('Sabeel · Dua collections')
log(`  ${collections.length} collections · ${refs} references · ${covered.size} distinct duas`)
log(`  ${sourced} of ${refs} carry a hadith or ayah reference; the rest show the attribution their dataset gives`)

/* ---------------------------- every scene exists -------------------------- */

const art = fs.readFileSync(path.join(ROOT, 'src', 'components', 'CollectionScene.jsx'), 'utf8')
const drawn = new Set()
const block = art.slice(art.indexOf('const SCENES'), art.indexOf('const GOLD'))
for (const m of block.matchAll(/^\s*'?([a-z-]+)'?:\s*\[/gm)) drawn.add(m[1])

for (const col of collections) {
  // A missing scene is not an error at runtime — it silently falls back to the
  // prayer mat, so every card that lost its drawing would look identical and
  // nobody would know which one was wrong.
  if (!drawn.has(col.scene)) fail(`${col.slug}: scene "${col.scene}" has no drawing`)
}
const unused = [...drawn].filter(s => !collections.some(c => c.scene === s))
log(`  ${drawn.size} scenes drawn${unused.length ? ` (${unused.length} unused: ${unused.join(', ')})` : ''}`)

/* -------------------------- nothing copied but titles --------------------- */

// The one field duplicated is the title, deliberately, and checked above. If a
// collection ever starts carrying Arabic, that is a second copy of scripture with
// its own chance of a wrong reference under it.
for (const col of collections) {
  for (const it of col.items) {
    for (const k of Object.keys(it)) {
      if (!['cat', 'id', 'title'].includes(k)) {
        fail(`${col.slug}: ${it.cat}/${it.id} carries "${k}" — collections must only point at duas`)
      }
    }
  }
}

/* --------------------------- reachable from the app ----------------------- */

const index = fs.readFileSync(path.join(ROOT, 'src', 'pages', 'DuaIndex.jsx'), 'utf8')
if (!index.includes('/for/')) fail('the dua index does not link to any collection, so most are unreachable')
const home = fs.readFileSync(path.join(ROOT, 'src', 'pages', 'Home.jsx'), 'utf8')
if (!home.includes('/for/')) fail('the home page does not link to any collection')

if (failed) { console.log(`\n  ${failed} problem(s).`); process.exit(1) }
log('  Every collection points at duas that exist, with the titles they still have.')
