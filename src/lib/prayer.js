// Prayer times are computed on-device with adhan-js. No network, works on a plane.
// Every number the app shows can be traced back through `explain()` — Part 3.3,
// "Why this time". If we cannot explain it, we should not display it.
import * as adhan from 'adhan'

export const METHODS = [
  { id: 'MuslimWorldLeague', label: 'Muslim World League', note: 'Fajr 18°, Isha 17°' },
  { id: 'Egyptian', label: 'Egyptian General Authority', note: 'Fajr 19.5°, Isha 17.5°' },
  { id: 'Karachi', label: 'University of Islamic Sciences, Karachi', note: 'Fajr 18°, Isha 18°' },
  { id: 'UmmAlQura', label: 'Umm al-Qura, Makkah', note: 'Fajr 18.5°, Isha 90 min after Maghrib' },
  { id: 'Dubai', label: 'Dubai', note: 'Fajr 18.2°, Isha 18.2°' },
  { id: 'Qatar', label: 'Qatar', note: 'Fajr 18°, Isha 90 min after Maghrib' },
  { id: 'Kuwait', label: 'Kuwait', note: 'Fajr 18°, Isha 17.5°' },
  { id: 'Singapore', label: 'Singapore', note: 'Fajr 20°, Isha 18°' },
  { id: 'Turkey', label: 'Diyanet, Turkey', note: 'Fajr 18°, Isha 17°' },
  { id: 'NorthAmerica', label: 'ISNA, North America', note: 'Fajr 15°, Isha 15°' },
  { id: 'MoonsightingCommittee', label: 'Moonsighting Committee', note: 'Seasonal, Fajr 18°, Isha 18°' },
  { id: 'Tehran', label: 'Tehran', note: 'Fajr 17.7°, Isha 14°' },
  { id: 'Other', label: 'Other / manual', note: 'Fajr 0°, Isha 0° — set offsets yourself' }
]

export const HIGH_LAT_RULES = [
  { id: 'MiddleOfTheNight', label: 'Middle of the night', note: 'Fajr and Isha capped at the midpoint of the night' },
  { id: 'SeventhOfTheNight', label: 'One-seventh of the night', note: 'Night split into sevenths' },
  { id: 'TwilightAngle', label: 'Twilight angle', note: 'Proportional to the calculation method angle' }
]

export const PRAYERS = [
  { id: 'fajr', label: 'Fajr', isPrayer: true },
  { id: 'sunrise', label: 'Sunrise', isPrayer: false },
  { id: 'dhuhr', label: 'Dhuhr', isPrayer: true },
  { id: 'asr', label: 'Asr', isPrayer: true },
  { id: 'maghrib', label: 'Maghrib', isPrayer: true },
  { id: 'isha', label: 'Isha', isPrayer: true }
]

export const FARD = PRAYERS.filter(p => p.isPrayer)

export function buildParams(settings) {
  const factory = adhan.CalculationMethod[settings.method] || adhan.CalculationMethod.MuslimWorldLeague
  const params = factory()
  params.madhab = settings.madhab === 'hanafi' ? adhan.Madhab.Hanafi : adhan.Madhab.Shafi
  params.highLatitudeRule = adhan.HighLatitudeRule[settings.highLatitudeRule] || adhan.HighLatitudeRule.MiddleOfTheNight
  params.adjustments = { ...params.adjustments, ...settings.adjustments }
  return params
}

export function timesFor(settings, date = new Date()) {
  if (!settings.location) return null
  const { lat, lng } = settings.location
  const coords = new adhan.Coordinates(lat, lng)
  const params = buildParams(settings)
  const pt = new adhan.PrayerTimes(coords, date, params)
  const sunnah = new adhan.SunnahTimes(pt)
  return {
    fajr: pt.fajr,
    sunrise: pt.sunrise,
    dhuhr: pt.dhuhr,
    asr: pt.asr,
    maghrib: pt.maghrib,
    isha: pt.isha,
    middleOfNight: sunnah.middleOfTheNight,
    lastThird: sunnah.lastThirdOfTheNight,
    _params: params
  }
}

// Duha begins about 15 minutes after sunrise and ends shortly before Dhuhr.
export function duhaWindow(t) {
  if (!t) return null
  return {
    start: new Date(t.sunrise.getTime() + 15 * 60000),
    end: new Date(t.dhuhr.getTime() - 10 * 60000)
  }
}

const ORDER = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha']

export function nextPrayer(settings, now = new Date()) {
  const today = timesFor(settings, now)
  if (!today) return null
  for (const id of ORDER) {
    if (today[id] > now) {
      return { id, label: PRAYERS.find(p => p.id === id).label, time: today[id], isNextDay: false }
    }
  }
  const tomorrow = timesFor(settings, new Date(now.getTime() + 86400000))
  return { id: 'fajr', label: 'Fajr', time: tomorrow.fajr, isNextDay: true }
}

export function currentPrayer(settings, now = new Date()) {
  const t = timesFor(settings, now)
  if (!t) return null
  for (const id of [...ORDER].reverse()) if (now >= t[id]) return id
  return 'isha'
}

// The transparency sheet. Everything here is derived from the live parameters,
// so it can never drift out of sync with the times actually shown.
export function explain(settings) {
  const t = timesFor(settings)
  if (!t) return null
  const p = t._params
  const m = METHODS.find(x => x.id === settings.method)
  const hl = HIGH_LAT_RULES.find(x => x.id === settings.highLatitudeRule)
  const hanafi = settings.madhab === 'hanafi'
  return {
    method: m?.label || settings.method,
    methodNote: m?.note || '',
    fajrAngle: p.fajrAngle,
    ishaAngle: p.ishaAngle,
    ishaInterval: p.ishaInterval,
    madhab: hanafi ? 'Hanafi' : 'Shafi’i / Maliki / Hanbali',
    shadowRatio: hanafi
      ? 'Asr begins when a shadow is 2× the object length, plus the noon shadow'
      : 'Asr begins when a shadow is 1× the object length, plus the noon shadow',
    highLatitude: hl?.label || settings.highLatitudeRule,
    highLatitudeNote: hl?.note || '',
    coords: settings.location ? `${settings.location.lat.toFixed(4)}, ${settings.location.lng.toFixed(4)}` : '—',
    place: settings.location?.label || 'Unknown location',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    adjustments: Object.entries(settings.adjustments).filter(([, v]) => v !== 0)
  }
}

export function qiblaBearing(settings) {
  if (!settings.location) return null
  return adhan.Qibla(new adhan.Coordinates(settings.location.lat, settings.location.lng))
}

export function monthTimetable(settings, year, month) {
  const rows = []
  const days = new Date(year, month + 1, 0).getDate()
  for (let d = 1; d <= days; d++) {
    const date = new Date(year, month, d)
    const t = timesFor(settings, date)
    if (t) rows.push({ date, ...t })
  }
  return rows
}
