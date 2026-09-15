import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import Postulacion from './components/Postulacion'
import Login from './components/Login'
import Panel from './components/Panel'

export default function App() {
  const [miembro, setMiembro] = useState(null)
  const [cargandoSesion, setCargandoSesion] = useState(true)

  // Al cargar la app, revisa si ya hay una sesión activa
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

  if (cargandoSesion) return <p>Cargando...</p>

  return (
    <BrowserRouter>
      <nav>
        <Link to="/">Inicio</Link> | <Link to="/postulacion">Postularme</Link> |{' '}
        {miembro ? <Link to="/panel">Mi panel</Link> : <Link to="/login">Iniciar sesión</Link>}
      </nav>

      <Routes>
        <Route path="/" element={<h1>Rotaract Encarnación Norte</h1>} />
        <Route path="/postulacion" element={<Postulacion />} />
        <Route
          path="/login"
          element={miembro ? <Navigate to="/panel" /> : <Login onLoginExitoso={setMiembro} />}
        />
        <Route
          path="/panel"
          element={miembro ? <Panel miembro={miembro} onLogout={handleLogout} /> : <Navigate to="/login" />}
        />
      </Routes>
    </BrowserRouter>
  )
}
