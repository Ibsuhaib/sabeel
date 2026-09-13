import { NavLink, useLocation } from 'react-router-dom'
import Icon from './Icon.jsx'

// Five tabs. Not six. Everything else lives under More — Part 6.
const TABS = [
  { to: '/quran', icon: 'quran', label: 'Quran' },
  { to: '/hadith', icon: 'hadith', label: 'Hadith' },
  { to: '/prayer', icon: 'prayer', label: 'Prayer' },
  { to: '/dua', icon: 'dua', label: 'Dua' },
  { to: '/more', icon: 'more', label: 'More' }
]

export default function TabBar() {
  const { pathname } = useLocation()
  // The muṣḥaf page is sacred space — no chrome over the text while reading.
  if (/^\/quran\/\d+/.test(pathname)) return null

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-bg/95 backdrop-blur-md border-t border-line safe-b">
      <div className="flex max-w-2xl mx-auto">
        {TABS.map(t => (
          <NavLink
            key={t.to} to={t.to}
            className={({ isActive }) =>
              `tap flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                isActive ? 'text-brand' : 'text-muted'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon name={t.icon} size={22} strokeWidth={isActive ? 1.9 : 1.5} />
                {t.label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
