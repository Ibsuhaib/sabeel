// Arabic normalisation, shared by the adhkar builder and its verifier.
//
// The point is to compare a du'a we have written out against the same words as
// they appear inside a hadith narration. The two will never match byte for byte:
// the corpus carries full harakat, ornamental stops, alif variants and tatweel,
// and different editions vowel the same word differently. So both sides are
// reduced to bare consonantal skeletons before comparing.
//
// normaliseMapped keeps a character index back into the original string, which
// is what lets the builder lift the *fully vowelled* span out of the narration
// once a match is found — so the Arabic the app displays is the corpus's own
// text, never text typed out from memory.

const DIACRITIC = /[ؐ-ًؚ-ٰٟۖ-ۭ࣓-ࣿ]/
const ORNAMENT = /[۝۞۩۽۾ﷺﷻ﷽‫‬‌-‏]/
const PUNCT = /[.,،؛؟!:"'()\[\]{}«»‐-―‘-‟…\/\\|*\-_=+@#$%^&~`؎؏]/
const ARABIC = /[؀-ۿ]/

// One character of the source → zero or one character of the skeleton.
function fold(ch) {
  if (DIACRITIC.test(ch)) return ''
  if (ch === 'ـ') return ''              // tatweel
  if (ch === 'ء') return ''              // bare hamza carries no skeleton
  if (ORNAMENT.test(ch) || PUNCT.test(ch)) return ' '
  if ('آأإٱٲٳٵ'.includes(ch)) return 'ا' // آأإٱ → ا
  if (ch === 'ة') return 'ه'        // ة → ه
  if (ch === 'ى' || ch === 'ی') return 'ي' // ىی → ي
  if (ch === 'ؤ') return 'و'        // ؤ → و
  if (ch === 'ئ') return 'ي'        // ئ → ي
  if (ARABIC.test(ch)) return ch
  if (/\s/.test(ch)) return ' '
  return ' '
}

// Returns { norm, map } where map[i] is the index in `s` that produced norm[i].
export function normaliseMapped(s) {
  const out = []
  const map = []
  let lastSpace = true
  for (let i = 0; i < s.length; i++) {
    const f = fold(s[i])
    if (!f) continue
    if (f === ' ') {
      if (lastSpace) continue
      lastSpace = true
    } else {
      lastSpace = false
    }
    out.push(f)
    map.push(i)
  }
  // Trim trailing space without losing map alignment.
  while (out.length && out[out.length - 1] === ' ') { out.pop(); map.pop() }
  let start = 0
  while (start < out.length && out[start] === ' ') start++
  return { norm: out.slice(start).join(''), map: map.slice(start) }
}

export function normalise(s) {
  return s ? normaliseMapped(String(s)).norm : ''
}

// Longest run of probe words found consecutively in the haystack, as a fraction
// of the probe. Used to score near-misses so the build can report *why* an entry
// failed instead of only that it did.
export function coverage(probeWords, hay) {
  if (!probeWords.length) return 0
  let best = 0
  for (let i = 0; i < probeWords.length; i++) {
    for (let j = probeWords.length; j > i + best; j--) {
      if (hay.includes(probeWords.slice(i, j).join(' '))) { best = j - i; break }
    }
  }
  return best / probeWords.length
}
