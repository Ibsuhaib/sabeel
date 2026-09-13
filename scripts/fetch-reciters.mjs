// Build-time: the reciter catalogue.
//
// Two kinds of recitation, and the difference matters to the listener:
//
//   perAyah  — EveryAyah serves one mp3 per ayah, which is what makes ayah
//              repeat, A→B range play and word-level following possible.
//   surah    — mp3quran serves one mp3 per surah. Far more imams are available
//              this way, including most of the current Haramain imams, but a
//              single file cannot be driven ayah by ayah.
//
// The app labels which is which rather than pretending they are the same.
import path from 'node:path'
import { DATA, getJSON, writeJSON, log, kb } from './_util.mjs'

// Verified against everyayah.com before shipping. `masjid` is only set where the
// reciter is or was an imam of that masjid — it is not a style label.
const EVERY_AYAH = [
  { id: 'Alafasy_128kbps', name: 'Mishary Rashid Alafasy', style: 'Murattal' },
  { id: 'Abdurrahmaan_As-Sudais_192kbps', name: 'Abdurrahman as-Sudais', style: 'Murattal', masjid: 'haram' },
  { id: 'Saood_ash-Shuraym_128kbps', name: 'Saud ash-Shuraim', style: 'Murattal', masjid: 'haram' },
  { id: 'MaherAlMuaiqly128kbps', name: 'Maher al-Muaiqly', style: 'Murattal', masjid: 'haram' },
  { id: 'Yasser_Ad-Dussary_128kbps', name: 'Yasser ad-Dossari', style: 'Murattal', masjid: 'haram' },
  { id: 'Abdullaah_3awwaad_Al-Juhaynee_128kbps', name: 'Abdullah Awad al-Juhany', style: 'Murattal', masjid: 'haram' },
  { id: 'Ali_Jaber_64kbps', name: 'Ali Jaber', style: 'Murattal', masjid: 'haram' },
  { id: 'Hudhaify_128kbps', name: 'Ali al-Hudhaify', style: 'Murattal', masjid: 'nabawi' },
  { id: 'Salah_Al_Budair_128kbps', name: 'Salah al-Budair', style: 'Murattal', masjid: 'nabawi' },
  { id: 'Muhsin_Al_Qasim_192kbps', name: 'Abdul Muhsin al-Qasim', style: 'Murattal', masjid: 'nabawi' },
  { id: 'Abdul_Basit_Murattal_192kbps', name: 'Abdul Basit Abdus Samad', style: 'Murattal' },
  { id: 'Abdul_Basit_Mujawwad_128kbps', name: 'Abdul Basit Abdus Samad', style: 'Mujawwad' },
  { id: 'Husary_128kbps', name: 'Mahmoud Khalil al-Husary', style: 'Murattal' },
  { id: 'Husary_Mujawwad_64kbps', name: 'Mahmoud Khalil al-Husary', style: 'Mujawwad' },
  { id: 'Minshawy_Murattal_128kbps', name: 'Muhammad Siddiq al-Minshawi', style: 'Murattal' },
  { id: 'Minshawy_Mujawwad_192kbps', name: 'Muhammad Siddiq al-Minshawi', style: 'Mujawwad' },
  { id: 'Abu_Bakr_Ash-Shaatree_128kbps', name: 'Abu Bakr ash-Shatri', style: 'Murattal' },
  { id: 'Ahmed_ibn_Ali_al_Ajamy_128kbps', name: 'Ahmed ibn Ali al-Ajamy', style: 'Murattal' },
  { id: 'Muhammad_Ayyoub_128kbps', name: 'Muhammad Ayyoub', style: 'Murattal', masjid: 'nabawi' },
  { id: 'Nasser_Alqatami_128kbps', name: 'Nasser al-Qatami', style: 'Murattal' },
  { id: 'Ghamadi_40kbps', name: 'Saad al-Ghamdi', style: 'Murattal' },
  { id: 'Hani_Rifai_192kbps', name: 'Hani ar-Rifai', style: 'Murattal' },
  { id: 'Abdullah_Basfar_192kbps', name: 'Abdullah Basfar', style: 'Murattal' },
  { id: 'Khaalid_Abdullaah_al-Qahtaanee_192kbps', name: 'Khalid al-Qahtani', style: 'Murattal' },
  { id: 'Muhammad_Jibreel_128kbps', name: 'Muhammad Jibreel', style: 'Murattal' },
  { id: 'Fares_Abbad_64kbps', name: 'Fares Abbad', style: 'Murattal' },
  { id: 'Abdullah_Matroud_128kbps', name: 'Abdullah al-Matroud', style: 'Murattal' },
  { id: 'Ibrahim_Akhdar_32kbps', name: 'Ibrahim al-Akhdar', style: 'Murattal' },
  { id: 'mahmoud_ali_al_banna_32kbps', name: 'Mahmoud Ali al-Banna', style: 'Murattal' },
  { id: 'Mohammad_al_Tablaway_128kbps', name: 'Mohammad al-Tablaway', style: 'Murattal' },
  { id: 'aziz_alili_128kbps', name: 'Aziz Alili', style: 'Murattal' },
  { id: 'Salaah_AbdulRahman_Bukhatir_128kbps', name: 'Salah Bukhatir', style: 'Murattal' },
  { id: 'Yaser_Salamah_128kbps', name: 'Yaser Salamah', style: 'Murattal' },
  { id: 'Sahl_Yassin_128kbps', name: 'Sahl Yassin', style: 'Murattal' },
  { id: 'Akram_AlAlaqimy_128kbps', name: 'Akram al-Alaqimy', style: 'Murattal' },
  { id: 'Ahmed_Neana_128kbps', name: 'Ahmed Neana', style: 'Murattal' },
  { id: 'Ali_Hajjaj_AlSuesy_128kbps', name: 'Ali Hajjaj al-Suesy', style: 'Murattal' },
  { id: 'Muhammad_AbdulKareem_128kbps', name: 'Muhammad AbdulKareem', style: 'Murattal' },
  { id: 'Menshawi_16kbps', name: 'al-Minshawi', style: 'Murattal, low bandwidth' }
]

// mp3quran ids for imams with a complete muṣḥaf that EveryAyah does not carry.
// Keyed by their id in that catalogue; the name and server come from the API so
// a rename upstream does not silently break a link.
// Only imams who are NOT already available per ayah — where both exist the
// per-ayah recording wins, because it can be driven ayah by ayah.
const SURAH_ONLY = [
  { mp3quranId: 217, masjid: 'haram', note: 'Imam of the Grand Mosque, Makkah' },
  { mp3quranId: 61,  masjid: 'haram', note: 'Former imam of the Grand Mosque, Makkah' },
  { mp3quranId: 178, masjid: null,    note: '' }
]

async function main() {
  log('Sabeel · Reciters')

  process.stdout.write('  mp3quran catalogue ... ')
  const cat = await getJSON('https://www.mp3quran.net/api/v3/reciters?language=eng')
  log(`${cat.reciters.length} reciters`)

  const byId = new Map(cat.reciters.map(r => [r.id, r]))
  const surah = []
  for (const want of SURAH_ONLY) {
    const r = byId.get(want.mp3quranId)
    if (!r) { log(`  ! mp3quran id ${want.mp3quranId} is gone, skipping`); continue }
    // Prefer a complete muṣḥaf (114 surahs) over a partial set.
    const moshaf = (r.moshaf || []).slice().sort((a, b) => b.surah_total - a.surah_total)[0]
    if (!moshaf || moshaf.surah_total < 114) {
      log(`  ! ${r.name} has no complete muṣḥaf (${moshaf?.surah_total ?? 0} surahs), skipping`)
      continue
    }
    surah.push({
      id: `mq-${r.id}`,
      name: r.name,
      style: moshaf.name || 'Murattal',
      masjid: want.masjid,
      note: want.note,
      mode: 'surah',
      server: moshaf.server.replace(/\/$/, '')
    })
  }

  const perAyah = EVERY_AYAH.map(r => ({ ...r, mode: 'ayah', masjid: r.masjid || null }))

  const size = writeJSON(path.join(DATA, 'reciters.json'), {
    perAyah,
    surah,
    masjids: {
      haram: { label: 'Masjid al-Haram, Makkah', short: 'Haram' },
      nabawi: { label: 'Masjid an-Nabawi, Madinah', short: 'Madinah' }
    },
    // Stated plainly rather than filled with a guess: neither EveryAyah nor
    // mp3quran carries a complete Quran recorded by an imam of Masjid al-Aqsa.
    aqsaNote: 'No complete Quran recording by an imam of Masjid al-Aqsa exists in the open recitation archives. Rather than label someone else as an Aqsa reciter, Sabeel leaves this empty. If you know of an authentic complete recording, please open an issue.',
    builtAt: new Date().toISOString().slice(0, 10)
  })

  const haram = [...perAyah, ...surah].filter(r => r.masjid === 'haram').length
  const nabawi = [...perAyah, ...surah].filter(r => r.masjid === 'nabawi').length
  log(`  ${perAyah.length} per-ayah · ${surah.length} full-surah · ${haram} Haram imams · ${nabawi} Madinah imams · ${kb(size)}`)
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
