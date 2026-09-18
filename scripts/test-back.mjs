// Back should go up a level, not replay where you have been.
//
// Reported from a phone: "when i use back or cancle button of my phone its going
// back like a browser". It was — both the hardware button and the arrow in the
// corner called history.back(). In a HashRouter app that unwinds every hash
// change one at a time, so leaving a surah you reached from search meant pressing
// back through four screens you had already finished with.
//
// Written against the route table rather than the implementation, so a route
// added without a parent shows up here instead of silently sending someone home
// from the middle of the app.
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, log } from './_util.mjs'

const { parentOf } = await import('../src/lib/up.js')

let failed = 0
const fail = m => { failed++; console.log(`  ✗ ${m}`) }
const is = (from, want) => {
  const got = parentOf(from)
  if (got !== want) fail(`back from ${from} went to ${got}, expected ${want}`)
}

log('Sabeel · Back goes up')

/* ------------------------------ the hierarchy ----------------------------- */

is('/', null)                            // nothing above home; this is where it exits
is('/quran', '/')
is('/hadith', '/')
is('/prayer', '/')
is('/dua', '/')

is('/quran/18', '/quran')
is('/mushaf/294', '/quran')
is('/khatm', '/quran')
is('/offline-audio', '/quran')

is('/hadith/bukhari', '/hadith')
is('/hadith/bukhari/52', '/hadith/bukhari')   // a book goes back to its collection
is('/hadith/lookup', '/hadith')

is('/prayer/timetable', '/prayer')
is('/notifications', '/prayer')               // it is the prayer notification screen
is('/qibla', '/prayer')
is('/tracker', '/prayer')

is('/dua/morning-dhikr', '/dua')
is('/dua/tasbih', '/dua')
is('/for/anxious', '/dua')                    // the new collections sit under dua

is('/settings', '/')
is('/about', '/')
is('/search', '/')

// Trailing slashes must not change the answer.
is('/quran/18/', '/quran')
is('/dua/', '/')

/* ------------------- every route in the app has a parent ------------------ */

const app = fs.readFileSync(path.join(ROOT, 'src', 'App.jsx'), 'utf8')
const routes = [...app.matchAll(/<Route path="([^"]+)"/g)]
  .map(m => m[1])
  .filter(p => p !== '*' && p !== '/')

// Stand-in values for the parameters, so a real path can be tested.
const SAMPLE = { ':n': '18', ':page': '294', ':id': 'bukhari', ':book': '52', ':slug': 'anxious' }
const fill = p => p.split('/').map(s => SAMPLE[s] ?? s).join('/')

let orphans = 0
for (const route of routes) {
  const p = fill(route)
  const up = parentOf(p)
  if (up === null) { fail(`${p} thinks it is the root`); continue }
  if (up === p) { fail(`${p} is its own parent — back would do nothing`); continue }
  if (up !== '/' && !routes.some(r => fill(r) === up)) {
    fail(`${p} goes up to ${up}, which is not a route`)
  }
  if (up === '/' && !/^\/[^/]+$/.test(p)) orphans++
}
log(`  ${routes.length} routes, every one of them leads somewhere`)
if (orphans) log(`  (${orphans} nested route(s) fall back to home — deliberate for menu screens)`)

/* ----------------------- and both back buttons use it --------------------- */

const ui = fs.readFileSync(path.join(ROOT, 'src', 'components', 'ui.jsx'), 'utf8')
if (/onClick=\{\(\) => nav\(-1\)\}/.test(ui)) {
  fail('the header arrow still calls nav(-1), so it replays history')
}
if (!ui.includes('parentOf')) fail('the header arrow does not use parentOf')

const appSrc = fs.readFileSync(path.join(ROOT, 'src', 'App.jsx'), 'utf8')
if (!appSrc.includes('parentOf')) fail('the Android back button does not use parentOf')
if (/goBack: \(\) => \{[^}]*nav\(-1\)/.test(appSrc)) {
  fail('the Android back button still calls nav(-1)')
}

if (failed) { console.log(`\n  ${failed} problem(s).`); process.exit(1) }
log('  Back goes one level up, from the hardware button and the arrow alike.')
