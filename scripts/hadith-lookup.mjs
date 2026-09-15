// Finds a supplication inside the hadith corpus the app already ships, so every
// du'a we add cites a real reference and shows the collection's own vowelled
// Arabic — not text typed out from memory.
//
// The flow is: we supply a bare probe (the distinctive words of the du'a), the
// corpus is searched for it, and on a hit the *original* diacritised span is
// lifted back out of the narration along with the reference it sits at. An entry
// whose probe cannot be found anywhere does not get a source, and the build says so.
import fs from 'node:fs'
import path from 'node:path'
import { DATA } from './_util.mjs'
import { normaliseMapped, normalise, coverage } from './arabic.mjs'

const HADITH = path.join(DATA, 'hadith')

// Preference order when a phrase occurs in several collections: the two Sahihs
// first, then the remaining four Sunan, then the rest.
const RANK = ['bukhari', 'muslim', 'abudawud', 'tirmidhi', 'nasai', 'ibnmajah', 'malik', 'nawawi', 'qudsi', 'dehlawi']

let CORPUS = null

export function loadCorpus() {
  if (CORPUS) return CORPUS
  if (!fs.existsSync(HADITH)) throw new Error('hadith data missing — run `npm run data:hadith` first')

  const index = JSON.parse(fs.readFileSync(path.join(HADITH, 'index.json'), 'utf8'))
  const names = Object.fromEntries(index.collections.map(c => [c.id, c.name]))

  CORPUS = []
  for (const id of RANK) {
    const dir = path.join(HADITH, id)
    if (!fs.existsSync(dir)) continue
    for (const file of fs.readdirSync(dir)) {
      const book = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'))
      for (const h of book.hadiths || []) {
        if (!h.ar) continue
        const { norm, map } = normaliseMapped(h.ar)
        CORPUS.push({ col: id, name: names[id] || id, n: h.n, raw: h.ar, norm, map })
      }
    }
  }
  return CORPUS
}

export const corpusSize = () => loadCorpus().length

// Grow a matched span out to word boundaries in the original text, then strip the
// clause punctuation and direction marks the corpus uses around quoted speech —
// otherwise a du'a ends up displayed with a stray full stop hanging off it.
const EDGE = /^[\s‎‏،۔.,“”"']+|[\s‎‏،۔.,“”"']+$/g

function lift(h, from, to) {
  const a = h.map[from]
  let b = h.map[to - 1]
  while (b + 1 < h.raw.length && !/[\s۔.,،]/.test(h.raw[b + 1])) b++   // finish the last word
  return h.raw.slice(a, b + 1).replace(EDGE, '').trim()
}

/**
 * Locate a probe phrase in the corpus.
 * @param {string} probe  the distinctive words of the du'a, diacritics optional
 * @param {string} [tail] optional continuation; when given, the lifted span runs
 *                        from the start of `probe` to the end of `tail`, which is
 *                        how a long du'a is pulled out whole without pasting it all
 * @returns {{source,col,n,ar,exact}|{miss,near}}
 */
export function locate(probe, tail, context = []) {
  const corpus = loadCorpus()
  const needle = normalise(probe)
  if (!needle) return { miss: 0 }
  const tailNeedle = tail ? normalise(tail) : null
  // Words that must also appear somewhere in the same narration. A phrase like
  // "la hawla wa la quwwata illa billah" occurs in dozens of hadith in passing;
  // requiring "a treasure of Paradise" alongside it pins the citation to the
  // narration the entry is actually about.
  const must = context.map(normalise).filter(Boolean)

  for (const h of corpus) {
    if (must.some(m => !h.norm.includes(m))) continue
    const i = h.norm.indexOf(needle)
    if (i < 0) continue
    let end = i + needle.length
    if (tailNeedle) {
      const t = h.norm.indexOf(tailNeedle, i)
      if (t < 0) continue                    // this narration lacks the ending we want
      end = t + tailNeedle.length
    }
    return { source: `${h.name} ${h.n}`, col: h.col, n: h.n, ar: lift(h, i, end), exact: true }
  }

  // Not found. Score the near misses so the log can say how close it got — 0.9
  // means a word differs, 0.2 means the phrase is simply wrong.
  const words = needle.split(' ')
  let best = { miss: 0 }
  for (const h of corpus) {
    const c = coverage(words, h.norm)
    if (c > best.miss) best = { miss: c, near: `${h.name} ${h.n}` }
    if (c === 1) break
  }
  return best
}
