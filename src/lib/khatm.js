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

const DAY = 86400000
const midnight = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
export const daysBetween = (a, b) => Math.round((midnight(b) - midnight(a)) / DAY)

export function createPlan({ days, endDate, label, startPage = 1, startDate = new Date() }) {
  const start = midnight(startDate)
  const end = endDate ? midnight(endDate) : midnight(new Date(start.getTime() + (days - 1) * DAY))
  return {
    createdAt: Date.now(),
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    label: label || `${daysBetween(start, end) + 1} days`,
    startPage,
    page: Math.max(0, startPage - 1),   // last page completed
    log: {}                             // dateKey -> page reached that day
  }
}

// Ramadan is the reason most people make one of these, so it is a preset with
// the real dates rather than "30 days from now".
export function ramadanPlan(offsetDays = 0) {
  const r = hijriMonthRange(9, { offsetDays })
  if (!r) return null
  const today = midnight(new Date())
  // If Ramadan has already begun, plan from today to its last night.
  const start = r.first > today ? r.first : today
  return {
    ...createPlan({ startDate: start, endDate: r.last, label: `Ramadan ${r.year}` }),
    preset: 'ramadan',
    ramadan: { first: r.first.toISOString(), last: r.last.toISOString(), days: r.days, year: r.year }
  }
}

export function progress(plan, today = new Date()) {
  if (!plan) return null
  const start = new Date(plan.startDate)
  const end = new Date(plan.endDate)
  const now = midnight(today)

  const totalPages = TOTAL_PAGES - (plan.startPage - 1)
  const donePages = Math.max(0, plan.page - (plan.startPage - 1))
  const remaining = Math.max(0, TOTAL_PAGES - plan.page)

  const totalDays = daysBetween(start, end) + 1
  const elapsed = Math.min(totalDays, Math.max(0, daysBetween(start, now) + 1))
  const daysLeft = Math.max(0, daysBetween(now, end) + 1)

  // Measured against the end of YESTERDAY, not the end of today. Today's pages
  // have not been missed — the day is still going. Counting them as owed is what
  // makes a plan greet you with "behind" on the morning you start it.
  const daysCompleted = Math.min(totalDays, Math.max(0, daysBetween(start, now)))
  const expectedPage = plan.startPage - 1 + Math.round((totalPages * daysCompleted) / totalDays)
  const drift = plan.page - expectedPage

  const perDay = daysLeft > 0 ? Math.ceil(remaining / daysLeft) : remaining
  const reachedToday = plan.log[dateKey(now)]
  const reachedYesterday = plan.log[dateKey(new Date(now.getTime() - DAY))] ?? plan.startPage - 1
  const readToday = reachedToday ? Math.max(0, reachedToday - reachedYesterday) : 0

  const todayFrom = Math.min(TOTAL_PAGES, plan.page + 1)
  const todayTo = Math.min(TOTAL_PAGES, plan.page + perDay)

  return {
    totalPages,
    donePages,
    remaining,
    percent: totalPages ? Math.min(100, (donePages / totalPages) * 100) : 0,
    totalDays,
    elapsed,
    daysLeft,
    finished: plan.page >= TOTAL_PAGES,
    overdue: daysLeft === 0 && plan.page < TOTAL_PAGES,
    expectedPage,
    drift,                       // + ahead of plan, - behind
    status: plan.page >= TOTAL_PAGES ? 'done' : drift > 0 ? 'ahead' : drift >= -3 ? 'ontrack' : 'behind',
    perDay,
    today: { from: todayFrom, to: todayTo, pages: Math.max(0, todayTo - todayFrom + 1) },
    readToday,
    juzDone: Math.floor((plan.page / TOTAL_PAGES) * TOTAL_JUZ),
    startDate: start,
    endDate: end
  }
}

// Marking progress always moves forward only — re-reading a page you have
// already covered should not undo the plan.
export function markPage(plan, page, when = new Date()) {
  const next = Math.max(plan.page, Math.min(TOTAL_PAGES, Math.round(page)))
  return { ...plan, page: next, log: { ...plan.log, [dateKey(when)]: next } }
}

export function completeToday(plan, when = new Date()) {
  const p = progress(plan, when)
  return markPage(plan, p.today.to, when)
}

// A plan that finishes on a date the app can describe.
export const PRESETS = [
  { id: 'ramadan', label: 'This Ramadan', note: 'The whole month, real dates' },
  { id: '30', label: '30 days', note: 'About 20 pages a day', days: 30 },
  { id: '60', label: '2 months', note: 'About 10 pages a day', days: 60 },
  { id: '90', label: '3 months', note: 'About 7 pages a day', days: 90 },
  { id: '180', label: '6 months', note: 'About 3 pages a day', days: 180 },
  { id: '365', label: 'One year', note: 'Just under 2 pages a day', days: 365 }
]

export function describePace(days) {
  const perDay = TOTAL_PAGES / days
  if (perDay >= 1) return `about ${perDay < 2 ? perDay.toFixed(1) : Math.round(perDay)} page${perDay >= 1.5 ? 's' : ''} a day`
  return `about ${Math.round(1 / perDay)} days per page`
}
