import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const NOMBRES_ASISTENCIA = { P: 'Presente', A: 'Ausente', J: 'Justificado' }

export default function MiAsistencia({ miembro }) {
    const [asistencias, setAsistencias] = useState([])
    const [cargando, setCargando] = useState(true)

    useEffect(() => {
        async function cargar() {
            setCargando(true)
            const { data } = await supabase
                .from('asistencias')
                .select('*, eventos(nombre_evento, fecha_evento, tipo_evento)')
                .eq('id_miembro', miembro.id_miembro)
                .order('id_asistencia', { ascending: false })
            setAsistencias(data || [])
            setCargando(false)
        }
        cargar()
    }, [])

    if (cargando) return <p>Cargando...</p>
    if (asistencias.length === 0) return <p>Todavía no tenés asistencia registrada.</p>

    return (
        <table>
            <thead><tr><th>Evento</th><th>Fecha</th><th>Tipo</th><th>Asistencia</th></tr></thead>
            <tbody>
                {asistencias.map((a) => (
                    <tr key={a.id_asistencia}>
                        <td>{a.eventos?.nombre_evento}</td>
                        <td>{new Date(a.eventos?.fecha_evento).toLocaleDateString('es-PY')}</td>
                        <td>{a.eventos?.tipo_evento}</td>
                        <td>{NOMBRES_ASISTENCIA[a.asistio]}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    )
}