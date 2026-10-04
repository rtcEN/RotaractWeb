import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import Login from './components/Login'
import Panel from './components/Panel'
import './App.css'

export default function App() {
  const [miembro, setMiembro] = useState(null)
  const [cargandoSesion, setCargandoSesion] = useState(true)

  useEffect(() => {
    async function revisarSesion() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data } = await supabase
          .from('miembro')
          .select('*')
          .eq('user_id', session.user.id)
          .single()
        setMiembro(data)
      }
      setCargandoSesion(false)
    }
    revisarSesion()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    setMiembro(null)
  }

  if (cargandoSesion) return <p style={{ padding: '2rem' }}>Cargando...</p>

  // El panel maneja su propio layout completo (menú lateral incluido).
  if (miembro) {
    return (
      <BrowserRouter>
        <Panel miembro={miembro} onLogout={handleLogout} />
      </BrowserRouter>
    )
  }

  // Sin sesión, cualquier ruta pública lleva directamente al login.
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login onLoginExitoso={setMiembro} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
