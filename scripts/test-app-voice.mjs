// Nothing the app says to someone holding a phone should be addressed to
// someone looking at a browser tab.
//
// This was asked for after finding, in the installed app, a note saying "Your
// browser has not marked this storage as permanent… Installing Sabeel to your
// home screen usually fixes that" — advice to install the app, inside the app.
// There were several more of the same kind, and they are easy to write without
// noticing, because on the web every one of them is true.
//
// The rule is not that the word may never appear. Sabeel really does run in a
// browser as well, and there the browser is the right thing to talk about. The
// rule is that a file which says it must also know which one it is talking to.
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, log } from './_util.mjs'

// Words that are only meaningful to someone in a browser.
const BROWSER_TALK = /browser|home screen|address bar|padlock|browser tab/i

// Evidence that a file distinguishes the two. Any of these means the sentence
// is on a branch rather than shown to everyone.
const KNOWS_PLATFORM = [
  'useIsNative',
  'isNative',
  'level !== \'best\'',
  'level === \'best\'',
  'canNotify === false',
  'supported()'
]

// Comments are for whoever reads the source; only what reaches a screen counts.
const stripComments = src => src
  .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '')   // {/* jsx */}
  .replace(/\/\*[\s\S]*?\*\//g, '')             // /* block */
  .replace(/(^|[^:"'`])\/\/[^\n]*/g, '$1')      // // line, but not a URL

const files = []
const walk = dir => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p)
    else if (/\.(js|jsx)$/.test(e.name)) files.push(p)
  }
}
walk(path.join(ROOT, 'src'))

let failed = 0
let guarded = 0
const offenders = []

for (const file of files) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/')
  const raw = fs.readFileSync(file, 'utf8')
  const code = stripComments(raw)

  const lines = code.split('\n')
    .map((line, i) => ({ n: i + 1, line }))
    .filter(({ line }) => BROWSER_TALK.test(line))
  if (!lines.length) continue

  if (KNOWS_PLATFORM.some(marker => code.includes(marker))) { guarded++; continue }

  failed++
  offenders.push({ rel, lines })
}

log('Sabeel · It should sound like an app')

if (offenders.length) {
  for (const o of offenders) {
    console.log(`  ✗ ${o.rel} talks about the browser but never asks which platform it is on:`)
    for (const { n, line } of o.lines.slice(0, 3)) console.log(`      ${n}: ${line.trim().slice(0, 96)}`)
  }
  console.log('')
  console.log('    Use useIsNative() and say the true thing for each: inside the APK there is no')
  console.log('    tab, the storage is the app’s own, Android settings are not site settings,')
  console.log('    and it is already installed.')
  process.exit(1)
}

log(`  ${guarded} file(s) mention the browser, and every one of them checks the platform first`)

/* -------------------- the specific things that were wrong ----------------- */

// A test notification is the one button whose entire purpose is to prove that
// notifications work, and it went through an API the WebView does not provide.
const notif = fs.readFileSync(path.join(ROOT, 'src', 'lib', 'notifications.js'), 'utf8')
const send = notif.slice(notif.indexOf('export async function sendTest'))
if (!/if \(await isNative\(\)\) return testNative/.test(send.slice(0, 600))) {
  console.log('  ✗ sendTest() does not take Android’s own path, so the test button cannot work in the APK')
  process.exit(1)
}
log('  the test notification goes through Android in the app, not the web API it does not have')

// The storage warning is true on the web and false in the app.
const dl = fs.readFileSync(path.join(ROOT, 'src', 'components', 'DownloadAudio.jsx'), 'utf8')
if (!/native !== false \|\| persisted !== false/.test(dl)) {
  console.log('  ✗ the storage-permanence note is not held back from the installed app')
  process.exit(1)
}
log('  the storage warning is shown on the web only, where it is true')

log('  Nothing tells someone holding the app to go and install the app.')
