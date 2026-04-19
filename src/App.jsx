import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { initializeApp } from 'firebase/app'
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore'

// ── Firebase ──────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyBgnyWr2HanYznju4BdzPhYOnUnxHGxc0U",
  authDomain: "gastos-app-46d84.firebaseapp.com",
  projectId: "gastos-app-46d84",
  storageBucket: "gastos-app-46d84.firebasestorage.app",
  messagingSenderId: "1074172943713",
  appId: "1:1074172943713:web:81694158dde8fb11b97920"
}

const firebaseApp = initializeApp(firebaseConfig)
const db = getFirestore(firebaseApp)

function getSessionId() {
  const params = new URLSearchParams(window.location.search)
  let id = params.get('sesion')
  if (!id) {
    id = Math.random().toString(36).substring(2, 10)
    params.set('sesion', id)
    window.history.replaceState({}, '', '?' + params.toString())
  }
  return id
}

const SESSION_ID = getSessionId()
const docRef = doc(db, 'sesiones', SESSION_ID)

async function saveData(gastos, lastReset) {
  await setDoc(docRef, { gastos, lastReset: lastReset || null })
}

// ── Categorías ────────────────────────────────────────────
const CAT_COLORS = {
  'Supermercado': '#1D9E75',
  'Restaurantes': '#D85A30',
  'Transporte': '#378ADD',
  'Ropa': '#D4537E',
  'Salud/Farmacia': '#7F77DD',
  'Hogar': '#8BA751',
  'Ocio': '#639922',
  'Otros': '#888780',
}
const CATS = Object.keys(CAT_COLORS)

function formatDate(d) {
  const [y, m, day] = d.split('-')
  return day + '/' + m + '/' + y
}

function formatDateTime(iso) {
  if (!iso) return null
  const d = new Date(iso)
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

function today() {
  return new Date().toISOString().split('T')[0]
}

// ── Design system ─────────────────────────────────────────
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

// ── App ───────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState('add')
  const [gastos, setGastos] = useState([])
  const [form, setForm] = useState({ importe: '', comercio: '', categoria: '', fecha: today() })
  const [toast, setToast] = useState(null)
  const [lastReset, setLastReset] = useState(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists() && !snap.metadata.hasPendingWrites) {
        const data = snap.data()
        setGastos(data.gastos || [])
        setLastReset(data.lastReset || null)
      }
      setLoading(false)
    }, () => setLoading(false))
    return unsub
  }, [])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.importe || !form.comercio || !form.categoria) return
    const newGasto = { ...form, id: Date.now(), importe: parseFloat(form.importe) }
    const newGastos = [newGasto, ...gastos]
    setGastos(newGastos)
    await saveData(newGastos, lastReset)
    setForm({ importe: '', comercio: '', categoria: '', fecha: today() })
    showToast('Gasto guardado')
  }

  async function handleDelete(id) {
    const newGastos = gastos.filter(g => g.id !== id)
    setGastos(newGastos)
    await saveData(newGastos, lastReset)
  }

  async function handleReset() {
    const now = new Date().toISOString()
    setGastos([])
    setLastReset(now)
    await saveData([], now)
    setConfirmReset(false)
    showToast('Datos borrados')
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      showToast('Enlace copiado')
    })
  }

  function downloadXLSX() {
    const rows = gastos.map(g => ({
      Fecha: formatDate(g.fecha),
      Comercio: g.comercio,
      Categoría: g.categoria,
      Importe: g.importe,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Gastos')
    XLSX.writeFile(wb, 'gastos.xlsx')
  }

  const total = gastos.reduce((s, g) => s + g.importe, 0)
  const catSorted = Object.entries(
    gastos.reduce((acc, g) => { acc[g.categoria] = (acc[g.categoria] || 0) + g.importe; return acc }, {})
  ).sort((a, b) => b[1] - a[1])
  const maxCat = catSorted.length ? catSorted[0][1] : 1

  if (loading) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: S.bg, color: S.muted, fontSize: 15 }}>
      Conectando…
    </div>
  )

  return (
    <div style={{ minHeight: '100dvh', background: S.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem 1rem 2rem', fontFamily: "'DM Sans', sans-serif" }}>
      {toast && (
        <div style={{ position: 'fixed', top: '1.25rem', left: '50%', transform: 'translateX(-50%)', background: S.text, color: '#fff', borderRadius: S.radiusPill, padding: '0.6rem 1.25rem', fontSize: 14, fontWeight: 500, zIndex: 999, pointerEvents: 'none' }}>
          {toast}
        </div>
      )}

      {confirmReset && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 998, padding: '1rem' }}>
          <div style={{ background: S.surface, borderRadius: S.radius, padding: '1.5rem', maxWidth: 320, width: '100%' }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>¿Borrar todos los datos?</div>
            <div style={{ fontSize: 14, color: S.muted, marginBottom: '1.25rem' }}>Se eliminarán todos los gastos en ambos dispositivos. No se puede deshacer.</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setConfirmReset(false)} style={{ flex: 1, padding: '0.7rem', borderRadius: S.radiusPill, border: '1px solid ' + S.border, background: 'transparent', cursor: 'pointer', fontSize: 14, color: S.text }}>Cancelar</button>
              <button onClick={handleReset} style={{ flex: 1, padding: '0.7rem', borderRadius: S.radiusPill, border: 'none', background: S.accent, color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>Borrar todo</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px' }}>Gastos</div>
            <div style={{ fontSize: 11, color: S.muted, letterSpacing: '0.5px', textTransform: 'uppercase', marginTop: 2 }}>Sesión: {SESSION_ID}</div>
          </div>
          <button onClick={handleShare} style={{ padding: '0.5rem 1rem', borderRadius: S.radiusPill, border: '1px solid ' + S.border, background: S.surface, fontSize: 13, fontWeight: 500, cursor: 'pointer', color: S.text }}>
            Compartir
          </button>
        </div>

        <div style={{ display: 'flex', gap: 6, background: S.surface, borderRadius: S.radiusPill, padding: '4px', marginBottom: '1.5rem' }}>
          {[['add', 'Añadir'], ['history', 'Historial'], ['summary', 'Resumen']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{ flex: 1, padding: '0.55rem', borderRadius: S.radiusPill, border: 'none', background: tab === key ? S.text : 'transparent', color: tab === key ? '#fff' : S.muted, fontWeight: tab === key ? 600 : 400, fontSize: 14, cursor: 'pointer', transition: 'all 0.15s' }}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'add' && (
          <form onSubmit={handleSubmit} style={{ background: S.surface, borderRadius: S.radius, padding: '1.25rem' }}>
            <Field label="Importe (€)">
              <input type="number" step="0.01" placeholder="0.00" value={form.importe} onChange={e => setForm({ ...form, importe: e.target.value })} style={inputStyle(S)} required />
            </Field>
            <Field label="Comercio">
              <input type="text" placeholder="Mercadona, Renfe…" value={form.comercio} onChange={e => setForm({ ...form, comercio: e.target.value })} style={inputStyle(S)} required />
            </Field>
            <Field label="Categoría">
              <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} style={inputStyle(S)} required>
                <option value="">Selecciona…</option>
                {CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Fecha">
              <input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} style={inputStyle(S)} required />
            </Field>
            <button type="submit" style={{ width: '100%', padding: '0.85rem', borderRadius: S.radiusPill, border: 'none', background: S.text, color: '#fff', fontWeight: 600, fontSize: 15, cursor: 'pointer', marginTop: '0.5rem' }}>
              Guardar gasto
            </button>
          </form>
        )}

        {tab === 'history' && (
          <div>
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

            {gastos.length === 0 ? (
              <div style={{ textAlign: 'center', color: S.hint, fontSize: 14, padding: '2rem 0' }}>Sin datos</div>
            ) : gastos.map(g => (
              <div key={g.id} style={{ background: S.surface, borderRadius: S.radiusSm, padding: '0.9rem 1rem', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: CAT_COLORS[g.categoria] || '#ccc', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.comercio}</div>
                  <div style={{ fontSize: 12, color: S.muted }}>{g.categoria} · {formatDate(g.fecha)}</div>
                </div>
                <div style={{ fontWeight: 600, flexShrink: 0 }}>{g.importe.toFixed(2)} €</div>
                <button onClick={() => handleDelete(g.id)} style={{ background: 'none', border: 'none', color: S.hint, cursor: 'pointer', fontSize: 18, padding: '0 4px', lineHeight: 1 }}>×</button>
              </div>
            ))}

            <button onClick={downloadXLSX} style={{ width: '100%', padding: '0.75rem', borderRadius: S.radiusPill, border: '1px solid ' + S.border, background: 'transparent', fontSize: 14, fontWeight: 500, cursor: 'pointer', marginTop: 8, color: S.text }}>
              Descargar XLSX
            </button>

            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <button onClick={() => setConfirmReset(true)} style={{ padding: '0.6rem 1.25rem', borderRadius: S.radiusPill, border: '1px solid ' + S.accent, background: 'transparent', color: S.accent, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                Resetear datos
              </button>
              {lastReset && (
                <div style={{ fontSize: 11, color: S.hint, marginTop: 6 }}>
                  Último reset: {formatDateTime(lastReset)}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'summary' && (
          <div style={{ background: S.surface, borderRadius: S.radius, padding: '1.25rem' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '1rem' }}>Por categoría</div>
            {!catSorted.length ? (
              <div style={{ textAlign: 'center', color: S.hint, fontSize: 14, padding: '1rem 0' }}>Sin datos</div>
            ) : catSorted.map(([cat, val]) => (
              <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: S.muted, width: 90, textAlign: 'right', flexShrink: 0 }}>{cat}</span>
                <div style={{ flex: 1, height: 6, background: S.bg, borderRadius: S.radiusPill, overflow: 'hidden' }}>
                  <div style={{ width: (val / maxCat * 100).toFixed(1) + '%', background: CAT_COLORS[cat], borderRadius: S.radiusPill, transition: 'width 0.4s', height: '100%' }} />
                </div>
                <span style={{ fontSize: 12, color: S.text, fontWeight: 600, width: 65, textAlign: 'right', flexShrink: 0 }}>{val.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
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
