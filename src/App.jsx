import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import TabBar from './components/TabBar.jsx'
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
  if (!settings.onboarded) return <Onboarding />

  return (
    <div className="max-w-2xl mx-auto min-h-full">
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Home />} />

          <Route path="/quran" element={<QuranIndex />} />
          <Route path="/quran/:n" element={<SurahReader />} />

          <Route path="/hadith" element={<HadithIndex />} />
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
          <Route path="/zakat" element={<Zakat />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/bookmarks" element={<Bookmarks />} />
          <Route path="/about" element={<About />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <TabBar />
    </div>
  )
}
