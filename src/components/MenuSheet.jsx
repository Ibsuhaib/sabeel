import { Link } from 'react-router-dom'
import { Sheet } from './ui.jsx'
import Icon from './Icon.jsx'

// Everything that is not a tab. With Home taking a tab slot, this is what keeps
// every section one tap from the home screen instead of buried.
const GROUPS = [
  {
    title: 'Read',
    items: [
      { to: '/mushaf/1', icon: 'book', label: 'Muṣḥaf pages', note: '604-page Madani layout' },
      { to: '/khatm', icon: 'calendar', label: 'Khatm plan', note: 'Finish the Quran by a date' },
      { to: '/bookmarks', icon: 'bookmark', label: 'Saved', note: 'Ayahs, hadith and notes' },
      { to: '/search', icon: 'search', label: 'Search everything', note: 'Quran, hadith and dua at once' }
    ]
  },
  {
    title: 'Worship',
    items: [
      { to: '/qibla', icon: 'compass', label: 'Qibla', note: 'Direction of the Kaaba' },
      { to: '/tracker', icon: 'chart', label: 'Prayer tracker', note: 'Heatmap, streaks and qada' },
      { to: '/prayer/timetable', icon: 'calendar', label: 'Monthly timetable', note: 'Printable prayer times' },
      { to: '/notifications', icon: 'prayer', label: 'Prayer notifications', note: 'Adhan, chime or silent' },
      { to: '/dua/tasbih', icon: 'counter', label: 'Tasbih', note: 'Counter with haptics' },
      { to: '/dua/names', icon: 'star', label: '99 Names of Allah', note: 'Asma ul-Husna' }
    ]
  },
  {
    title: 'Tools',
    items: [
      { to: '/hadith/lookup', icon: 'hadith', label: 'Hadith by reference', note: 'Look up “bukhari 1302”' },
      { to: '/calendar', icon: 'calendar', label: 'Hijri calendar', note: 'Dates, fasts and events' },
      { to: '/zakat', icon: 'calc', label: 'Zakat calculator', note: 'Nisab and what is due' },
      { to: '/offline-audio', icon: 'download', label: 'Offline audio', note: 'Downloads and storage' }
    ]
  },
  {
    title: 'App',
    items: [
      { to: '/settings', icon: 'settings', label: 'Settings', note: 'Location, madhab, theme, data' },
      { to: '/about', icon: 'info', label: 'About Sabeel', note: 'Principles, sources, licences' }
    ]
  }
]

export default function MenuSheet({ open, onClose }) {
  return (
    <Sheet open={open} onClose={onClose} title="Everything in Sabeel">
      <div className="pb-4">
        {GROUPS.map(g => (
          <section key={g.title} className="mt-2">
            <h3 className="px-4 pt-3 pb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">{g.title}</h3>
            <div className="px-3">
              {g.items.map(i => (
                <Link
                  key={i.to} to={i.to} onClick={onClose}
                  className="tap flex items-center gap-3 px-3 py-2.5 rounded-xl active:bg-bg min-h-[52px]"
                >
                  <span className="w-9 h-9 rounded-xl bg-brand/10 text-brand grid place-items-center shrink-0">
                    <Icon name={i.icon} size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm truncate">{i.label}</span>
                    <span className="block text-[11px] text-muted truncate">{i.note}</span>
                  </span>
                  <Icon name="forward" size={16} className="text-muted shrink-0" />
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </Sheet>
  )
}
