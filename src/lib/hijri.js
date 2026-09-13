// Hijri dates come from Intl's islamic-umalqura calendar — no library and no
// table to maintain. The offset lets a user match their local moonsighting,
// which genuinely differs by country.
const PARTS = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', {
  day: 'numeric', month: 'numeric', year: 'numeric'
})

export const HIJRI_MONTHS = [
  'Muharram', 'Safar', 'Rabi’ al-Awwal', 'Rabi’ al-Thani',
  'Jumada al-Ula', 'Jumada al-Akhirah', 'Rajab', 'Sha’ban',
  'Ramadan', 'Shawwal', 'Dhu al-Qi’dah', 'Dhu al-Hijjah'
]

export function hijri(date = new Date(), offsetDays = 0) {
  const d = new Date(date.getTime() + offsetDays * 86400000)
  const parts = Object.fromEntries(PARTS.formatToParts(d).map(p => [p.type, p.value]))
  const month = parseInt(parts.month, 10)
  const day = parseInt(parts.day, 10)
  const year = parseInt(String(parts.year).replace(/\D/g, ''), 10)
  return {
    day,
    month,
    monthName: HIJRI_MONTHS[month - 1] || parts.month,
    year,
    formatted: `${day} ${HIJRI_MONTHS[month - 1] || ''} ${year} AH`
  }
}

// Fixed Hijri dates. The Gregorian equivalent is always computed, never stored.
export const ISLAMIC_EVENTS = [
  { m: 1, d: 1, name: 'Islamic New Year' },
  { m: 1, d: 10, name: 'Day of Ashura', note: 'Fasting the 9th and 10th is recommended' },
  { m: 8, d: 15, name: 'Mid-Sha’ban' },
  { m: 9, d: 1, name: 'First of Ramadan' },
  { m: 9, d: 21, name: 'Last ten nights begin', note: 'Seek Laylat al-Qadr in the odd nights' },
  { m: 10, d: 1, name: 'Eid al-Fitr' },
  { m: 12, d: 1, name: 'Dhu al-Hijjah begins', note: 'The first ten days are the most beloved to Allah' },
  { m: 12, d: 9, name: 'Day of Arafah', note: 'Fasting expiates the past and coming year for non-pilgrims' },
  { m: 12, d: 10, name: 'Eid al-Adha' }
]

export function isWhiteDay(date, offsetDays = 0) {
  const h = hijri(date, offsetDays)
  return h.day >= 13 && h.day <= 15
}

export function isRamadan(date = new Date(), offsetDays = 0) {
  return hijri(date, offsetDays).month === 9
}

// Walk forward day by day to find the Gregorian date of each Hijri event.
// 400 days covers a full Hijri year with room to spare.
export function upcomingEvents(offsetDays = 0, limit = 6) {
  const found = []
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  for (let i = 0; i < 400 && found.length < limit; i++) {
    const d = new Date(start.getTime() + i * 86400000)
    const h = hijri(d, offsetDays)
    const ev = ISLAMIC_EVENTS.find(e => e.m === h.month && e.d === h.day)
    if (ev) found.push({ ...ev, date: d, hijri: h, inDays: i })
  }
  return found
}
