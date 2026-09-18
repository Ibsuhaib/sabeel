import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import TabBar from './components/TabBar.jsx'
import Player from './components/Player.jsx'
import { useReciterSync } from './lib/reciters.js'
import { usePrayerNotifications } from './lib/usePrayerNotifications.js'
import { applyNativeChrome, wireBackButton } from './lib/native.js'
import { Loading } from './components/ui.jsx'
import { useSettings } from './lib/settings.jsx'

import Home from './pages/Home.jsx'
import QuranIndex from './pages/QuranIndex.jsx'
import SurahReader from './pages/SurahReader.jsx'
import HadithIndex from './pages/HadithIndex.jsx'
import Prayer from './pages/Prayer.jsx'
import DuaIndex from './pages/DuaIndex.jsx'
import More from './pages/More.jsx'
import Onboarding from './pages/Onboarding.jsx'

const Mushaf = lazy(() => import('./pages/Mushaf.jsx'))
const HadithLookup = lazy(() => import('./pages/HadithLookup.jsx'))
const Notifications = lazy(() => import('./pages/Notifications.jsx'))
const OfflineAudio = lazy(() => import('./pages/OfflineAudio.jsx'))
const Khatm = lazy(() => import('./pages/Khatm.jsx'))
const HadithCollection = lazy(() => import('./pages/HadithCollection.jsx'))
const HadithBook = lazy(() => import('./pages/HadithBook.jsx'))
const DuaCategory = lazy(() => import('./pages/DuaCategory.jsx'))
const Collection = lazy(() => import('./pages/Collection.jsx'))
const Names = lazy(() => import('./pages/Names.jsx'))
const Tasbih = lazy(() => import('./pages/Tasbih.jsx'))
const Qibla = lazy(() => import('./pages/Qibla.jsx'))
const Tracker = lazy(() => import('./pages/Tracker.jsx'))
const Search = lazy(() => import('./pages/Search.jsx'))
const Settings = lazy(() => import('./pages/Settings.jsx'))
const Zakat = lazy(() => import('./pages/Zakat.jsx'))
const Calendar = lazy(() => import('./pages/Calendar.jsx'))
const Bookmarks = lazy(() => import('./pages/Bookmarks.jsx'))
const Timetable = lazy(() => import('./pages/Timetable.jsx'))
const About = lazy(() => import('./pages/About.jsx'))

export default function App() {
  const { settings } = useSettings()
  // Keep the global player pointed at the chosen reciter for the whole session,
  // not just while a reader screen happens to be mounted.
  useReciterSync(settings.reciter)
  // Arms prayer notifications for the session and plays the chosen sound when
  // one fires while the app is alive.
  usePrayerNotifications(settings)
  // Match the Android status bar to the theme and dismiss the splash once React
  // has actually painted something.
  useEffect(() => { applyNativeChrome(settings.theme) }, [settings.theme])
  const exitHint = useAndroidBack()
  if (!settings.onboarded) return <Onboarding />

  return (
    <div className="max-w-2xl mx-auto min-h-full">
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Home />} />

          <Route path="/quran" element={<QuranIndex />} />
          <Route path="/quran/:n" element={<SurahReader />} />
          <Route path="/mushaf" element={<Mushaf />} />
          <Route path="/mushaf/:page" element={<Mushaf />} />

          <Route path="/hadith" element={<HadithIndex />} />
          <Route path="/hadith/lookup" element={<HadithLookup />} />
          <Route path="/hadith/:id" element={<HadithCollection />} />
          <Route path="/hadith/:id/:book" element={<HadithBook />} />

          <Route path="/prayer" element={<Prayer />} />
          <Route path="/prayer/timetable" element={<Timetable />} />
          <Route path="/qibla" element={<Qibla />} />
          <Route path="/tracker" element={<Tracker />} />

          <Route path="/dua" element={<DuaIndex />} />
          <Route path="/dua/names" element={<Names />} />
          <Route path="/dua/tasbih" element={<Tasbih />} />
          <Route path="/dua/:slug" element={<DuaCategory />} />
          <Route path="/for/:slug" element={<Collection />} />

          <Route path="/more" element={<More />} />
          <Route path="/search" element={<Search />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/offline-audio" element={<OfflineAudio />} />
          <Route path="/khatm" element={<Khatm />} />
          <Route path="/zakat" element={<Zakat />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/bookmarks" element={<Bookmarks />} />
          <Route path="/about" element={<About />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <Player />
      <TabBar />
      {exitHint && (
        <div className="fixed bottom-24 inset-x-0 z-50 flex justify-center pointer-events-none px-4">
          <span className="px-4 py-2 rounded-full bg-surf border border-line text-xs text-muted shadow-lg">
            Press back again to close Sabeel
          </span>
        </div>
      )}
    </div>
  )
}

// Android's hardware back button. Without this, back closes the app from any
// screen, which reads as a crash. Here it unwinds the app's own history and
// only exits from home, on a second press — the convention Android users expect.
function useAndroidBack() {
  const nav = useNavigate()
  const location = useLocation()
  const depth = useRef(0)
  const [hint, setHint] = useState(false)

  // Track how far in we are, so we never pop past the app's first screen.
  useEffect(() => { depth.current += 1 }, [location.key])

  useEffect(() => {
    let dispose = () => {}
    let alive = true
    wireBackButton({
      atRoot: () => window.location.hash === '' || window.location.hash === '#/' ,
      canGoBack: () => depth.current > 1,
      goBack: () => { depth.current = Math.max(1, depth.current - 2); nav(-1) },
      toRoot: () => nav('/')
    }).then(off => { if (alive) dispose = off; else off() })

    const onHint = () => {
      setHint(true)
      setTimeout(() => setHint(false), 2000)
    }
    window.addEventListener('sabeel:press-back-again', onHint)
    return () => { alive = false; dispose(); window.removeEventListener('sabeel:press-back-again', onHint) }
  }, [nav])

  return hint
}
