import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import TabBar from './components/TabBar.jsx'
import Player from './components/Player.jsx'
import { useReciterSync } from './lib/reciters.js'
import { usePrayerNotifications } from './lib/usePrayerNotifications.js'
import { applyNativeChrome } from './lib/native.js'
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
    </div>
  )
}
