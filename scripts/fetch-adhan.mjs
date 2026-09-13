// Build-time: the adhan recording used for prayer notifications.
//
// Adhan audio is where it is easy to go badly wrong. A recording is a
// performance, and most files circulating on "free adhan" CDNs have no stated
// licence at all. While looking for one, cdn.aladhan.com/audio/adhans/a3.mp3 —
// served as an adhan — turned out to carry an ID3 tag identifying it as "Call
// To Prayers" from Karl Jenkins' The Armed Man (2001), a copyrighted classical
// work. That is exactly the kind of thing that must never reach an Islamic app.
//
// So this ships exactly one recording, from Wikimedia Commons, where the licence
// is stated and checkable, and it is downloaded and self-hosted rather than
// hotlinked so the adhan still sounds with no network.
import fs from 'node:fs'
import path from 'node:path'
import { DATA, ROOT, ensure, writeJSON, log, kb } from './_util.mjs'

const OUT = ensure(path.join(ROOT, 'public', 'adhan'))

const ADHANS = [
  {
    id: 'aaqib-azeez',
    file: 'adhan-aaqib-azeez.mp3',
    name: 'Adhan',
    muadhdhin: 'Aaqib Azeez',
    licence: 'CC BY-SA 4.0',
    attribution: 'Aaqib Azeez, via Wikimedia Commons (uploader: Atcovi), CC BY-SA 4.0',
    source: 'https://commons.wikimedia.org/wiki/File:The_Adhan_-_Muslim_Call_to_Prayer_-_Aaqib_Azeez.mp3',
    url: 'https://upload.wikimedia.org/wikipedia/commons/7/7d/The_Adhan_-_Muslim_Call_to_Prayer_-_Aaqib_Azeez.mp3'
  }
]

async function main() {
  log('Sabeel · Adhan')
  const entries = []

  for (const a of ADHANS) {
    process.stdout.write(`  ${a.muadhdhin} ... `)
    const res = await fetch(a.url, { headers: { 'User-Agent': 'Sabeel/0.1 (open-source Islamic app; contact via GitHub issues)' } })
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${a.url}`)
    const buf = Buffer.from(await res.arrayBuffer())

    // An mp3 begins with an ID3 tag or an MPEG frame sync. Anything else means
    // we fetched an error page, not audio.
    const isMp3 = buf.slice(0, 3).toString() === 'ID3' || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0)
    if (!isMp3) throw new Error(`${a.file} is not an mp3`)
    if (buf.length < 200_000) throw new Error(`${a.file} is only ${buf.length} bytes — too short to be an adhan`)

    fs.writeFileSync(path.join(OUT, a.file), buf)
    entries.push({ ...a, bytes: buf.length, url: undefined })
    log(kb(buf.length))
  }

  writeJSON(path.join(DATA, 'adhan.json'), {
    adhans: entries,
    note: 'Only recordings with a stated, checkable licence are shipped. You can also use your own adhan file — it stays on your device.',
    builtAt: new Date().toISOString().slice(0, 10)
  })
  log(`  wrote ${entries.length} recording(s) + data/adhan.json`)
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
