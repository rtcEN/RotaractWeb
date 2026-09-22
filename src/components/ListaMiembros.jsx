import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const NOMBRES_CALIDAD = { A: 'Aspirante', S: 'Socio', H: 'Honorario' }
const CLASE_CALIDAD = { A: 'aspirante', S: 'socio', H: 'socio' }

export default function ListaMiembros() {
    const [miembros, setMiembros] = useState([])
    const [cargando, setCargando] = useState(true)
    const [mensaje, setMensaje] = useState(null)

    useEffect(() => {
        cargarMiembros()
    }, [])

    async function cargarMiembros() {
        setCargando(true)
        const { data, error } = await supabase
            .from('miembro')
            .select('*')
            .order('id_miembro', { ascending: true })

        if (error) {
            setMensaje('Error al cargar miembros: ' + error.message)
        } else {
            setMiembros(data)
        }
        setCargando(false)
    }

    async function aprobarComoSocio(id_miembro) {
        const { error } = await supabase.from('miembro').update({ calidad: 'S' }).eq('id_miembro', id_miembro)
        if (error) setMensaje('Error al aprobar: ' + error.message)
        else cargarMiembros()
    }

    async function cambiarEstado(id_miembro, estadoActual) {
        const nuevoEstado = estadoActual === 'A' ? 'I' : 'A'
        const { error } = await supabase.from('miembro').update({ estado_miembro: nuevoEstado }).eq('id_miembro', id_miembro)
        if (error) setMensaje('Error al cambiar estado: ' + error.message)
        else cargarMiembros()
    }

    if (cargando) return <p>Cargando miembros...</p>

    return (
        <div>
            <h3>Miembros del club</h3>
            {mensaje && <p>{mensaje}</p>}

            <table>
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>Correo</th>
                        <th>Calidad</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {miembros.map((m) => (
                        <tr key={m.id_miembro}>
                            <td>{m.nombre_miembro}</td>
                            <td>{m.correo_miembro}</td>
                            <td><span className={'rtc-badge rtc-badge--' + CLASE_CALIDAD[m.calidad]}>{NOMBRES_CALIDAD[m.calidad]}</span></td>
                            <td><span className={'rtc-badge rtc-badge--' + (m.estado_miembro === 'A' ? 'activo' : 'inactivo')}>{m.estado_miembro === 'A' ? 'Activo' : 'Inactivo'}</span></td>
                            <td>
                                {m.calidad === 'A' && (
                                    <button onClick={() => aprobarComoSocio(m.id_miembro)}>Aprobar como socio</button>
                                )}
                                <button className="rtc-btn-secundario" onClick={() => cambiarEstado(m.id_miembro, m.estado_miembro)}>
                                    {m.estado_miembro === 'A' ? 'Marcar inactivo' : 'Marcar activo'}
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}