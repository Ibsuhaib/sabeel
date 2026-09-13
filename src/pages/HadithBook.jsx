import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { hadithBook, hadithCollection } from '../lib/data.js'
import { store } from '../lib/store.js'
import { Screen, Header, Loading, LoadError, IconButton, Empty } from '../components/ui.jsx'
import { useData } from '../lib/useData.js'
import HadithCard from '../components/HadithCard.jsx'
import Icon from '../components/Icon.jsx'

const PAGE = 25

export default function HadithBook() {
  const { id, book } = useParams()
  const [params] = useSearchParams()
  const { data: loaded, error, retry } = useData(
    () => Promise.all([hadithBook(id, book), hadithCollection(id)]).then(([d, c]) => ({ d, c })),
    [id, book],
    { label: 'this book' }
  )
  const data = loaded?.d
  const collection = loaded?.c
  const [bookmarks, setBookmarks] = useState([])
  const [q, setQ] = useState('')
  const [showArabic, setShowArabic] = useState(true)
  const [limit, setLimit] = useState(PAGE)

  useEffect(() => { setLimit(PAGE) }, [id, book])

  useEffect(() => { store.bookmarksHadith().then(setBookmarks) }, [])

  useEffect(() => {
    const n = params.get('n')
    if (!data || !n) return
    requestAnimationFrame(() => document.getElementById(`h-${n}`)?.scrollIntoView({ block: 'center' }))
  }, [data, params])

  const saved = useMemo(() => new Set(bookmarks.map(b => b.id)), [bookmarks])

  const list = useMemo(() => {
    if (!data) return []
    const needle = q.trim().toLowerCase()
    if (!needle) return data.hadiths
    return data.hadiths.filter(h => h.en.toLowerCase().includes(needle) || String(h.n) === needle)
  }, [data, q])

  const meta = collection?.books.find(b => b.n === Number(book))

  if (error) return <LoadError message={error} onRetry={retry} />
  if (!data || !collection) return <Loading label="Loading hadith" />

  return (
    <Screen>
      <Header
        title={meta?.title || `Book ${book}`}
        subtitle={`${collection.name} · ${list.length} hadith`}
        back
        actions={
          <IconButton
            name="hadith" label={showArabic ? 'Hide Arabic' : 'Show Arabic'}
            onClick={() => setShowArabic(v => !v)} active={showArabic}
          />
        }
      />

      <div className="px-4 pt-3 pb-1">
        <input
          value={q} onChange={e => { setQ(e.target.value); setLimit(PAGE) }}
          placeholder="Search within this book"
          className="w-full px-4 py-2.5 rounded-xl bg-surf border border-line text-sm outline-none focus:border-brand"
        />
      </div>

      {list.length === 0 ? (
        <Empty icon="search" title="Nothing found" body={`No hadith in this book matches “${q}”.`} />
      ) : (
        <>
          <div>
            {list.slice(0, limit).map(h => (
              <div key={h.n} id={`h-${h.n}`} className="scroll-mt-20">
                <HadithCard
                  hadith={h} collection={collection} book={meta}
                  showArabic={showArabic}
                  bookmarked={saved.has(`${id}:${h.n}`)}
                  onBookmark={async () => setBookmarks(
                    await store.toggleHadithBookmark(id, Number(book), h.n, h.en.slice(0, 140), collection.name)
                  )}
                />
              </div>
            ))}
          </div>

          {limit < list.length && (
            <div className="px-4 py-6">
              <button
                onClick={() => setLimit(l => l + PAGE)}
                className="tap w-full py-3 rounded-xl bg-surf border border-line text-sm text-muted"
              >
                Show {Math.min(PAGE, list.length - limit)} more of {list.length}
              </button>
            </div>
          )}
        </>
      )}

      <BookNav collection={collection} current={Number(book)} />
    </Screen>
  )
}

function BookNav({ collection, current }) {
  const i = collection.books.findIndex(b => b.n === current)
  const prev = i > 0 ? collection.books[i - 1] : null
  const next = i >= 0 && i < collection.books.length - 1 ? collection.books[i + 1] : null
  return (
    <nav className="flex items-center justify-between gap-3 px-4 py-8">
      {prev ? (
        <Link to={`/hadith/${collection.id}/${prev.n}`} className="tap flex items-center gap-1.5 text-xs text-muted max-w-[45%]">
          <Icon name="back" size={14} /><span className="truncate">{prev.title}</span>
        </Link>
      ) : <span />}
      {next ? (
        <Link to={`/hadith/${collection.id}/${next.n}`} className="tap flex items-center gap-1.5 text-xs text-muted max-w-[45%] text-right">
          <span className="truncate">{next.title}</span><Icon name="forward" size={14} />
        </Link>
      ) : <span />}
    </nav>
  )
}
