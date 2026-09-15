import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

const KEY = 'sabeel.settings.v1'

export const DEFAULTS = {
  theme: 'dark',                 // light | dark | sepia | black
  arabicFont: 'Amiri Quran',     // Amiri Quran | Scheherazade New | Noto Naskh Arabic
  arabicSize: 30,
  arabicLeading: 2.1,
  translationSize: 15,
  dyslexicFont: false,
  showTranslation: true,
  showTransliteration: false,
  readerMode: 'scroll',          // scroll | mushaf (604-page Madani layout)
  readingGoalMinutes: 10,        // the daily goal the reading streak is measured against
  translation: 'en',             // en = Saheeh International, e2 = Clear Quran
  reciter: 'Alafasy_128kbps',
  method: 'MuslimWorldLeague',
  madhab: 'shafi',               // shafi | hanafi  (affects Asr only)
  highLatitudeRule: 'MiddleOfTheNight',
  polarCircleResolution: 'AqrabYaum',   // inside the polar circles, see prayer.js
  adjustments: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
  location: null,                // { lat, lng, label }
  hijriOffset: 0,
  notifications: {
    enabled: false,
    sound: 'adhan',            // adhan | beep | silent
    adhanId: 'aaqib-azeez',    // built-in recording for every prayer but Fajr
    fajrAdhanId: 'aaqib-azeez',// Fajr has its own: it carries the tathwīb
    useCustomAdhan: false,     // the user's own file, kept in IndexedDB
    useCustomFajrAdhan: false,
    volume: 1,
    vibrate: true,
    reminderMinutes: 0,        // "prayer is in N minutes" nudge, 0 = off
    notifySunrise: false,
    perPrayer: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true }
  },
  onboarded: false
}

const Ctx = createContext(null)

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULTS }
    const saved = JSON.parse(raw)
    // `notifications` used to be a boolean; anything non-object is discarded.
    const savedNotif = saved.notifications && typeof saved.notifications === 'object' ? saved.notifications : {}
    return {
      ...DEFAULTS,
      ...saved,
      adjustments: { ...DEFAULTS.adjustments, ...(saved.adjustments || {}) },
      notifications: {
        ...DEFAULTS.notifications,
        ...savedNotif,
        perPrayer: { ...DEFAULTS.notifications.perPrayer, ...(savedNotif.perPrayer || {}) }
      }
    }
  } catch {
    return { ...DEFAULTS }
  }
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(load)

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(settings)) } catch { /* private mode */ }

    const root = document.documentElement
    root.classList.remove('theme-dark', 'theme-sepia', 'theme-black')
    if (settings.theme !== 'light') root.classList.add(`theme-${settings.theme}`)
    root.classList.toggle('dyslexic', settings.dyslexicFont)

    const s = root.style
    s.setProperty('--font-arabic', `'${settings.arabicFont}'`)
    s.setProperty('--ar-size', `${settings.arabicSize}px`)
    s.setProperty('--ar-leading', String(settings.arabicLeading))
    s.setProperty('--tr-size', `${settings.translationSize}px`)

    const dark = settings.theme === 'dark' || settings.theme === 'black'
    document.querySelector('meta[name=theme-color]')
      ?.setAttribute('content', settings.theme === 'black' ? '#000000' : dark ? '#0f1711' : '#faf9f6')
  }, [settings])

  const value = useMemo(() => ({
    settings,
    set: (patch) => setSettings(p => ({ ...p, ...patch })),
    setAdjustment: (k, v) => setSettings(p => ({ ...p, adjustments: { ...p.adjustments, [k]: v } })),
    reset: () => setSettings({ ...DEFAULTS })
  }), [settings])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSettings() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useSettings must be used inside SettingsProvider')
  return v
}
