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

            let avisoCuotas = ''
            if (data?.user_id) {
                const { data: miembroNuevo, error: miembroError } = await supabase
                    .from('miembro')
                    .select('id_miembro, calidad, fecha_ingreso, creado_en')
                    .eq('user_id', data.user_id)
                    .single()

                if (miembroError) {
                    avisoCuotas = miembroError.message
                } else {
                    const { data: historial, error: historialError } = await supabase
                        .from('miembro_calidad_historial')
                        .select('id_historial')
                        .eq('id_miembro', miembroNuevo.id_miembro)
                        .limit(1)

                    if (historialError) {
                        avisoCuotas = historialError.message
                    } else if (!historial?.length) {
                        const fechaInicio = miembroNuevo.fecha_ingreso || miembroNuevo.creado_en?.slice(0, 10)
                        if (!fechaInicio) {
                            avisoCuotas = 'No se encontró fecha de ingreso para iniciar el historial de calidad.'
                        } else {
                            const { error: insertarHistorialError } = await supabase
                                .from('miembro_calidad_historial')
                                .insert({
                                    id_miembro: miembroNuevo.id_miembro,
                                    calidad: miembroNuevo.calidad,
                                    fecha_desde: fechaInicio,
                                })
                            if (insertarHistorialError) avisoCuotas = insertarHistorialError.message
                        }
                    }

                    if (!avisoCuotas && miembroNuevo.calidad !== 'H') {
                        const { error: generarError } = await supabase.rpc('generar_cuotas_miembro', {
                            p_id_miembro: miembroNuevo.id_miembro,
                        })
                        if (generarError) avisoCuotas = generarError.message
                    }
                }
            } else {
                avisoCuotas = 'No se recibió el usuario creado para generar su historial y cuotas.'
            }

            if (archivoFoto) {
                const fotoUrl = await subirFoto(data.user_id)
                await supabase.from('miembro').update({ foto_url: fotoUrl }).eq('user_id', data.user_id)
            }

            setMensaje(avisoCuotas
                ? `Miembro creado, pero no se pudo iniciar su historial o sus cuotas: ${avisoCuotas}`
                : calidad === 'H'
                    ? '¡Miembro dado de alta correctamente! Se inició su historial. Honorario no genera cuotas. Contraseña temporal: ' + password
                    : '¡Miembro dado de alta correctamente! Se inicializaron su historial y sus cuotas. Contraseña temporal: ' + password)
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
