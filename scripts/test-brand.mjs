// The icon and the launch screen have to be the same logo on the same colour.
//
// Both have been wrong before. The launch screen kept showing the previous mark
// for a while after the icon had changed, because it was scaffolded by Capacitor
// and nothing regenerated it. And the colour behind it was typed by hand as
// #0F1711 — the app's dark surface — while the artwork's own ground is #0c1510;
// on Android 12, where the system draws the launch screen itself from the icon
// and that colour, the difference showed as a disc of the wrong green.
//
// Neither is visible in a diff, and both only appear on a phone at launch, so
// they are checked here against the pixels rather than against the scripts that
// produced them.
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, log } from './_util.mjs'
import { decodePNG, resize } from './png.mjs'

const RES = path.join(ROOT, 'android', 'app', 'src', 'main', 'res')
let failed = 0
const fail = m => { failed++; console.log(`  ✗ ${m}`) }
const load = f => decodePNG(fs.readFileSync(path.join(RES, f)))

log('Sabeel · Icon and launch screen')

if (!fs.existsSync(RES)) {
  log('  android/ not present — nothing to check')
  process.exit(0)
}

/* ------------------------ one colour, declared once ----------------------- */

// A colour declared in two files is not an error aapt reports; it just picks
// one, and which one it picks is not something to leave to chance.
const declared = name => {
  const hits = []
  for (const dir of fs.readdirSync(RES).filter(d => d.startsWith('values'))) {
    for (const f of fs.readdirSync(path.join(RES, dir)).filter(f => f.endsWith('.xml'))) {
      const m = new RegExp(`<color name="${name}">([^<]+)</color>`).exec(
        fs.readFileSync(path.join(RES, dir, f), 'utf8'))
      if (m) hits.push({ where: `${dir}/${f}`, value: m[1].toLowerCase() })
    }
  }
  return hits
}

const colours = {}
for (const name of ['ic_launcher_background', 'splash_background']) {
  const hits = declared(name)
  if (hits.length === 0) { fail(`${name} is not declared anywhere`); continue }
  if (hits.length > 1) {
    fail(`${name} is declared ${hits.length} times: ${hits.map(h => `${h.value} in ${h.where}`).join(', ')}`)
  }
  colours[name] = hits[0].value
}

if (colours.ic_launcher_background && colours.splash_background &&
    colours.ic_launcher_background !== colours.splash_background) {
  fail(`the icon sits on ${colours.ic_launcher_background} but the launch screen is ${colours.splash_background}`)
}

const GROUND = colours.splash_background || '#000000'
const rgb = [1, 3, 5].map(i => parseInt(GROUND.slice(i, i + 2), 16))

// Capacitor paints its own splash behind the image, so it has to agree too.
const cap = JSON.parse(fs.readFileSync(path.join(ROOT, 'capacitor.config.json'), 'utf8'))
const capColour = String(cap.plugins?.SplashScreen?.backgroundColor || '').toLowerCase()
if (capColour !== GROUND) {
  fail(`capacitor.config.json paints the splash ${capColour}, the resources say ${GROUND}`)
}

/* ------------- the colour matches the pixels it sits next to -------------- */

const splash = load('drawable-port-xxxhdpi/splash.png')
const cornerAt = (img, f = 0.02) => {
  const i = (Math.round(img.height * f) * img.width + Math.round(img.width * f)) * 4
  return [img.data[i], img.data[i + 1], img.data[i + 2]]
}
const corner = cornerAt(splash)
const drift = Math.max(...corner.map((v, i) => Math.abs(v - rgb[i])))
if (drift > 2) {
  const hex = '#' + corner.map(v => v.toString(16).padStart(2, '0')).join('')
  fail(`the splash image's own background is ${hex} but splash_background says ${GROUND}`)
} else {
  log(`  one ground colour throughout: ${GROUND} · icon, launch screen, image and Capacitor all agree`)
}

/* --------------------- the same logo in both places ----------------------- */

const crop = (img, x, y, w, h) => {
  const out = Buffer.alloc(w * h * 4)
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const s = ((y + j) * img.width + (x + i)) * 4, d = (j * w + i) * 4
    out[d] = img.data[s]; out[d + 1] = img.data[s + 1]; out[d + 2] = img.data[s + 2]; out[d + 3] = img.data[s + 3]
  }
  return { width: w, height: h, data: out }
}

// Flattened onto the ground and reduced to a thumbnail, so this compares the
// picture and not the transparency or the scale it happens to be drawn at.
const thumb = img => {
  const N = 64, r = resize(img, N, N), out = Buffer.alloc(N * N * 3)
  for (let i = 0; i < N * N; i++) {
    const a = r.data[i * 4 + 3] / 255
    for (let c = 0; c < 3; c++) out[i * 3 + c] = Math.round(r.data[i * 4 + c] * a + rgb[c] * (1 - a))
  }
  return out
}

const art = Math.round(Math.min(splash.width, splash.height) * 0.42)
const splashArt = thumb(crop(splash,
  Math.round((splash.width - art) / 2), Math.round((splash.height - art) / 2), art, art))

const diff = (a, b) => {
  let sum = 0
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i])
  return sum / a.length
}

// The adaptive foreground is what Android 8+ and the Android 12 launch screen
// both draw, so it is the one that must match the image exactly. The legacy
// PNG is rounded off with transparency, which moves its edge pixels a little.
for (const [file, label, limit] of [
  ['mipmap-xxxhdpi/ic_launcher_foreground.png', 'the icon Android 8+ draws', 4],
  ['mipmap-xxxhdpi/ic_launcher.png', 'the icon older Android draws', 8]
]) {
  const d = diff(splashArt, thumb(load(file)))
  if (d > limit) fail(`the launch screen and ${label} are not the same picture (difference ${d.toFixed(1)}/255)`)
  else log(`  the launch screen shows the same logo as ${label} · difference ${d.toFixed(2)}/255`)
}

/* ---------------------- the Android 12 launch screen ---------------------- */

const v31 = path.join(RES, 'values-v31', 'styles.xml')
if (!fs.existsSync(v31)) {
  fail('no values-v31/styles.xml: Android 12+ draws its own launch screen and would ignore the drawable')
} else {
  const xml = fs.readFileSync(v31, 'utf8')
  for (const attr of ['android:windowSplashScreenBackground', 'android:windowSplashScreenAnimatedIcon']) {
    if (!xml.includes(attr)) fail(`values-v31/styles.xml does not set ${attr}`)
  }
  // Setting this without calling installSplashScreen() before onCreate can
  // leave the app sitting on the launch theme, and MainActivity is a plain
  // BridgeActivity.
  if (xml.includes('postSplashScreenTheme')) {
    const activity = fs.readFileSync(
      path.join(ROOT, 'android/app/src/main/java/app/sabeel/quran/MainActivity.java'), 'utf8')
    if (!activity.includes('installSplashScreen')) {
      fail('postSplashScreenTheme is set but MainActivity never calls installSplashScreen()')
    }
  }
  if (!failed) log('  Android 12+ is told which colour and which icon to draw, so it does not fall back')
}

/* --------------------------------- done ---------------------------------- */

if (failed) { console.log(`\n  ${failed} problem(s).`); process.exit(1) }
log('  The launcher icon and the launch screen are the same logo on the same colour.')
