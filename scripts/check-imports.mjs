// A ReferenceError from a missing import does not fail `vite build` — it fails
// at runtime, on whichever screen the user happens to open. That is exactly how
// `useNavigate` went missing from Settings.jsx behind a green build. This walks
// the source and flags any watched identifier that is used but never imported
// or declared.
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, log } from './_util.mjs'

const WATCHED = [
  'useNavigate', 'useParams', 'useSearchParams', 'useLocation', 'Link', 'NavLink',
  'useState', 'useEffect', 'useMemo', 'useRef', 'useCallback', 'lazy', 'Suspense',
  'Icon', 'Card', 'Button', 'Sheet', 'Toggle', 'Choice', 'Loading', 'LoadError',
  'Empty', 'Screen', 'Header', 'Section', 'Row', 'IconButton', 'Stepper',
  'useData', 'player', 'store', 'usePlayer', 'HadithCard', 'Player', 'ReciterList',
  // Sound and notification helpers — `customAdhan` survived an import removal
  // once and took the whole app down with a ReferenceError.
  'customAdhan', 'setCustomAdhan', 'playAdhan', 'playBeep', 'playFor', 'prime',
  'stopSound', 'vibrate', 'schedule', 'sendTest', 'upcoming', 'AdhanPicker',
  'DownloadAudio', 'markPage', 'completeToday', 'createPlan'
  // Deliberately NOT watched: names common as local variables (progress, data,
  // status) would be false positives on every destructured useState.
]

function sources(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name)
    if (e.isDirectory()) sources(f, out)
    else if (/\.jsx?$/.test(e.name)) out.push(f)
  }
  return out
}

const word = id => new RegExp(`(?<![\\w.$])${id}(?![\\w$])`)

log('Sabeel · Import check')
let problems = 0

for (const file of sources(path.join(ROOT, 'src'))) {
  const src = fs.readFileSync(file, 'utf8')
  // Static imports, and dynamic ones — `const { markPage } = await import(...)`
  // is just as much an import as the declared kind.
  const importBlock = [
    ...[...src.matchAll(/import\s+([\s\S]*?)\s+from\s+['"][^'"]+['"]/g)].map(m => m[1]),
    ...[...src.matchAll(/(?:const|let|var)\s*(\{[^}]*\})\s*=\s*await\s+import\s*\(/g)].map(m => m[1])
  ].join(' ')

  // Strip the import statements before looking for usage, or a module path like
  // '../components/Player.jsx' reads as a use of `Player`.
  const body = src.replace(/^\s*import\s[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '')

  for (const id of WATCHED) {
    const usedAsJsx = new RegExp(`<${id}[\\s/>]`).test(body)
    const usedAsCall = new RegExp(`(?<![\\w.$])${id}\\s*\\(`).test(body)
    const usedAsMember = new RegExp(`(?<![\\w.$])${id}\\.`).test(body)
    if (!usedAsJsx && !usedAsCall && !usedAsMember) continue

    if (word(id).test(importBlock)) continue

    // Declared locally? Covers `const x` / `function x`, and destructuring —
    // `const [progress, setProgress] = useState()` declares `progress` too.
    const declared = new RegExp(
      `(?:function|const|let|var|class)\\s+${id}(?![\\w$])` +
      `|(?:const|let|var)\\s*[[{][^\\]}]*(?<![\\w$])${id}(?![\\w$])[^\\]}]*[\\]}]\\s*=` +
      `|function\\s*\\w*\\s*\\([^)]*(?<![\\w$])${id}(?![\\w$])` +
      `|\\([^)]*(?<![\\w$])${id}(?![\\w$])[^)]*\\)\\s*=>`
    )
    if (declared.test(body)) continue

    console.error(`   ✗ ${path.relative(ROOT, file).replace(/\\/g, '/')} uses "${id}" but never imports or declares it`)
    problems++
  }
}

if (problems) {
  console.error(`  ${problems} missing import(s)`)
  process.exit(1)
}
log('  No missing imports.')
