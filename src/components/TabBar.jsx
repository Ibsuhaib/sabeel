import { NavLink, useLocation } from 'react-router-dom'
import Icon from './Icon.jsx'

// Home first, then the four things opened daily. Everything else lives in the
// menu behind the header button — the same shape the reference apps use, and
// the reason five tabs is still enough.
const TABS = [
  { to: '/', icon: 'home', label: 'Home', end: true },
  { to: '/quran', icon: 'quran', label: 'Quran' },
  { to: '/hadith', icon: 'hadith', label: 'Hadith' },
  { to: '/prayer', icon: 'prayer', label: 'Prayer' },
  { to: '/dua', icon: 'dua', label: 'Dua' }
]

export default function TabBar() {
  const { pathname } = useLocation()
  // The muṣḥaf page is sacred space — no chrome over the text while reading.
  if (/^\/quran\/\d+/.test(pathname) || /^\/mushaf/.test(pathname)) return null

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-bg/95 backdrop-blur-md border-t border-line safe-b">
      <div className="flex max-w-2xl mx-auto px-1">
        {TABS.map(t => (
          <NavLink
            key={t.to} to={t.to} end={t.end}
            className="tap flex-1 flex flex-col items-center gap-1 py-2 min-h-[56px]"
          >
            {({ isActive }) => (
              <>
                {/* The pill behind the active icon is what makes the current
                    tab readable at a glance on a small screen. */}
                {/* The pill grows into place and the icon lifts a little, so the
                    tab you just pressed is the one that moved. */}
                <span
                  className={`px-4 py-1 rounded-full transition-all duration-200 ease-out ${
                    isActive ? 'bg-brand/15 text-brand scale-105' : 'text-muted scale-100'
                  }`}
                >
                  <span className={`block transition-transform duration-200 ease-out ${isActive ? '-translate-y-px' : ''}`}>
                    <Icon name={t.icon} size={21} style={isActive ? undefined : 'line'} />
                  </span>
                </span>
                <span className={`text-[10px] font-medium ${isActive ? 'text-brand' : 'text-muted'}`}>{t.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
