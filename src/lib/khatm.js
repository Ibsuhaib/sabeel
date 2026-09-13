// The khatm planner: finish the Quran by a date, and know what to read today.
//
// The muṣḥaf's 604 pages are the unit, because a page is the thing people
// actually count ("I read three pages") and because the 604-page Madani
// pagination is already in the data.
//
// Today's target is recomputed from what is *left*, not fixed at the start:
//
//     today = ceil(pages remaining / days remaining, inclusive)
//
// Miss a day and tomorrow asks for slightly more; read ahead and tomorrow asks
// for less. A fixed daily figure is what makes these plans feel like a debt
// collector by week two, and is why people abandon them.
import { hijriMonthRange } from './hijri.js'
import { dateKey } from './format.js'

export const TOTAL_PAGES = 604
export const TOTAL_JUZ = 30
export const PLAN_VERSION = 2

const DAY = 86400000
const midnight = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
export const daysBetween = (a, b) => Math.round((midnight(b) - midnight(a)) / DAY)
export const addDays = (d, n) => new Date(midnight(d).getTime() + n * DAY)

const clampPage = n => Math.max(0, Math.min(TOTAL_PAGES, Math.round(Number(n) || 0)))

/* ------------------------------ persistence ------------------------------ */

// Anything read back from storage is untrusted: a half-written plan, one from an
// older version, or a date that no longer parses should degrade to something
// sensible rather than crashing the screen or — far worse for a plan people
// rely on — silently reporting the wrong progress.
export function normalise(raw) {
  if (!raw || typeof raw !== 'object') return null

  const start = new Date(raw.startDate)
  const end = new Date(raw.endDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null
  if (midnight(end) < midnight(start)) return null

  const startPage = Math.min(TOTAL_PAGES, Math.max(1, Math.round(Number(raw.startPage) || 1)))

  // The log is the history; drop anything malformed rather than trusting it.
  const log = {}
  for (const [k, v] of Object.entries(raw.log || {})) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) continue
    const page = clampPage(v)
    if (page > 0) log[k] = page
  }

  // Progress can never be below the start page, nor below the furthest day in
  // the log — that is how a failed write used to lose days of reading.
  const highestLogged = Object.values(log).reduce((a, b) => Math.max(a, b), 0)
  const page = Math.max(clampPage(raw.page), startPage - 1, highestLogged)

  return {
    v: PLAN_VERSION,
    createdAt: Number(raw.createdAt) || Date.now(),
    startDate: midnight(start).toISOString(),
    endDate: midnight(end).toISOString(),
    label: typeof raw.label === 'string' && raw.label.trim() ? raw.label.trim() : `${daysBetween(start, end) + 1} days`,
    preset: raw.preset || null,
    ramadan: raw.ramadan || null,
    startPage,
    page,
    log,
    autoSync: raw.autoSync !== false,
    paused: !!raw.paused
  }
}

export function createPlan({ days, endDate, label, startPage = 1, startDate = new Date(), preset = null }) {
  const start = midnight(startDate)
  const end = endDate ? midnight(endDate) : addDays(start, Math.max(1, days) - 1)
  return normalise({
    createdAt: Date.now(),
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    label: label || `${daysBetween(start, end) + 1} days`,
    preset,
    startPage,
    page: startPage - 1,
    log: {},
    autoSync: true,
    paused: false
  })
}

// Ramadan is the reason most people make one of these, so it is a preset with
// the real dates rather than "30 days from now".
export function ramadanPlan(offsetDays = 0) {
  const r = hijriMonthRange(9, { offsetDays })
  if (!r) return null
  const today = midnight(new Date())
  const start = r.first > today ? r.first : today
  return normalise({
    ...createPlan({ startDate: start, endDate: r.last, label: `Ramadan ${r.year}`, preset: 'ramadan' }),
    ramadan: { first: r.first.toISOString(), last: r.last.toISOString(), days: r.days, year: r.year }
  })
}

/* -------------------------------- progress ------------------------------- */

export function progress(plan, today = new Date()) {
  if (!plan) return null
  const start = new Date(plan.startDate)
  const end = new Date(plan.endDate)
  const now = midnight(today)

  const totalPages = TOTAL_PAGES - (plan.startPage - 1)
  const donePages = Math.max(0, plan.page - (plan.startPage - 1))
  const remaining = Math.max(0, TOTAL_PAGES - plan.page)

  const totalDays = daysBetween(start, end) + 1
  const daysLeft = Math.max(0, daysBetween(now, end) + 1)
  const notStarted = now < start

  // Measured against the end of YESTERDAY, not the end of today. Today's pages
  // have not been missed — the day is still going. Counting them as owed is what
  // makes a plan greet you with "behind" on the morning you create it.
  const daysCompleted = Math.min(totalDays, Math.max(0, daysBetween(start, now)))
  const expectedPage = plan.startPage - 1 + Math.round((totalPages * daysCompleted) / totalDays)
  const drift = plan.page - expectedPage

  const perDay = daysLeft > 0 ? Math.ceil(remaining / daysLeft) : remaining
  const todayFrom = Math.min(TOTAL_PAGES, plan.page + 1)
  const todayTo = Math.min(TOTAL_PAGES, plan.page + perDay)

  const finished = plan.page >= TOTAL_PAGES
  const overdue = !finished && daysLeft === 0

  return {
    totalPages,
    donePages,
    remaining,
    percent: totalPages ? Math.min(100, (donePages / totalPages) * 100) : 0,
    totalDays,
    daysCompleted,
    daysLeft,
    notStarted,
    finished,
    overdue,
    paused: !!plan.paused,
    expectedPage,
    drift,
    status: finished ? 'done'
      : plan.paused ? 'paused'
      : overdue ? 'overdue'
      : drift > 0 ? 'ahead'
      : drift >= -3 ? 'ontrack'
      : 'behind',
    perDay,
    today: { from: todayFrom, to: todayTo, pages: Math.max(0, todayTo - todayFrom + 1) },
    readToday: pagesReadOn(plan, now),
    juzDone: Math.floor((plan.page / TOTAL_PAGES) * TOTAL_JUZ),
    startDate: start,
    endDate: end
  }
}

function previousLogged(plan, day) {
  const cut = dateKey(day)
  const keys = Object.keys(plan.log).filter(k => k < cut).sort()
  return keys.length ? plan.log[keys[keys.length - 1]] : plan.startPage - 1
}

// Pages covered on a given day, from the log alone.
export function pagesReadOn(plan, day) {
  const reached = plan.log[dateKey(day)]
  if (reached == null) return 0
  return Math.max(0, reached - previousLogged(plan, day))
}

/* ------------------------------- schedule -------------------------------- */

// The whole plan, day by day. Past days come from the log; future days are a
// projection at the current pace, which is what keeps the list honest — it
// moves as you get ahead or fall behind instead of showing a fantasy set on
// day one.
export function schedule(plan, today = new Date()) {
  const start = new Date(plan.startDate)
  const end = new Date(plan.endDate)
  const now = midnight(today)
  const totalDays = daysBetween(start, end) + 1
  const todayKey = dateKey(now)

  const rows = []
  let cursor = plan.startPage - 1     // page reached walking forwards through history
  let projected = plan.page           // where the future picks up

  for (let i = 0; i < totalDays; i++) {
    const date = addDays(start, i)
    const key = dateKey(date)

    if (key < todayKey) {
      const reached = plan.log[key]
      const from = cursor + 1
      if (reached != null && reached > cursor) {
        rows.push({ date, key, from, to: reached, pages: reached - cursor, state: 'done' })
        cursor = reached
      } else {
        rows.push({ date, key, from, to: cursor, pages: 0, state: 'missed' })
      }
      continue
    }

    const daysLeftFromHere = daysBetween(date, end) + 1
    const remainingFromHere = Math.max(0, TOTAL_PAGES - projected)
    const per = daysLeftFromHere > 0 ? Math.ceil(remainingFromHere / daysLeftFromHere) : remainingFromHere
    const from = Math.min(TOTAL_PAGES, projected + 1)
    const to = Math.min(TOTAL_PAGES, projected + per)

    // Today, once something has been logged, must report what was actually read
    // rather than the projection — otherwise "best day" and the row disagree
    // with the "pages read today" figure on the same screen.
    const loggedToday = key === todayKey ? plan.log[key] : null
    if (loggedToday != null) {
      const actualFrom = Math.min(TOTAL_PAGES, previousLogged(plan, date) + 1)
      rows.push({
        date, key,
        from: actualFrom,
        to: loggedToday,
        pages: Math.max(0, loggedToday - (actualFrom - 1)),
        state: 'done'
      })
      projected = Math.max(projected, loggedToday)
      continue
    }

    rows.push({
      date, key, from, to,
      pages: Math.max(0, to - from + 1),
      state: key === todayKey ? 'today' : 'future'
    })
    projected = to
  }
  return rows
}

// Consecutive days up to today (or yesterday, if today is still open) on which
// something was actually read.
export function streak(plan, today = new Date()) {
  let n = 0
  let day = midnight(today)
  if (!plan.log[dateKey(day)]) day = addDays(day, -1)
  const startKey = dateKey(new Date(plan.startDate))
  while (dateKey(day) >= startKey && plan.log[dateKey(day)]) {
    n++
    day = addDays(day, -1)
  }
  return n
}

export function stats(plan, today = new Date()) {
  const rows = schedule(plan, today)
  const past = rows.filter(r => r.state === 'done' || r.state === 'missed')
  const daysRead = past.filter(r => r.state === 'done').length
  const pagesRead = Math.max(0, plan.page - (plan.startPage - 1))
  const best = past.reduce((b, r) => (r.pages > (b?.pages ?? 0) ? r : b), null)
  return {
    daysRead,
    daysMissed: past.filter(r => r.state === 'missed').length,
    consistency: past.length ? Math.round((daysRead / past.length) * 100) : null,
    streak: streak(plan, today),
    bestDay: best && best.pages > 0 ? best : null,
    averagePerActiveDay: daysRead ? Math.round(pagesRead / daysRead) : 0
  }
}

/* -------------------------------- mutation ------------------------------- */

// Marking progress always moves forward only — re-reading a page you have
// already covered must not undo the plan.
export function markPage(plan, page, when = new Date()) {
  const next = Math.max(plan.page, clampPage(page))
  if (next <= plan.page && plan.log[dateKey(when)] === plan.page) return plan
  return normalise({ ...plan, page: next, log: { ...plan.log, [dateKey(when)]: next } })
}

export function completeToday(plan, when = new Date()) {
  return markPage(plan, progress(plan, when).today.to, when)
}

export const setPaused = (plan, paused) => normalise({ ...plan, paused: !!paused })
export const setAutoSync = (plan, on) => normalise({ ...plan, autoSync: !!on })

export function extendBy(plan, days) {
  return normalise({ ...plan, endDate: addDays(new Date(plan.endDate), Math.max(1, days)).toISOString() })
}

// Push the end date out just far enough to make the daily target manageable
// again — the humane alternative to abandoning a plan you have fallen behind on.
export function relaxTo(plan, pagesPerDay, today = new Date()) {
  const remaining = Math.max(0, TOTAL_PAGES - plan.page)
  const needed = Math.ceil(remaining / Math.max(1, pagesPerDay))
  return normalise({ ...plan, endDate: addDays(midnight(today), Math.max(0, needed - 1)).toISOString() })
}

/* -------------------------------- presets -------------------------------- */

export const PRESETS = [
  { id: 'ramadan', label: 'This Ramadan', note: 'The whole month, real dates' },
  { id: '7', label: 'One week', note: '87 pages a day' },
  { id: '30', label: '30 days', note: 'About 20 pages a day' },
  { id: '60', label: '2 months', note: 'About 10 pages a day' },
  { id: '90', label: '3 months', note: 'About 7 pages a day' },
  { id: '180', label: '6 months', note: 'About 3 pages a day' },
  { id: '365', label: 'One year', note: 'Just under 2 pages a day' }
]

export function describePace(days) {
  const perDay = TOTAL_PAGES / Math.max(1, days)
  if (perDay >= 1.5) return `about ${Math.round(perDay)} pages a day`
  if (perDay >= 1) return `about ${perDay.toFixed(1)} pages a day`
  return `about ${Math.round(1 / perDay)} days per page`
}
