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

const dua = new Map()   // slug -> Map(id -> item)

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
  const used = new Set()
  const out = []

  for (const col of COLLECTIONS) {
    if (!GROUPS.some(g => g.id === col.group)) {
      console.log(`  ✗ ${col.slug}: group "${col.group}" is not declared`)
      broken++
    }

    const items = []
    const seen = new Set()
    for (const ref of col.items) {
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
      used.add(ref)
      // An entry with no source of its own is one of the twelve whose words are
      // too common to attribute; it still belongs in a collection, it simply
      // shows the attribution its dataset carries instead of a number.
      items.push({ cat: slug, id: Number(id), title: item.title })
    }

    if (!items.length) {
      console.log(`  ✗ ${col.slug}: resolves to nothing`)
      broken++
    }

    out.push({
      slug: col.slug, title: col.title, blurb: col.blurb,
      group: col.group, scene: col.scene, count: items.length, items
    })
  }

  if (broken) {
    console.log(`\n  ${broken} broken reference(s). Nothing written.`)
    process.exit(1)
  }

  const bytes = writeJSON(path.join(DATA, 'dua', 'collections.json'), { groups: GROUPS, collections: out })

  const total = [...dua.values()].reduce((a, m) => a + m.size, 0)
  for (const g of GROUPS) {
    const n = out.filter(c => c.group === g.id)
    log(`  ${g.label.padEnd(26)} ${n.length} collections · ${n.reduce((a, c) => a + c.count, 0)} entries`)
  }
  log(`  ${out.length} collections over ${used.size} of the ${total} duas · ${kb(bytes)}`)
}

main()
