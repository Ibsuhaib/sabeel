import { useMemo, useState } from 'react'
import { Screen, Header, Card, Section, Button } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'

// Nisab is a weight of metal, not a currency amount — so the user supplies the
// current local price per gram and the app does the arithmetic. That keeps this
// offline and stops us from quoting a stale rate as if it were authoritative.
const GOLD_NISAB_G = 87.48    // 20 mithqal
const SILVER_NISAB_G = 612.36 // 200 dirhams
const RATE = 0.025            // 2.5%

const ASSETS = [
  { id: 'cash', label: 'Cash, bank balances, savings' },
  { id: 'gold', label: 'Gold you own (value)' },
  { id: 'silver', label: 'Silver you own (value)' },
  { id: 'business', label: 'Business stock and goods for sale' },
  { id: 'receivables', label: 'Money owed to you that you expect back' },
  { id: 'investments', label: 'Shares and investments held for trade' }
]

const LIABILITIES = [
  { id: 'debts', label: 'Debts due now' },
  { id: 'bills', label: 'Bills and expenses due now' }
]

export default function Zakat() {
  const [v, setV] = useState({})
  const [goldPrice, setGoldPrice] = useState('')
  const [silverPrice, setSilverPrice] = useState('')
  const [basis, setBasis] = useState('silver')

  const num = id => parseFloat(v[id]) || 0

  const assets = ASSETS.reduce((a, x) => a + num(x.id), 0)
  const liabilities = LIABILITIES.reduce((a, x) => a + num(x.id), 0)
  const net = Math.max(0, assets - liabilities)

  const nisab = useMemo(() => {
    const g = parseFloat(goldPrice) || 0
    const s = parseFloat(silverPrice) || 0
    return {
      gold: g * GOLD_NISAB_G,
      silver: s * SILVER_NISAB_G
    }
  }, [goldPrice, silverPrice])

  const threshold = basis === 'gold' ? nisab.gold : nisab.silver
  const eligible = threshold > 0 && net >= threshold
  const due = eligible ? net * RATE : 0

  return (
    <Screen>
      <Header title="Zakat calculator" back />

      <Section title="Nisab — the threshold">
        <Card className="mx-4 p-4 space-y-3">
          <p className="text-xs text-muted leading-relaxed">
            Nisab is a weight of metal, so it moves with the market. Enter today's price per gram
            in your own currency — Sabeel never quotes you a rate it cannot verify.
          </p>
          <Field label={`Gold price per gram`} value={goldPrice} onChange={setGoldPrice} placeholder="e.g. 6200" />
          <Field label={`Silver price per gram`} value={silverPrice} onChange={setSilverPrice} placeholder="e.g. 78" />

          <div className="pt-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Calculate against</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'silver', label: 'Silver nisab', note: `${SILVER_NISAB_G} g · lower threshold` },
                { id: 'gold', label: 'Gold nisab', note: `${GOLD_NISAB_G} g · higher threshold` }
              ].map(o => (
                <button
                  key={o.id} onClick={() => setBasis(o.id)}
                  className={`tap px-3 py-2.5 rounded-xl border text-left text-sm ${
                    basis === o.id ? 'border-brand bg-brand/10' : 'border-line text-muted'
                  }`}
                >
                  <span className="block font-medium">{o.label}</span>
                  <span className="block text-[10px] opacity-70 mt-0.5">{o.note}</span>
                  <span className="block text-[11px] tabular-nums mt-1">
                    {(o.id === 'gold' ? nisab.gold : nisab.silver).toLocaleString(undefined, { maximumFractionDigits: 0 }) || '—'}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted mt-2 leading-relaxed">
              Most scholars favour the silver nisab because it is lower and so benefits more of
              the poor. Both positions are held; this is a choice, not a setting we make for you.
            </p>
          </div>
        </Card>
      </Section>

      <Section title="What you own">
        <Card className="mx-4 divide-y divide-line">
          {ASSETS.map(a => (
            <InputRow key={a.id} label={a.label} value={v[a.id] || ''} onChange={x => setV(s => ({ ...s, [a.id]: x }))} />
          ))}
        </Card>
      </Section>

      <Section title="What you owe">
        <Card className="mx-4 divide-y divide-line">
          {LIABILITIES.map(a => (
            <InputRow key={a.id} label={a.label} value={v[a.id] || ''} onChange={x => setV(s => ({ ...s, [a.id]: x }))} />
          ))}
        </Card>
      </Section>

      <div className="px-4 mt-6">
        <Card className={`p-5 ${eligible ? 'border-brand/50' : ''}`}>
          <Line label="Total assets" value={assets} />
          <Line label="Less liabilities" value={-liabilities} />
          <div className="border-t border-line my-2" />
          <Line label="Net zakatable wealth" value={net} strong />
          <Line label={`Nisab (${basis})`} value={threshold} muted />

          <div className="mt-4 pt-4 border-t border-line">
            {threshold === 0 ? (
              <p className="text-sm text-muted">Enter a metal price above to see whether zakat is due.</p>
            ) : eligible ? (
              <>
                <p className="text-xs text-muted">Zakat due at 2.5%</p>
                <p className="text-3xl font-semibold text-brand tabular-nums mt-1">
                  {due.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted">
                Your net wealth is below the nisab, so no zakat is due on it this year.
              </p>
            )}
          </div>
        </Card>
      </div>

      <div className="px-4 mt-4">
        <Card className="px-4 py-3 flex gap-2.5">
          <Icon name="warn" size={15} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted leading-relaxed">
            This is arithmetic, not a fatwa. Zakat on pensions, mortgages, crops, livestock,
            jointly-held assets and business debt has genuine scholarly differences that no
            calculator can settle. For anything beyond straightforward cash and gold, ask a
            qualified scholar.
          </p>
        </Card>
      </div>
    </Screen>
  )
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="block text-xs text-muted mb-1.5">{label}</span>
      <input
        type="number" inputMode="decimal" value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-xl bg-bg border border-line text-sm tabular-nums outline-none focus:border-brand"
      />
    </label>
  )
}

function InputRow({ label, value, onChange }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <span className="flex-1 text-sm min-w-0">{label}</span>
      <input
        type="number" inputMode="decimal" value={value} placeholder="0"
        onChange={e => onChange(e.target.value)}
        className="w-28 px-2.5 py-1.5 rounded-lg bg-bg border border-line text-sm text-right tabular-nums outline-none focus:border-brand"
      />
    </div>
  )
}

function Line({ label, value, strong, muted }) {
  return (
    <div className={`flex justify-between py-1 text-sm ${muted ? 'text-muted' : ''}`}>
      <span className={muted ? '' : 'text-muted'}>{label}</span>
      <span className={`tabular-nums ${strong ? 'font-semibold' : ''}`}>
        {value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </span>
    </div>
  )
}
