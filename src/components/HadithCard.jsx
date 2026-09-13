import { useState } from 'react'
import Icon from './Icon.jsx'

// Part 7.1: never display a hadith without its grading and the grader's name.
// Gradings differ between scholars, so we show every grading we have rather
// than picking one — the attribution is the point.
function gradeTone(grade = '') {
  const g = grade.toLowerCase()
  if (g.includes('mawdu') || g.includes('fabricat')) return 'bg-red-500/15 text-red-400 border-red-500/30'
  if (g.includes('da’if') || g.includes('daif') || g.includes("da'if") || g.includes('weak')) return 'bg-amber-500/15 text-amber-500 border-amber-500/30'
  if (g.includes('hasan')) return 'bg-sky-500/15 text-sky-400 border-sky-500/30'
  if (g.includes('sahih') || g.includes('authentic')) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
  return 'bg-surf text-muted border-line'
}

export function GradeList({ grades, sahihByCompilation, collectionName }) {
  const [open, setOpen] = useState(false)

  if (sahihByCompilation) {
    return (
      <div className="mt-3 flex items-start gap-2 text-[11px] text-muted">
        <Icon name="check" size={13} className="text-emerald-500 shrink-0 mt-0.5" />
        <span>
          Authentic by the compiler's own criteria. {collectionName} is accepted in its entirety
          by the scholars of hadith, so individual gradings are not given.
        </span>
      </div>
    )
  }

  if (!grades?.length) {
    return (
      <div className="mt-3 flex items-start gap-2 text-[11px] text-amber-500">
        <Icon name="warn" size={13} className="shrink-0 mt-0.5" />
        <span>No grading is recorded for this narration in our source. Verify before acting on it.</span>
      </div>
    )
  }

  const shown = open ? grades : grades.slice(0, 2)
  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-1.5">
        {shown.map((g, i) => (
          <span key={i} className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] ${gradeTone(g.grade)}`}>
            <strong className="font-semibold">{g.grade}</strong>
            <span className="opacity-70">· {g.by}</span>
          </span>
        ))}
        {grades.length > 2 && (
          <button onClick={() => setOpen(!open)} className="tap px-2 py-1 rounded-lg border border-line text-[11px] text-muted">
            {open ? 'Show fewer' : `+${grades.length - 2} more gradings`}
          </button>
        )}
      </div>
    </div>
  )
}

export default function HadithCard({ hadith, collection, book, bookmarked, onBookmark, showArabic = true }) {
  const [copied, setCopied] = useState(false)

  const reference = `${collection.name} ${hadith.n}` +
    (hadith.ref ? ` · Book ${hadith.ref.book}, Hadith ${hadith.ref.hadith}` : '')

  async function copy() {
    const grades = (hadith.g || []).map(g => `${g.grade} (${g.by})`).join('; ')
    const text = `${hadith.ar}\n\n${hadith.en}\n\n— ${reference}${grades ? `\nGrading: ${grades}` : ''}`
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1600) } catch { /* blocked */ }
  }

  return (
    <article className="px-4 py-5 border-b border-line">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[11px] tabular-nums px-2 py-0.5 rounded-md bg-surf border border-line text-muted">
          {hadith.n}
        </span>
        <span className="text-[11px] text-muted truncate flex-1">{book?.title}</span>
        <button onClick={onBookmark} className={`tap p-1.5 rounded-lg ${bookmarked ? 'text-brand' : 'text-muted'}`} aria-label="Save hadith">
          <Icon name="bookmark" size={16} fill={bookmarked ? 'currentColor' : 'none'} />
        </button>
        <button onClick={copy} className="tap p-1.5 rounded-lg text-muted" aria-label="Copy hadith">
          <Icon name={copied ? 'check' : 'copy'} size={16} />
        </button>
      </div>

      {showArabic && hadith.ar && <p className="ar ar-sm mb-4">{hadith.ar}</p>}

      <p className="translation text-ink/90">{hadith.en}</p>

      <GradeList
        grades={hadith.g}
        sahihByCompilation={collection.sahihByCompilation}
        collectionName={collection.name}
      />

      <p className="mt-3 text-[11px] text-muted/80">{reference}</p>
    </article>
  )
}
