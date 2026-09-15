import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// fileURLToPath, not url.pathname — the latter leaves %20 in paths that contain spaces.
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const DATA = path.join(ROOT, 'public', 'data')

export function ensure(dir) { fs.mkdirSync(dir, { recursive: true }); return dir }

export function writeJSON(file, obj) {
  ensure(path.dirname(file))
  fs.writeFileSync(file, JSON.stringify(obj))
  return fs.statSync(file).size
}

export function kb(n) { return (n / 1024).toFixed(1) + ' KB' }
export function mb(n) { return (n / 1048576).toFixed(2) + ' MB' }

export async function getJSON(url, tries = 3) {
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(url, { headers: { accept: 'application/json' } })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (e) {
      if (i === tries) throw new Error(`failed ${url}: ${e.message}`)
      await new Promise(r => setTimeout(r, 1200 * i))
    }
  }
}

export async function getText(url, tries = 3) {
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.text()
    } catch (e) {
      if (i === tries) throw new Error(`failed ${url}: ${e.message}`)
      await new Promise(r => setTimeout(r, 1200 * i))
    }
  }
}

export function log(...a) { console.log(...a) }
