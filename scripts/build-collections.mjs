// Build-time: resolve the purpose-based collections against the dua data.
//
// Every item in collections-seed.mjs is a reference like "situational/12". This
// looks each one up, fails the build if it is not there, and writes the resolved
// list out with the title alongside so the list screen can draw itself before the
// dua files have loaded.
//
// Nothing is copied but the title. The Arabic, the translation and the source
// stay in the one place they already live, so a du'a cannot end up with two
// slightly different copies of itself and two different references under them.
import fs from 'node:fs'
import path from 'node:path'
import { DATA, writeJSON, log, kb } from './_util.mjs'
import { GROUPS, COLLECTIONS } from './collections-seed.mjs'
import { normalise } from './arabic.mjs'

const dua = new Map()   // slug -> Map(id -> item)

// Two entries are the same du'a when the shorter is most of the longer. Plain
// containment is too blunt: a long supplication that happens to include the
// tahlil is not a duplicate of the tahlil.
function sameDua(a, b) {
  if (!a || !b) return false
  const [short, long] = a.length <= b.length ? [a, b] : [b, a]
  if (short.length < 10) return short === long
  return long.includes(short) && short.length / long.length >= 0.7
}

function loadCategories() {
  const index = JSON.parse(fs.readFileSync(path.join(DATA, 'dua', 'index.json'), 'utf8'))
  for (const c of index.categories) {
    const file = path.join(DATA, 'dua', `${c.slug}.json`)
    if (!fs.existsSync(file)) continue
    const items = new Map()
    for (const it of JSON.parse(fs.readFileSync(file, 'utf8')).items) items.set(String(it.id), it)
    dua.set(c.slug, items)
  }
}

function main() {
  log('Sabeel · Dua collections')
  loadCategories()

  let broken = 0
  const merged = []
  const used = new Set()
  const out = []

  for (const col of COLLECTIONS) {
    if (!GROUPS.some(g => g.id === col.group)) {
      console.log(`  ✗ ${col.slug}: group "${col.group}" is not declared`)
      broken++
    }

    // `all: 'slug'` means every entry in that section, in its own order — so a
    // section that is already a coherent list does not have to be retyped as
    // nineteen references that then go stale when one is added to it.
    const refs = col.all
      ? [...(dua.get(col.all)?.keys() || [])].map(id => `${col.all}/${id}`)
      : col.items
    if (col.all && !dua.has(col.all)) {
      console.log(`  ✗ ${col.slug}: all: "${col.all}" is not a section`)
      broken++
    }

    const items = []
    const seen = new Set()
    for (const ref of refs) {
      const [slug, id] = ref.split('/')
      const item = dua.get(slug)?.get(id)
      if (!item) {
        console.log(`  ✗ ${col.slug}: "${ref}" does not exist`)
        broken++
        continue
      }
      if (seen.has(ref)) {
        console.log(`  ✗ ${col.slug}: "${ref}" is listed twice`)
        broken++
        continue
      }
      seen.add(ref)
      // The same du'a reaches a collection twice whenever two sections both
      // carry it — "Supplication Upon Waking Up" in the daily duas is "On
      // waking" in the situational ones — and the list then shows it as two
      // numbered entries under two names, one of them often the shorter
      // telling. Reported from a phone as "4 and 5 are same, one is half and
      // one is completed".
      //
      // Only the hand-picked collections are de-duplicated. An `all:` section is
      // the app's own arrangement of a source, and it is not this script's place
      // to drop an entry from it — the bismillah before eating and the bismillah
      // before wudu really are two entries there, the same words for two
      // different moments.
      const n = normalise(item.ar || '')
      // Which of the two to keep.
      //
      // A resolvable reference decides it first. The two copies are the same
      // supplication; what differs is whether the line underneath is a number
      // you can look up in this app's own hadith section or an attribution
      // borrowed from the dataset it came with.
      //
      // Only then length, and the *raw* length, not the normalised one — the
      // muṣḥaf's text carries far more diacritics than the dataset's, so
      // normalising made the fuller Quranic wording look like the shorter of
      // the two and the first version of this kept exactly the wrong one.
      const better = (a, b) => {
        const as = Boolean(a.item.source), bs = Boolean(b.item.source)
        if (as !== bs) return as ? a : b
        const al = (a.item.ar || '').length, bl = (b.item.ar || '').length
        if (al !== bl) return al > bl ? a : b
        return a
      }
      const candidate = { cat: slug, id: Number(id), title: item.title, n, item }

      if (!col.all) {
        const clash = items.findIndex(x => sameDua(x.n, n))
        if (clash >= 0) {
          const keep = better(items[clash], candidate)
          if (keep !== items[clash]) {
            merged.push(`${col.slug}: kept ${keep.cat}/${keep.id} over ${items[clash].cat}/${items[clash].id}`)
            items[clash] = keep
          } else {
            merged.push(`${col.slug}: dropped ${candidate.cat}/${candidate.id}, already there as ${items[clash].cat}/${items[clash].id}`)
          }
          continue
        }
      }

      used.add(ref)
      items.push(candidate)
    }

    if (!items.length) {
      console.log(`  ✗ ${col.slug}: resolves to nothing`)
      broken++
    }

    const clean = items.map(({ cat, id, title }) => ({ cat, id, title }))
    out.push({
      slug: col.slug, title: col.title, blurb: col.blurb,
      group: col.group, scene: col.scene, count: clean.length,
      // A whole section, taken in the source's own order. Marked so the checks
      // know not to expect it to be de-duplicated.
      whole: Boolean(col.all) || undefined,
      items: clean
    })
  }

  if (broken) {
    console.log(`\n  ${broken} broken reference(s). Nothing written.`)
    process.exit(1)
  }

  const bytes = writeJSON(path.join(DATA, 'dua', 'collections.json'), { groups: GROUPS, collections: out })

  if (merged.length) {
    log(`  ${merged.length} duplicate(s) collapsed, keeping the fuller text:`)
    for (const m of merged) log(`    ${m}`)
  }

  const total = [...dua.values()].reduce((a, m) => a + m.size, 0)
  for (const g of GROUPS) {
    const n = out.filter(c => c.group === g.id)
    log(`  ${g.label.padEnd(26)} ${n.length} collections · ${n.reduce((a, c) => a + c.count, 0)} entries`)
  }
  log(`  ${out.length} collections over ${used.size} of the ${total} duas · ${kb(bytes)}`)
}

main()
