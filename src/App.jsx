import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'

const CAT_COLORS = {
  'Supermercado': '#1D9E75',
  'Restaurantes': '#D85A30',
  'Transporte': '#378ADD',
  'Ropa': '#D4537E',
  'Salud/Farmacia': '#7F77DD',
  'Hogar': '#BA7517',
  'Ocio': '#639922',
  'Otros': '#888780'
}

const CATS = Object.keys(CAT_COLORS)

function formatDate(d) {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function today() {
  return new Date().toISOString().split('T')[0]
}

export default function App() {
  const [tab, setTab] = useState('add')
  const [gastos, setGastos] = useState(() => JSON.parse(localStorage.getItem('gastos_app') || '[]'))
  const [form, setForm] = useState({ importe: '', comercio: '', categoria: '', fecha: today() })
  const [toast, setToast] = useState(false)

  useEffect(() => {
    localStorage.setItem('gastos_app', JSON.stringify(gastos))
  }, [gastos])

  function handleAdd() {
    const imp = parseFloat(form.importe)
    if (!imp || imp <= 0 || !form.comercio.trim() || !form.categoria || !form.fecha) {
      alert('Rellena todos los campos')
      return
    }
    setGastos(prev => [...prev, { importe: imp, comercio: form.comercio.trim(), categoria: form.categoria, fecha: form.fecha }])
    setForm({ importe: '', comercio: '', categoria: '', fecha: today() })
    setToast(true)
    setTimeout(() => setToast(false), 2000)
  }

  function exportXLSX() {
    if (!gastos.length) { alert('No hay gastos que exportar'); return }
    const data = gastos.map(g => ({ Fecha: formatDate(g.fecha), Establecimiento: g.comercio, Categoria: g.categoria, 'Importe (EUR)': g.importe }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Gastos')
    XLSX.writeFile(wb, 'gastos.xlsx')
  }

  const total = gastos.reduce((s, g) => s + g.importe, 0)
  const cats = {}
  gastos.forEach(g => cats[g.categoria] = (cats[g.categoria] || 0) + g.importe)
  const catSorted = Object.entries(cats).sort((a, b) => b[1] - a[1])
  const maxCat = catSorted[0]?.[1] || 1

  return (
    <div>
      <header style={{ padding: '1.5rem 1.25rem 0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 22, fontWeight: 500 }}>Gastos</span>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{total.toFixed(2)} EUR total</span>
      </header>

      <div style={{ display: 'flex', gap: 6, padding: '0 1.25rem 1rem' }}>
        {['add', 'list', 'stats'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '8px 0', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            background: tab === t ? 'var(--text)' : 'var(--surface)',
            color: tab === t ? 'var(--surface)' : 'var(--text-muted)',
            border: `0.5px solid ${tab === t ? 'var(--text)' : 'var(--border-strong)'}`,
            borderRadius: 'var(--radius-sm)', transition: 'all 0.15s'
          }}>
            {{ add: 'Anadir', list: 'Historial', stats: 'Resumen' }[t]}
          </button>
        ))}
      </div>

      {tab === 'add' && (
        <div style={{ padding: '0 1.25rem' }}>
          <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.25rem', marginBottom: 12 }}>
            <Field label="Importe (EUR)">
              <input type="number" placeholder="0.00" step="0.01" min="0" value={form.importe}
                onChange={e => setForm(p => ({ ...p, importe: e.target.value }))} style={inputStyle} />
            </Field>
            <Field label="Establecimiento">
              <input type="text" placeholder="Nombre del negocio" value={form.comercio}
                onChange={e => setForm(p => ({ ...p, comercio: e.target.value }))} style={inputStyle} />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Categoria">
                <select value={form.categoria} onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))} style={inputStyle}>
                  <option value="">Elige</option>
                  {CATS.map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Fecha">
                <input type="date" value={form.fecha} onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))} style={inputStyle} />
              </Field>
            </div>
            <button onClick={handleAdd} style={{ width: '100%', padding: '12px', marginTop: 8, fontSize: 15, fontWeight: 500, background: 'var(--text)', color: 'var(--surface)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
              Guardar gasto
            </button>
            {toast && <div style={{ textAlign: 'center', fontSize: 13, color: '#1D9E75', marginTop: 10 }}>Gasto guardado</div>}
          </div>
          <button onClick={exportXLSX} style={{ width: '100%', padding: 12, fontSize: 14, fontWeight: 500, background: 'transparent', color: 'var(--text-muted)', border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
            Exportar XLSX
          </button>
        </div>
      )}

      {tab === 'list' && (
        <div style={{ padding: '0 1.25rem' }}>
          <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem 1.25rem' }}>
            {!gastos.length
              ? <div style={{ textAlign: 'center', color: 'var(--text-hint)', padding: '2rem 0', fontSize: 14 }}>Sin gastos aun</div>
              : [...gastos].sort((a, b) => b.fecha.localeCompare(a.fecha)).map((g, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < gastos.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{g.comercio}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{formatDate(g.fecha)}</div>
                    <div style={{ display: 'inline-block', fontSize: 11, padding: '2px 8px', borderRadius: 20, marginTop: 4, background: CAT_COLORS[g.categoria] + '22', color: CAT_COLORS[g.categoria] }}>{g.categoria}</div>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 500 }}>{g.importe.toFixed(2)} EUR</div>
                </div>
              ))}
          </div>
        </div>
      )}

      {tab === 'stats' && (
        <div style={{ padding: '0 1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 500 }}>{total.toFixed(2)} EUR</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Total gastado</div>
            </div>
            <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 500 }}>{gastos.length}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Gastos</div>
            </div>
          </div>
          <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.25rem' }}>
            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: '1rem' }}>Por categoria</div>
            {!catSorted.length
              ? <div style={{ textAlign: 'center', color: 'var(--text-hint)', fontSize: 14, padding: '1rem 0' }}>Sin datos</div>
              : catSorted.map(([cat, val]) => (
                <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 100, textAlign: 'right', flexShrink: 0 }}>{cat}</span>
                  <div style={{ flex: 1, height: 8, background: 'var(--bg)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(val / maxCat * 100).toFixed(1)}%`, background: CAT_COLORS[cat], borderRadius: 4, transition: 'width 0.4s' }} />
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 60, textAlign: 'right', flexShrink: 0 }}>{val.toFixed(2)} EUR</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '9px 12px', fontSize: 15,
  border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius-sm)',
  background: 'var(--bg)', color: 'var(--text)', outline: 'none'
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  )
}
