import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function AltaMiembro() {
    const [nombre, setNombre] = useState('')
    const [correo, setCorreo] = useState('')
    const [password, setPassword] = useState('')
    const [fechaNacimiento, setFechaNacimiento] = useState('')
    const [telefono, setTelefono] = useState('')
    const [calidad, setCalidad] = useState('A')
    const [archivoFoto, setArchivoFoto] = useState(null)
    const [mensaje, setMensaje] = useState(null)
    const [cargando, setCargando] = useState(false)

    async function subirFoto(userId) {
        if (!archivoFoto) return null

        const extension = archivoFoto.name.split('.').pop()
        const rutaArchivo = `${userId}-${Date.now()}.${extension}`

        const { error } = await supabase.storage.from('fotos-miembros').upload(rutaArchivo, archivoFoto)
        if (error) throw new Error('Error al subir la foto: ' + error.message)

        const { data } = supabase.storage.from('fotos-miembros').getPublicUrl(rutaArchivo)
        return data.publicUrl
    }

    async function handleSubmit(e) {
        e.preventDefault()
        setMensaje(null)
        setCargando(true)

        try {
            const { data, error } = await supabase.functions.invoke('crear-miembro', {
                body: { correo, password, nombre, fecha_nacimiento: fechaNacimiento, telefono, calidad },
            })

            if (error) {
                // error.message suele ser un texto genérico ("non-2xx status code").
                // El mensaje real que arma nuestra función va en el cuerpo de la respuesta.
                let detalle = error.message
                if (error.context) {
                    try {
                        const cuerpo = await error.context.json()
                        detalle = cuerpo.error || detalle
                    } catch {
                        // el cuerpo no era JSON, nos quedamos con error.message
                    }
                }
                throw new Error(detalle)
            }
            if (data?.error) throw new Error(data.error)

            if (archivoFoto) {
                const fotoUrl = await subirFoto(data.user_id)
                await supabase.from('miembro').update({ foto_url: fotoUrl }).eq('user_id', data.user_id)
            }

            setMensaje('¡Miembro dado de alta correctamente! Contraseña temporal: ' + password)
            setNombre('')
            setCorreo('')
            setPassword('')
            setFechaNacimiento('')
            setTelefono('')
            setCalidad('A')
            setArchivoFoto(null)
        } catch (err) {
            setMensaje('Error: ' + err.message)
        }

        setCargando(false)
    }

    return (
        <form onSubmit={handleSubmit}>
            <h3>Crear usuario del nuevo miembro</h3>
            <p>Se crea la cuenta de acceso y el registro del club en un solo paso.</p>

            <label>
                Nombre completo
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
            </label>

            <label>
                Correo
                <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required />
            </label>

            <label>
                Contraseña temporal
                <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </label>

            <label>
                Fecha de nacimiento
                <input type="date" value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)} required />
            </label>

            <label>
                Teléfono
                <input value={telefono} onChange={(e) => setTelefono(e.target.value)} />
            </label>

            <label>
                Calidad
                <select value={calidad} onChange={(e) => setCalidad(e.target.value)}>
                    <option value="A">Aspirante</option>
                    <option value="S">Socio</option>
                    <option value="H">Honorario</option>
                </select>
            </label>

            <label>
                Foto de perfil
                <input type="file" accept="image/*" onChange={(e) => setArchivoFoto(e.target.files[0])} />
            </label>

            <button type="submit" disabled={cargando}>
                {cargando ? 'Guardando...' : 'Cargar Miembro'}
            </button>

            {mensaje && <p>{mensaje}</p>}
        </form>
    )
}