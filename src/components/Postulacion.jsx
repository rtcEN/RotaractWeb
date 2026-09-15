import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Postulacion() {
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const [telefono, setTelefono] = useState('')
  const [mensaje, setMensaje] = useState(null)
  const [cargando, setCargando] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setMensaje(null)
    setCargando(true)

    // 1) Crear la cuenta de login en Supabase Auth
    const { data, error: errorAuth } = await supabase.auth.signUp({
      email: correo,
      password: password,
    })

    if (errorAuth) {
      setMensaje('Error al crear la cuenta: ' + errorAuth.message)
      setCargando(false)
      return
    }

    // 2) Crear la fila correspondiente en la tabla miembro
    const { error: errorInsert } = await supabase.from('miembro').insert({
      user_id: data.user.id,
      nombre_miembro: nombre,
      correo_miembro: correo,
      fecha_nacimiento: fechaNacimiento,
      telefono_miembro: telefono,
      calidad: 'A', // aspirante
    })

    if (errorInsert) {
      setMensaje('Cuenta creada, pero hubo un error al guardar tus datos: ' + errorInsert.message)
    } else {
      setMensaje('¡Postulación enviada! Revisá tu correo para confirmar la cuenta.')
    }

    setCargando(false)
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Postulate a Rotaract Encarnación Norte</h2>

      <label>
        Nombre completo
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
      </label>

      <label>
        Correo
        <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required />
      </label>

      <label>
        Contraseña
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
      </label>

      <label>
        Fecha de nacimiento
        <input type="date" value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)} required />
      </label>

      <label>
        Teléfono
        <input value={telefono} onChange={(e) => setTelefono(e.target.value)} />
      </label>

      <button type="submit" disabled={cargando}>
        {cargando ? 'Enviando...' : 'Postularme'}
      </button>

      {mensaje && <p>{mensaje}</p>}
    </form>
  )
}
