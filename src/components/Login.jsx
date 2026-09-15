import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Login({ onLoginExitoso }) {
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
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

    // Traer los datos del miembro asociado a esta cuenta
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
    <form onSubmit={handleSubmit}>
      <h2>Iniciar sesión</h2>

      <label>
        Correo
        <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required />
      </label>

      <label>
        Contraseña
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </label>

      <button type="submit" disabled={cargando}>
        {cargando ? 'Ingresando...' : 'Ingresar'}
      </button>

      {error && <p style={{ color: 'red' }}>{error}</p>}
    </form>
  )
}
