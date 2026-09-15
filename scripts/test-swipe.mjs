// The muṣḥaf turns the way an Arabic book turns, and that is easy to get
// backwards — it is the opposite of every English-language pager. This asserts
// the mapping directly so it cannot quietly flip again.
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, log } from './_util.mjs'

// The component imports React, so the pure function is lifted out of the source
// rather than imported — this keeps the test free of a DOM and a bundler.
const src = fs.readFileSync(path.join(ROOT, 'src', 'components', 'SwipePager.jsx'), 'utf8')
const consts = [...src.matchAll(/^const (COMPLETE_FRACTION|FLICK_VELOCITY) = ([\d.]+)/gm)]
  .map(m => `const ${m[1]} = ${m[2]};`).join('\n')
const fn = src.slice(src.indexOf('export function decideSwipe'), src.indexOf('export default function SwipePager'))
  .replace('export function', 'function')

const decideSwipe = new Function(`${consts}\n${fn}\nreturn decideSwipe`)()

let failed = 0
const is = (got, want, what) => {
  if (got === want) return
  failed++
  console.log(`  \u2717 ${what}: expected ${want}, got ${got}`)
}

log('Sabeel \u00b7 Swipe direction')

const W = 400
const slow = { width: W, elapsed: 600, canNext: true, canPrev: true }

// The heart of it: right is forward, as the page is carried over the spine.
is(decideSwipe({ ...slow, deltaX: 150 }), 'next', 'dragging right turns to the next page')
is(decideSwipe({ ...slow, deltaX: -150 }), 'prev', 'dragging left goes back')

// A flick counts even when it is short.
is(decideSwipe({ width: W, elapsed: 80, canNext: true, canPrev: true, deltaX: 60 }), 'next', 'a quick flick right')
is(decideSwipe({ width: W, elapsed: 80, canNext: true, canPrev: true, deltaX: -60 }), 'prev', 'a quick flick left')

// A small, slow drag is a change of mind.
is(decideSwipe({ ...slow, deltaX: 30 }), null, 'a short slow drag springs back')
is(decideSwipe({ ...slow, deltaX: -30 }), null, 'a short slow drag back springs back')
is(decideSwipe({ ...slow, deltaX: 0 }), null, 'no movement does nothing')

// The ends of the book.
is(decideSwipe({ ...slow, deltaX: 150, canNext: false }), null, 'cannot go past the last page')
is(decideSwipe({ ...slow, deltaX: -150, canPrev: false }), null, 'cannot go back past the first')

// A cancelled gesture must never reach this — but if it did, a zero delta is
// the one thing it reliably carries, and that has to mean nothing.
is(decideSwipe({ ...slow, deltaX: 0, canNext: true, canPrev: true }), null, 'a zero delta is never a page turn')

if (failed) { console.log(`\n  ${failed} wrong.`); process.exit(1) }
log('  10 checks passed \u00b7 right is forward, left is back.')
