import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '../supabaseClient'

export default function Login({ onLoginExitoso }) {
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [error, setError] = useState(null)
  const [cargando, setCargando] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setCargando(true)

    const { data, error: errorLogin } = await supabase.auth.signInWithPassword({
      email: correo,
      password: password,
    })

    if (errorLogin) {
      setError('Correo o contraseña incorrectos')
      setCargando(false)
      return
    }

    const { data: miembro, error: errorMiembro } = await supabase
      .from('miembro')
      .select('*')
      .eq('user_id', data.user.id)
      .single()

    if (errorMiembro) {
      setError('No se encontró tu registro de miembro')
    } else if (onLoginExitoso) {
      onLoginExitoso(miembro)
    }

    setCargando(false)
  }

  return (
    <div className="rtc-auth-page">
      <div className="rtc-auth-card">
        <form onSubmit={handleSubmit}>
          <h2>Iniciar sesión</h2>

          <label>
            Correo
            <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required />
          </label>

          <label>
            Contraseña
            <div className="rtc-input-con-icono">
              <input
                type={mostrarPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="rtc-icono-input"
                onClick={() => setMostrarPassword((valor) => !valor)}
                title={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                tabIndex={-1}
              >
                {mostrarPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <button type="submit" disabled={cargando}>
            {cargando ? 'Ingresando...' : 'Ingresar'}
          </button>

          {error && <p style={{ color: '#C0335A' }}>{error}</p>}
        </form>
      </div>
    </div>
  )
}