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
  return day + '/' + m + '/' + y
}
function formatDateTime(iso) {
  if (!iso) return null
  const d = new Date(iso)
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}
function today() {
  return new Date().toISOString().split('T')[0]
}

const S = {
  bg: '#EDEAE4',
  surface: '#F8F6F2',
  border: 'rgba(0,0,0,0.08)',
  text: '#1A1A1A',
  muted: '#7A7672',
  hint: '#B0ADA8',
  accent: '#CC5533',
  radius: '16px',
  radiusSm: '10px',
  radiusPill: '999px',
}

export default function App() {
  const [tab, setTab] = useState('add')
  const [gastos, setGastos] = useState(() => JSON.parse(localStorage.getItem('gastos_app') || '[]'))
  const [form, setForm] = useState({ importe: '', comercio: '', categoria: '', fecha: today() })
  const [toast, setToast] = useState(null)
  const [lastReset, setLastReset] = useState(() => localStorage.getItem('gastos_last_reset') || null)
  const [confirmReset, setConfirmReset] = useState(false)

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
    setToast('guardado')
    setTimeout(() => setToast(null), 2000)
  }

  function exportXLSX() {
    if (!gastos.length) { alert('No hay gastos que exportar'); return }
    const data = gastos.map(g => ({ Fecha: formatDate(g.fecha), Establecimiento: g.comercio, Categoria: g.categoria, 'Importe (EUR)': g.importe }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Gastos')
    XLSX.writeFile(wb, 'gastos.xlsx')
  }

  function handleReset() {
    const now = new Date().toISOString()
    setGastos([])
    setLastReset(now)
    localStorage.setItem('gastos_last_reset', now)
    localStorage.removeItem('gastos_app')
    setConfirmReset(false)
    setToast('reset')
    setTimeout(() => setToast(null), 2500)
  }

  const total = gastos.reduce((s, g) => s + g.importe, 0)
  const cats = {}
  gastos.forEach(g => cats[g.categoria] = (cats[g.categoria] || 0) + g.importe)
  const catSorted = Object.entries(cats).sort((a, b) => b[1] - a[1])
  const maxCat = catSorted[0]?.[1] || 1

  const tabLabels = { add: 'Anadir', list: 'Historial', stats: 'Resumen' }

  return (
    <div style={{ background: S.bg, minHeight: '100dvh', fontFamily: "'DM Sans', sans-serif" }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 999, background: S.text, color: '#fff', fontSize: 13, fontWeight: 500, padding: '10px 20px', borderRadius: S.radiusPill, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', whiteSpace: 'nowrap' }}>
          {toast === 'guardado' ? 'Gasto guardado' : 'Datos borrados'}
        </div>
      )}

      {/* Confirm reset modal */}
      {confirmReset && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div style={{ background: S.surface, borderRadius: S.radius, padding: '1.5rem', width: '100%', maxWidth: 320 }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Borrar todos los datos</div>
            <div style={{ fontSize: 13, color: S.muted, marginBottom: 20 }}>Esta accion no se puede deshacer. Los {gastos.length} gastos se eliminaran permanentemente.</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setConfirmReset(false)} style={{ flex: 1, padding: '11px', fontSize: 14, fontWeight: 500, background: 'transparent', border: '1px solid ' + S.border, borderRadius: S.radiusPill, cursor: 'pointer', color: S.text }}>Cancelar</button>
              <button onClick={handleReset} style={{ flex: 1, padding: '11px', fontSize: 14, fontWeight: 500, background: S.accent, color: '#fff', border: 'none', borderRadius: S.radiusPill, cursor: 'pointer' }}>Borrar todo</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ padding: '1.5rem 1.25rem 0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.5px' }}>Gastos</span>
        <span style={{ fontSize: 13, color: S.muted, fontWeight: 500 }}>{total.toFixed(2)} EUR</span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, padding: '0.5rem 1.25rem 1rem' }}>
        {['add', 'list', 'stats'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '9px 0', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            background: tab === t ? S.text : S.surface,
            color: tab === t ? '#fff' : S.muted,
            border: 'none',
            borderRadius: S.radiusPill,
            transition: 'all 0.15s',
            boxShadow: tab === t ? '0 2px 8px rgba(0,0,0,0.15)' : 'none'
          }}>
            {tabLabels[t]}
          </button>
        ))}
      </div>

      {/* ADD TAB */}
      {tab === 'add' && (
        <div style={{ padding: '0 1.25rem' }}>
          <div style={{ background: S.surface, borderRadius: S.radius, padding: '1.25rem', marginBottom: 10 }}>
            <Field label="Importe (EUR)">
              <input type="number" placeholder="0.00" step="0.01" min="0" value={form.importe}
                onChange={e => setForm(p => ({ ...p, importe: e.target.value }))} style={inputStyle(S)} />
            </Field>
            <Field label="Establecimiento">
              <input type="text" placeholder="Nombre del negocio" value={form.comercio}
                onChange={e => setForm(p => ({ ...p, comercio: e.target.value }))} style={inputStyle(S)} />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Categoria">
                <select value={form.categoria} onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))} style={inputStyle(S)}>
                  <option value="">Elige</option>
                  {CATS.map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Fecha">
                <input type="date" value={form.fecha} onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))} style={inputStyle(S)} />
              </Field>
            </div>
            <button onClick={handleAdd} style={{ width: '100%', padding: '13px', marginTop: 6, fontSize: 15, fontWeight: 600, background: S.text, color: '#fff', border: 'none', borderRadius: S.radiusPill, cursor: 'pointer', letterSpacing: '-0.2px' }}>
              Guardar gasto
            </button>
          </div>

          <button onClick={exportXLSX} style={{ width: '100%', padding: '12px', fontSize: 13, fontWeight: 500, background: S.surface, color: S.muted, border: 'none', borderRadius: S.radiusPill, cursor: 'pointer', marginBottom: 8 }}>
            Exportar XLSX
          </button>
          <button onClick={() => setConfirmReset(true)} style={{ width: '100%', padding: '12px', fontSize: 13, fontWeight: 500, background: 'transparent', color: S.accent, border: '1px solid ' + S.accent + '55', borderRadius: S.radiusPill, cursor: 'pointer' }}>
            Resetear datos
          </button>
          {lastReset && (
            <div style={{ textAlign: 'center', fontSize: 11, color: S.hint, marginTop: 10 }}>
              Ultimo reset: {formatDateTime(lastReset)}
            </div>
          )}
        </div>
      )}

      {/* LIST TAB */}
      {tab === 'list' && (
        <div style={{ padding: '0 1.25rem' }}>
          <div style={{ background: S.surface, borderRadius: S.radius, overflow: 'hidden' }}>
            {!gastos.length
              ? <div style={{ textAlign: 'center', color: S.hint, padding: '2.5rem 0', fontSize: 14 }}>Sin gastos aun</div>
              : [...gastos].sort((a, b) => b.fecha.localeCompare(a.fecha)).map((g, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 1.25rem', borderBottom: i < gastos.length - 1 ? '1px solid ' + S.border : 'none' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{g.comercio}</div>
                    <div style={{ fontSize: 12, color: S.muted, marginTop: 2 }}>{formatDate(g.fecha)}</div>
                    <span style={{ display: 'inline-block', fontSize: 11, padding: '2px 10px', borderRadius: S.radiusPill, marginTop: 5, background: CAT_COLORS[g.categoria] + '20', color: CAT_COLORS[g.categoria], fontWeight: 500 }}>{g.categoria}</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{g.importe.toFixed(2)} EUR</div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* STATS TAB */}
      {tab === 'stats' && (
        <div style={{ padding: '0 1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div style={{ background: S.surface, borderRadius: S.radius, padding: '1.25rem', textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-1px' }}>{total.toFixed(2)}</div>
              <div style={{ fontSize: 11, color: S.muted, marginTop: 4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>EUR total</div>
            </div>
            <div style={{ background: S.surface, borderRadius: S.radius, padding: '1.25rem', textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 600 }}>{gastos.length}</div>
              <div style={{ fontSize: 11, color: S.muted, marginTop: 4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Gastos</div>
            </div>
          </div>
          <div style={{ background: S.surface, borderRadius: S.radius, padding: '1.25rem' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '1rem' }}>Por categoria</div>
            {!catSorted.length
              ? <div style={{ textAlign: 'center', color: S.hint, fontSize: 14, padding: '1rem 0' }}>Sin datos</div>
              : catSorted.map(([cat, val]) => (
                <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: 12, color: S.muted, width: 90, textAlign: 'right', flexShrink: 0 }}>{cat}</span>
                  <div style={{ flex: 1, height: 6, background: S.bg, borderRadius: S.radiusPill, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: (val / maxCat * 100).toFixed(1) + '%', background: CAT_COLORS[cat], borderRadius: S.radiusPill, transition: 'width 0.4s' }} />
                  </div>
                  <span style={{ fontSize: 12, color: S.text, fontWeight: 600, width: 65, textAlign: 'right', flexShrink: 0 }}>{val.toFixed(2)}</span>
                </div>
              ))}
          </div>
        </div>
      )}
      <div style={{ height: '2rem' }} />
    </div>
  )
}

function inputStyle(S) {
  return {
    width: '100%', padding: '10px 14px', fontSize: 15,
    border: '1px solid ' + S.border, borderRadius: S.radiusSm,
    background: S.bg, color: S.text, outline: 'none',
    fontFamily: "'DM Sans', sans-serif"
  }
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', fontSize: 12, color: '#7A7672', marginBottom: 6, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
      {children}
    </div>
  )
}
