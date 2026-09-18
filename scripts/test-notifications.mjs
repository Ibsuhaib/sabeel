// Two things about prayer notifications that cannot be checked by looking at the
// app, because they only go wrong days later and only on a phone.
//
// The first is that two alarms must never share an id. Android identifies an
// alarm by an integer and scheduling the same integer twice replaces the first,
// so a collision does not error — it silently drops a prayer, and nobody finds
// out until the adhan does not sound.
//
// The second is that there must be enough room to arm a whole week. Arming only
// a day meant the adhan stopped as soon as someone went a day without opening
// Sabeel, which is precisely the person relying on being called.
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, log } from './_util.mjs'

// The module dynamically imports the Capacitor plugins, so the pure function is
// lifted out of the source rather than imported — the same approach test-swipe
// takes, and for the same reason.
const src = fs.readFileSync(path.join(ROOT, 'src', 'lib', 'native.js'), 'utf8')
const slot = src.slice(src.indexOf('const SLOT ='), src.indexOf('const idFor'))
const fn = src.slice(src.indexOf('const idFor'), src.indexOf('export async function scheduleNative'))
const idFor = new Function(`${slot}\n${fn}\nreturn idFor`)()

let failed = 0
const fail = m => { failed++; console.log(`  ✗ ${m}`) }

/* ------------------------- no two alarms may collide ---------------------- */

const PRAYERS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha']
const HOUR = { fajr: 5, sunrise: 6, dhuhr: 12, asr: 15, maghrib: 18, isha: 20 }

// A fortnight, so the check covers more than the week actually armed.
const items = []
for (let day = 0; day < 14; day++) {
  for (const p of PRAYERS) {
    const at = new Date(2026, 8, 18 + day, HOUR[p], 30)
    items.push({ prayer: p, kind: 'adhan', at })
    items.push({ prayer: p, kind: 'reminder', at: new Date(at.getTime() - 15 * 60000) })
  }
}

const seen = new Map()
for (const it of items) {
  const id = idFor(it)
  const label = `${it.at.toDateString()} ${it.prayer} ${it.kind}`
  if (seen.has(id)) fail(`id ${id} is used by both "${seen.get(id)}" and "${label}"`)
  else seen.set(id, label)
}
if (seen.size === items.length) log(`  ${items.length} alarms over a fortnight, ${seen.size} distinct ids · no collisions`)

// Android requires a Java int.
for (const it of items) {
  const id = idFor(it)
  if (!Number.isInteger(id) || id < 1 || id > 2147483647) fail(`id ${id} is not a positive 32-bit integer`)
}

// Re-arming must replace, not duplicate: the same prayer on the same day has to
// produce the same number every time it is scheduled.
const again = items.map(idFor)
if (again.some((id, i) => id !== idFor(items[i]))) fail('idFor is not stable for the same item')
else log('  the same prayer always produces the same id, so re-arming replaces rather than duplicates')

/* --------------------- a week has to fit inside the cap ------------------- */

const notif = fs.readFileSync(path.join(ROOT, 'src', 'lib', 'notifications.js'), 'utf8')
const horizon = Number(/const NATIVE_HORIZON_HOURS = 24 \* (\d+)/.exec(notif)?.[1])
const cap = Number(/items\.slice\(0, (\d+)\)/.exec(src)?.[1])

if (!horizon) fail('NATIVE_HORIZON_HOURS is not declared as a number of days')
else if (horizon < 7) fail(`the Android horizon is ${horizon} days; a week is the point of it`)
else log(`  Android is armed ${horizon} days ahead, so the adhan survives a week without opening the app`)

// Worst case per day: five fard, sunrise, and a reminder before each.
const worstPerDay = (5 + 1) * 2
if (!cap) fail('the notification cap could not be read from native.js')
else if (cap < horizon * worstPerDay) {
  fail(`cap is ${cap} but a ${horizon}-day week can need ${horizon * worstPerDay} alarms — the last days would be dropped`)
} else {
  log(`  cap of ${cap} holds the ${horizon * worstPerDay} alarms a full week can need`)
}

// upcoming() must actually look far enough ahead to produce them.
if (!/export function upcoming\(settings, from = new Date\(\), hours = HORIZON_HOURS\)/.test(notif)) {
  fail('upcoming() does not take a horizon, so the native window cannot be widened')
}
if (!/dayOffset < days/.test(notif)) fail('upcoming() still walks a fixed number of days')
if (!/upcoming\(settings, new Date\(\), native \? NATIVE_HORIZON_HOURS : HORIZON_HOURS\)/.test(notif)) {
  fail('schedule() does not pass the native horizon')
}

/* --------------------------------- done ---------------------------------- */

log('Sabeel · Prayer notifications')
if (failed) { console.log(`\n  ${failed} problem(s).`); process.exit(1) }
log(`  ${seen.size} ids checked · a week of prayers fits · nothing can overwrite another prayer.`)
