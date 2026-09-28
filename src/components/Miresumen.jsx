import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function MiResumen({ miembro }) {
    const [habilitacion, setHabilitacion] = useState(null)
    const [eventos, setEventos] = useState([])
    const [cargando, setCargando] = useState(true)

    useEffect(() => {
        cargar()
    }, [])

    async function cargar() {
        setCargando(true)
        const { data: hab } = await supabase.rpc('habilitado_evento_distrital', { p_id_miembro: miembro.id_miembro })
        setHabilitacion(hab?.[0] || null)

        const { data: ev } = await supabase
            .from('eventos')
            .select('*')
            .gte('fecha_evento', new Date().toISOString())
            .order('fecha_evento', { ascending: true })
            .limit(5)
        setEventos(ev || [])
        setCargando(false)
    }

    if (cargando) return <p>Cargando...</p>

    return (
        <div>
            <h4>Habilitación para eventos distritales</h4>
            {habilitacion && (
                <div>
                    <span className={'rtc-badge rtc-badge--' + (habilitacion.habilitado ? 'activo' : 'pendiente')}>
                        {habilitacion.habilitado ? 'Habilitado' : 'No habilitado'}
                    </span>
                    <p>
                        Asistencia: {habilitacion.porcentaje_asistencia}% (se necesita 70%) ·{' '}
                        Cuotas pendientes: {habilitacion.cuotas_pendientes} ·{' '}
                        Préstamos sin saldar: {habilitacion.prestamos_pendientes}
                    </p>
                </div>
            )}

            <hr />

            <h4>Próximos eventos</h4>
            {eventos.length === 0 && <p>No hay eventos próximos cargados.</p>}
            <table>
                <thead><tr><th>Evento</th><th>Fecha</th><th>Lugar</th><th>Tipo</th></tr></thead>
                <tbody>
                    {eventos.map((e) => (
                        <tr key={e.id_evento}>
                            <td>{e.nombre_evento}</td>
                            <td>{new Date(e.fecha_evento).toLocaleString('es-PY')}</td>
                            <td>{e.lugar_evento}</td>
                            <td>{e.tipo_evento}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}