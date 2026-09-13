import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { store } from '../lib/store.js'
import { quranMeta } from '../lib/data.js'
import { relativeDay } from '../lib/format.js'
import { Screen, Header, Card, Loading, Empty, Button } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'

export default function Bookmarks() {
  const [tab, setTab] = useState('quran')
  const [quran, setQuran] = useState(null)
  const [hadith, setHadith] = useState(null)
  const [notes, setNotes] = useState(null)
  const [names, setNames] = useState({})

  useEffect(() => {
    store.bookmarksQuran().then(setQuran)
    store.bookmarksHadith().then(setHadith)
    store.notes().then(setNotes)
    quranMeta().then(m => setNames(Object.fromEntries(m.surahs.map(s => [s.n, s.en]))))
  }, [])

  if (!quran || !hadith || !notes) return <Loading />

  const noteList = Object.entries(notes).sort((a, b) => b[1].at - a[1].at)
  const counts = { quran: quran.length, hadith: hadith.length, notes: noteList.length }

  return (
    <Screen>
      <Header title="Saved" subtitle="Everything here lives on this device" back />

      <div className="flex gap-2 px-4 pt-3">
        {[['quran', 'Ayahs'], ['hadith', 'Hadith'], ['notes', 'Notes']].map(([id, label]) => (
          <button
            key={id} onClick={() => setTab(id)}
            className={`tap chip px-3.5 py-1.5 rounded-full text-xs border transition-colors ${
              tab === id ? 'border-brand bg-brand/10 text-brand' : 'border-line text-muted'
            }`}
          >
            {label} <span className="tabular-nums opacity-60">{counts[id]}</span>
          </button>
        ))}
      </div>

      {tab === 'quran' && (
        quran.length === 0
          ? <Empty icon="bookmark" title="No saved ayahs" body="Tap an ayah while reading, then Save." action={<Button to="/quran">Open the Quran</Button>} />
          : <div className="px-4 mt-4 space-y-2">
              {quran.map(b => (
                <Card key={b.id} className="p-0 overflow-hidden">
                  <Link to={`/quran/${b.surah}?ayah=${b.ayah}`} className="tap block px-4 py-3 active:bg-bg">
                    <p className="text-[11px] text-brand font-medium">{names[b.surah]} · {b.id}</p>
                    <p className="text-[13px] text-muted mt-1 leading-relaxed line-clamp-3">{b.snippet}</p>
                    <p className="text-[10px] text-muted/60 mt-2">Saved {relativeDay(b.at)}</p>
                  </Link>
                  <button
                    onClick={async () => setQuran(await store.toggleQuranBookmark(b.surah, b.ayah))}
                    className="tap w-full py-2 text-[11px] text-muted border-t border-line"
                  >Remove</button>
                </Card>
              ))}
            </div>
      )}

      {tab === 'hadith' && (
        hadith.length === 0
          ? <Empty icon="bookmark" title="No saved hadith" body="Tap the bookmark on any hadith to keep it here." action={<Button to="/hadith">Open the collections</Button>} />
          : <div className="px-4 mt-4 space-y-2">
              {hadith.map(b => (
                <Card key={b.id} className="p-0 overflow-hidden">
                  <Link to={`/hadith/${b.collection}/${b.book}?n=${b.n}`} className="tap block px-4 py-3 active:bg-bg">
                    <p className="text-[11px] text-brand font-medium">{b.collectionName} · {b.n}</p>
                    <p className="text-[13px] text-muted mt-1 leading-relaxed line-clamp-3">{b.snippet}</p>
                    <p className="text-[10px] text-muted/60 mt-2">Saved {relativeDay(b.at)}</p>
                  </Link>
                  <button
                    onClick={async () => setHadith(await store.toggleHadithBookmark(b.collection, b.book, b.n))}
                    className="tap w-full py-2 text-[11px] text-muted border-t border-line"
                  >Remove</button>
                </Card>
              ))}
            </div>
      )}

      {tab === 'notes' && (
        noteList.length === 0
          ? <Empty icon="note" title="No notes yet" body="Tap an ayah while reading and choose Note to write a private reflection." />
          : <div className="px-4 mt-4 space-y-2">
              {noteList.map(([id, n]) => {
                const [sn, av] = id.split(':')
                return (
                  <Card key={id} as={Link} to={`/quran/${sn}?ayah=${av}`} className="tap block px-4 py-3 active:bg-bg">
                    <p className="text-[11px] text-brand font-medium">{names[sn]} · {id}</p>
                    <p className="text-[13px] mt-1.5 leading-relaxed whitespace-pre-wrap">{n.text}</p>
                    <p className="text-[10px] text-muted/60 mt-2">
                      <Icon name="note" size={10} className="inline mr-1 -mt-0.5" />Written {relativeDay(n.at)}
                    </p>
                  </Card>
                )
              })}
            </div>
      )}
    </Screen>
  )
}
