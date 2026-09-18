// Where "back" goes.
//
// It used to call history.back(), which is what a browser does: it replays where
// you have been. Inside an app that is wrong, and it feels wrong — open a surah
// from search, tap through four screens, and getting out means pressing back four
// times through places you have already finished with. Worse, the app is a
// HashRouter, so anything that changes the hash is another step to unwind.
//
// An app goes *up* instead: to the screen this one sits under, once, however you
// arrived. That is what the Android back button does in every app people already
// know, and what the arrow in the corner should agree with.
//
// Ordered, first match wins. Anything unlisted goes home, so a screen added later
// is never a dead end.
const PARENTS = [
  [/^\/quran\/\d+/, '/quran'],
  [/^\/mushaf/, '/quran'],
  [/^\/khatm/, '/quran'],
  [/^\/offline-audio/, '/quran'],

  [/^\/hadith\/lookup/, '/hadith'],
  [/^\/hadith\/[^/]+\/[^/]+/, m => `/hadith/${m[0].split('/')[2]}`],
  [/^\/hadith\/[^/]+/, '/hadith'],

  [/^\/prayer\/timetable/, '/prayer'],
  [/^\/notifications/, '/prayer'],
  [/^\/qibla/, '/prayer'],
  [/^\/tracker/, '/prayer'],

  [/^\/dua\/[^/]+/, '/dua'],
  [/^\/for\/[^/]+/, '/dua'],

  // The five tabs, and everything reached from the menu, sit directly under home.
  [/^\/(quran|hadith|prayer|dua)\/?$/, '/'],
  [/^\/[^/]+\/?$/, '/']
]

/**
 * The screen above this one, or null if this is already the root.
 */
export function parentOf(pathname) {
  const p = (pathname || '/').replace(/\/+$/, '') || '/'
  if (p === '/') return null
  for (const [pattern, parent] of PARENTS) {
    const m = pattern.exec(p)
    if (m) return typeof parent === 'function' ? parent(m) : parent
  }
  return '/'
}
