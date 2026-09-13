// Build-time: dua, adhkar and the 99 Names. Every entry keeps its source attribution.
import path from 'node:path'
import { DATA, getJSON, writeJSON, log, kb } from './_util.mjs'

const CDN = 'https://cdn.jsdelivr.net/gh/fitrahive/dua-dhikr@main/data/dua-dhikr'

const CATEGORIES = [
  { slug: 'morning-dhikr',     title: 'Morning Adhkar',      blurb: 'Recited after Fajr until sunrise',    icon: 'sunrise' },
  { slug: 'evening-dhikr',     title: 'Evening Adhkar',      blurb: 'Recited after Asr until Maghrib',     icon: 'sunset' },
  { slug: 'dhikr-after-salah', title: 'After Salah',         blurb: 'Said after each obligatory prayer',   icon: 'prayer' },
  { slug: 'daily-dua',         title: 'Daily Duas',          blurb: 'Waking, eating, leaving home, sleep', icon: 'day' },
  { slug: 'selected-dua',      title: 'Selected Duas',       blurb: 'Duas from the Quran and Sunnah',      icon: 'book' }
]

async function main() {
  log('Sabeel · Dua pipeline')
  let total = 0
  const index = []

  for (const cat of CATEGORIES) {
    process.stdout.write(`  ${cat.slug} ... `)
    const rows = await getJSON(`${CDN}/${cat.slug}/en.json`)
    const items = rows.map((r, i) => ({
      id: i + 1,
      title: r.title || '',
      ar: r.arabic || '',
      tr: r.latin || '',
      en: r.translation || '',
      notes: r.notes || null,
      benefits: r.benefits || null,
      source: r.source || null,
      count: r.count || 1
    }))
    total += writeJSON(path.join(DATA, 'dua', `${cat.slug}.json`), { ...cat, items })
    index.push({ ...cat, count: items.length })
    log(`${items.length} entries`)
  }

  process.stdout.write('  99 Names of Allah ... ')
  const asma = await getJSON('https://api.aladhan.com/v1/asmaAlHusna')
  const names = asma.data.map(n => ({
    n: n.number,
    ar: n.name,
    tr: n.transliteration,
    en: n.en?.meaning || ''
  }))
  if (names.length !== 99) throw new Error(`expected 99 names, got ${names.length}`)
  total += writeJSON(path.join(DATA, 'dua', 'asma-ul-husna.json'), { names })
  log(`${names.length} names`)

  total += writeJSON(path.join(DATA, 'dua', 'index.json'), { categories: index })
  log(`  wrote ${CATEGORIES.length + 2} files, ${kb(total)}`)
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
