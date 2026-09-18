import React, { useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import Icon from './Icon.jsx'
import Tooltip from './Tooltip.jsx'
import { parentOf } from '../lib/up.js'

export function Screen({ children, className = '' }) {
  return <div className={`min-h-full pb-24 ${className}`}>{children}</div>
}

// An Arabic honorific sitting inside an English sentence — "the Prophet ﷺ" — is a
// right-to-left run, and the bidi algorithm hands the neutral characters beside
// it to that run too. "the Prophet ﷺ · 5 entries" then renders with the count
// jumping to the wrong side. Wrapping each Arabic run in an isolate tells the
// algorithm it is a self-contained island and leaves the rest of the line alone.
const ARABIC_RUN = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]+/g
const isolate = v =>
  typeof v === 'string' ? v.replace(ARABIC_RUN, m => `⁨${m}⁩`) : v

export function Header({ title, subtitle, back, actions, sticky = true, large = false }) {
  const nav = useNavigate()
  const loc = useLocation()
  return (
    <header className={`${sticky ? 'sticky top-0 z-30' : ''} safe-t bg-bg/92 backdrop-blur-md border-b border-line`}>
      <div className="flex items-center gap-2 px-3 h-14">
        {back && (
          <button onClick={() => nav(parentOf(loc.pathname) || '/')} aria-label="Go back" className="tap -ml-1 p-2 rounded-full text-muted hover:text-ink active:bg-surf">
            <Icon name="back" size={22} />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <div className={`truncate font-semibold ${large ? 'text-lg' : 'text-[15px]'}`}>{isolate(title)}</div>
          {subtitle && <div className="truncate text-xs text-muted">{isolate(subtitle)}</div>}
        </div>
        {actions}
      </div>
    </header>
  )
}

// `label` is the accessible name, the desktop tooltip and the long-press tooltip
// all at once — every icon button in the app already passes one, so wrapping it
// here is what gives them all a way of saying what they do on a touch screen.
export function IconButton({ name, label, onClick, to, active, size = 20, className = '', tip }) {
  const cls = `tap touch-min grid place-items-center rounded-full transition-colors ${active ? 'text-brand' : 'text-muted hover:text-ink'} active:bg-surf ${className}`
  const icon = <Icon name={name} size={size} fill={active ? 'currentColor' : 'none'} />
  const inner = to
    ? <Link to={to} aria-label={label} className={cls}>{icon}</Link>
    : <button onClick={onClick} aria-label={label} className={cls}>{icon}</button>
  return <Tooltip label={tip || label}>{inner}</Tooltip>
}

export function Card({ children, className = '', as: As = 'div', ...rest }) {
  return <As className={`bg-surf border border-line rounded-2xl ${className}`} {...rest}>{children}</As>
}

export function Row({ icon, title, subtitle, right, to, onClick, className = '' }) {
  const inner = (
    <>
      {icon && <span className="text-muted shrink-0"><Icon name={icon} size={20} /></span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px]">{title}</span>
        {subtitle && <span className="block truncate text-xs text-muted mt-0.5">{subtitle}</span>}
      </span>
      {right ?? <span className="text-muted shrink-0"><Icon name="forward" size={18} /></span>}
    </>
  )
  const cls = `tap w-full flex items-center gap-3 px-4 py-3 text-left active:bg-bg/60 ${className}`
  if (to) return <Link to={to} className={cls}>{inner}</Link>
  return <button onClick={onClick} className={cls}>{inner}</button>
}

export function Section({ title, action, children, className = '' }) {
  return (
    <section className={`mt-6 ${className}`}>
      {(title || action) && (
        <div className="flex items-end justify-between px-4 mb-2">
          {title && <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function Loading({ label = 'Loading' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-muted text-sm">
      <span className="w-4 h-4 rounded-full border-2 border-line border-t-brand animate-spin" />
      {label}
    </div>
  )
}

export function Empty({ icon = 'info', title, body, action }) {
  return (
    <div className="text-center px-8 py-16">
      <div className="inline-flex text-muted/60 mb-3"><Icon name={icon} size={32} /></div>
      <p className="font-medium">{title}</p>
      {body && <p className="text-sm text-muted mt-1 leading-relaxed">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

// Shown instead of a spinner that never stops. Always offers a way out.
export function LoadError({ message, onRetry, back = true }) {
  return (
    <div className="text-center px-8 py-16">
      <div className="inline-flex text-amber-500 mb-3"><Icon name="warn" size={32} /></div>
      <p className="font-medium">This did not load</p>
      <p className="text-sm text-muted mt-2 leading-relaxed break-words">{message}</p>
      <p className="text-[11px] text-muted/70 mt-3 leading-relaxed">
        Everything Sabeel shows is a file on this device or a one-time download. Nothing is
        lost — try again.
      </p>
      <div className="mt-5 flex gap-2 justify-center">
        {onRetry && <Button onClick={onRetry}><Icon name="reset" size={15} />Try again</Button>}
        {back && <Button to="/" variant="soft">Go home</Button>}
      </div>
    </div>
  )
}

export function Button({ children, onClick, to, variant = 'primary', size = 'md', className = '', ...rest }) {
  const base = 'tap inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors disabled:opacity-40'
  // Heights are floors, not paddings: Android asks for 48dp, iOS 44pt, and an
  // audit found these buttons landing at 28–30px.
  const sizes = {
    sm: 'px-3.5 py-2 text-xs min-h-[38px]',
    md: 'px-4 py-2.5 text-sm min-h-[42px]',
    lg: 'px-5 py-3 text-[15px] w-full min-h-[48px]'
  }
  const variants = {
    primary: 'bg-brand text-bg hover:opacity-90',
    soft: 'bg-surf border border-line text-ink hover:border-brand/50',
    ghost: 'text-muted hover:text-ink',
    danger: 'bg-surf border border-red-500/40 text-red-400'
  }
  const cls = `${base} ${sizes[size]} ${variants[variant]} ${className}`
  if (to) return <Link to={to} className={cls} {...rest}>{children}</Link>
  return <button onClick={onClick} className={cls} {...rest}>{children}</button>
}

export function Sheet({ open, onClose, title, children, maxHeight = '82vh' }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const onKey = e => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
      <div className="absolute inset-0 bg-black/55" onClick={onClose} />
      <div
        ref={ref} role="dialog" aria-modal="true" aria-label={title}
        className="relative w-full sm:max-w-lg bg-surf border-t sm:border border-line rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
        style={{ maxHeight }}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-line shrink-0">
          <h3 className="flex-1 font-semibold text-[15px]">{title}</h3>
          <IconButton name="close" label="Close" onClick={onClose} />
        </div>
        <div className="overflow-y-auto overscroll-contain safe-b">{children}</div>
      </div>
    </div>
  )
}

export function Toggle({ checked, onChange, label, hint }) {
  return (
    <button
      onClick={() => onChange(!checked)} role="switch" aria-checked={checked}
      className="tap w-full flex items-center gap-3 px-4 py-3 text-left active:bg-bg/60"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[15px]">{label}</span>
        {hint && <span className="block text-xs text-muted mt-0.5">{hint}</span>}
      </span>
      <span className={`shrink-0 w-11 h-6 rounded-full p-0.5 transition-colors ${checked ? 'bg-brand' : 'bg-line'}`}>
        <span className={`block w-5 h-5 rounded-full bg-surf transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </span>
    </button>
  )
}

export function Choice({ options, value, onChange, columns = 2 }) {
  return (
    <div className={`grid gap-2 px-4`} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))` }}>
      {options.map(o => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`tap px-3 py-2.5 rounded-xl border text-sm text-left transition-colors ${
            value === o.id ? 'border-brand bg-brand/10 text-ink' : 'border-line bg-surf text-muted hover:text-ink'
          }`}
        >
          <span className="block font-medium">{o.label}</span>
          {o.note && <span className="block text-[11px] opacity-70 mt-0.5">{o.note}</span>}
        </button>
      ))}
    </div>
  )
}

export function Stepper({ value, onChange, min = -60, max = 60, suffix = '' }) {
  return (
    <div className="flex items-center gap-1">
      <button onClick={() => onChange(Math.max(min, value - 1))} className="tap touch-min grid place-items-center rounded-lg bg-bg border border-line text-muted"><Icon name="minus" size={14} /></button>
      <span className="w-14 text-center text-sm tabular-nums">{value > 0 ? '+' : ''}{value}{suffix}</span>
      <button onClick={() => onChange(Math.min(max, value + 1))} className="tap touch-min grid place-items-center rounded-lg bg-bg border border-line text-muted"><Icon name="plus" size={14} /></button>
    </div>
  )
}
