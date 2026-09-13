export const pad = n => String(n).padStart(2, '0')

export function fmtTime(d, use24 = false) {
  if (!d) return '--:--'
  return d.toLocaleTimeString([], { hour: use24 ? '2-digit' : 'numeric', minute: '2-digit', hour12: !use24 })
}

export function fmtCountdown(ms) {
  if (ms <= 0) return 'now'
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}h ${pad(m)}m`
  if (m > 0) return `${m}m ${pad(sec)}s`
  return `${sec}s`
}

export const dateKey = (d = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
export const toArabicNumber = n => String(n).split('').map(c => AR_DIGITS[+c] ?? c).join('')

// EveryAyah names its files SSSAAA.mp3 — surah and ayah both zero-padded to 3.
export const ayahAudioId = (surah, ayah) =>
  `${String(surah).padStart(3, '0')}${String(ayah).padStart(3, '0')}`

export function relativeDay(ts) {
  const days = Math.floor((Date.now() - ts) / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  return new Date(ts).toLocaleDateString([], { day: 'numeric', month: 'short' })
}
