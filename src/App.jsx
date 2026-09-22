import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom'
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

  // Páginas públicas: inicio y login, con nav simple arriba.
  return (
    <BrowserRouter>
      <header className="rtc-nav">
        <Link to="/" className="rtc-brand">
          <img src="/images/logo.png" alt="Rotaract Encarnación Norte" />
        </Link>
        <nav>
          <Link to="/">Inicio</Link>
          <Link to="/login">Iniciar sesión</Link>
        </nav>
      </header>

      <div className="rtc-public-content">
        <Routes>
          <Route path="/" element={<h1>Rotaract Encarnación Norte</h1>} />
          <Route path="*" element={<Login onLoginExitoso={setMiembro} />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}