// The store copy has hard limits, and Play enforces them at upload time — after
// you have already built and signed. Checking here costs nothing.
//
// This caught the short description at 82 characters against a limit of 80,
// sitting under a line claiming it was exactly 80.
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, log } from './_util.mjs'

const LIMITS = { name: 30, short: 80, full: 4000 }
const s = fs.readFileSync(path.join(ROOT, 'STORE-LISTING.md'), 'utf8')

const block = re => re.exec(s)?.[1]?.trim()
const fields = {
  name: block(/## App name[\s\S]*?```\n([\s\S]*?)\n```/),
  short: block(/## Short description[\s\S]*?```\n([\s\S]*?)\n```/),
  full: block(/## Full description[\s\S]*?```\n([\s\S]*?)\n```/)
}

let bad = 0
log('Sabeel \u00b7 Store listing')
for (const [k, limit] of Object.entries(LIMITS)) {
  const v = fields[k]
  if (!v) { console.log(`  \u2717 ${k}: not found in STORE-LISTING.md`); bad++; continue }
  const n = [...v].length
  if (n > limit) { console.log(`  \u2717 ${k}: ${n} characters, limit ${limit}`); bad++ }
  else log(`  ${k.padEnd(6)} ${String(n).padStart(4)} / ${limit}`)
}

if (bad) { console.log(`\n  ${bad} field(s) would be rejected.`); process.exit(1) }
