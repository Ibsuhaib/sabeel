// Time actually spent reading the Quran, and the streak that comes out of it.
//
// Counted only while a reading screen is open AND the app is in the foreground,
// in short ticks — so leaving the reader open on a locked phone overnight does
// not award you eight hours. A streak that can be earned by accident is worth
// nothing.
import { get, set } from 'idb-keyval'
import { dateKey } from './format.js'

const KEY = 'reading.log'
const DAY = 86400000

// A tick is only banked if the previous one was recent; a gap means the app was
// backgrounded or the phone slept, and that time is not reading.
export const TICK_MS = 5000
const MAX_GAP_MS = 20000

export const DEFAULT_GOAL_MIN = 10
export const MILESTONES = [3, 7, 14, 30, 60, 100, 180, 365, 500, 1000]

export async function readLog() {
  const raw = (await get(KEY)) || {}
  const out = {}
  for (const [k, v] of Object.entries(raw)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) continue
    const secs = Number(v)
    if (Number.isFinite(secs) && secs > 0) out[k] = Math.min(secs, 86400)
  }
  return out
}

export async function addSeconds(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return null
  const log = await readLog()
  const k = dateKey()
  log[k] = Math.min(86400, (log[k] || 0) + seconds)

  // Keep two years; beyond that nobody is looking and it is only bytes.
  const cutoff = dateKey(new Date(Date.now() - 730 * DAY))
  for (const key of Object.keys(log)) if (key < cutoff) delete log[key]

  await set(KEY, log)
  return log
}

export function secondsOn(log, date = new Date()) {
  return log[dateKey(date)] || 0
}

// A day counts towards the streak once the goal is met. Today being unfinished
// does not break it — the streak is measured from yesterday backwards, plus
// today if today is already done.
export function streak(log, goalMinutes = DEFAULT_GOAL_MIN, today = new Date()) {
  const goal = Math.max(1, goalMinutes) * 60
  let n = 0
  let day = new Date(today)
  if ((log[dateKey(day)] || 0) < goal) day = new Date(day.getTime() - DAY)
  for (let i = 0; i < 2000; i++) {
    if ((log[dateKey(day)] || 0) < goal) break
    n++
    day = new Date(day.getTime() - DAY)
  }
  return n
}

export function bestStreak(log, goalMinutes = DEFAULT_GOAL_MIN) {
  const goal = Math.max(1, goalMinutes) * 60
  const days = Object.keys(log).filter(k => log[k] >= goal).sort()
  let best = 0
  let run = 0
  let prev = null
  for (const k of days) {
    const isNext = prev && Math.round((new Date(k) - new Date(prev)) / DAY) === 1
    run = isNext ? run + 1 : 1
    best = Math.max(best, run)
    prev = k
  }
  return best
}

// Sunday-first, to match how the week reads on a phone calendar.
export function thisWeek(log, today = new Date()) {
  const start = new Date(today)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - start.getDay())
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start.getTime() + i * DAY)
    return {
      date: d,
      key: dateKey(d),
      seconds: log[dateKey(d)] || 0,
      isToday: dateKey(d) === dateKey(today),
      isFuture: d > today
    }
  })
}

export function nextMilestone(current) {
  return MILESTONES.find(m => m > current) ?? null
}

export function totals(log) {
  const values = Object.values(log)
  return {
    days: values.length,
    seconds: values.reduce((a, b) => a + b, 0),
    best: values.reduce((a, b) => Math.max(a, b), 0)
  }
}

export function fmtDuration(seconds) {
  if (!seconds) return '0m'
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  if (h > 0) return m ? `${h}h ${m}m` : `${h}h`
  if (seconds < 60) return `${Math.round(seconds)}s`
  return `${m}m`
}
