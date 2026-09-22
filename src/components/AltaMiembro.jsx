import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function AltaMiembro() {
    const [userId, setUserId] = useState('')
    const [nombre, setNombre] = useState('')
    const [correo, setCorreo] = useState('')
    const [fechaNacimiento, setFechaNacimiento] = useState('')
    const [telefono, setTelefono] = useState('')
    const [calidad, setCalidad] = useState('A')
    const [archivoFoto, setArchivoFoto] = useState(null)
    const [mensaje, setMensaje] = useState(null)
    const [cargando, setCargando] = useState(false)

    async function subirFoto() {
        if (!archivoFoto) return null

        const extension = archivoFoto.name.split('.').pop()
        const rutaArchivo = `${userId}-${Date.now()}.${extension}`

        const { error } = await supabase.storage
            .from('fotos-miembros')
            .upload(rutaArchivo, archivoFoto)

        if (error) {
            throw new Error('Error al subir la foto: ' + error.message)
        }

        const { data } = supabase.storage.from('fotos-miembros').getPublicUrl(rutaArchivo)
        return data.publicUrl
    }

    async function handleSubmit(e) {
        e.preventDefault()
        setMensaje(null)
        setCargando(true)

        try {
            const fotoUrl = await subirFoto()

            const { error } = await supabase.from('miembro').insert({
                user_id: userId,
                nombre_miembro: nombre,
                correo_miembro: correo,
                fecha_nacimiento: fechaNacimiento,
                telefono_miembro: telefono,
                calidad: calidad,
                foto_url: fotoUrl,
            })

            if (error) throw new Error(error.message)

            setMensaje('¡Miembro dado de alta correctamente!')
            setUserId('')
            setNombre('')
            setCorreo('')
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
            <h3>Hacer socio a un miembro</h3>
            <p>Primero creá el usuario en Supabase (Authentication → Users) y pegá aquí su UUID.</p>

            <label>
                UUID del usuario (de Supabase Auth)
                <input value={userId} onChange={(e) => setUserId(e.target.value)} required />
            </label>

            <label>
                Nombre completo
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
            </label>

            <label>
                Correo
                <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required />
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
                {cargando ? 'Guardando...' : 'Dar de alta'}
            </button>

            {mensaje && <p>{mensaje}</p>}
        </form>
    )
}