import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import CrearEvento from './CrearEvento'

export default function RegistrarAsistencia() {
    const [eventos, setEventos] = useState([])
    const [idEventoElegido, setIdEventoElegido] = useState('')
    const [miembros, setMiembros] = useState([])
    const [asistencia, setAsistencia] = useState({})
    const [mensaje, setMensaje] = useState(null)
    const [cargando, setCargando] = useState(false)

    useEffect(() => {
        cargarEventos()
        cargarMiembros()
    }, [])

    async function cargarEventos() {
        const { data } = await supabase.from('eventos').select('*').order('fecha_evento', { ascending: false })
        setEventos(data || [])
    }

    async function cargarMiembros() {
        const { data } = await supabase.from('miembro').select('*').order('nombre_miembro')
        setMiembros(data || [])
    }

    async function elegirEvento(id_evento) {
        setIdEventoElegido(id_evento)
        setMensaje(null)

        const { data } = await supabase
            .from('asistencias')
            .select('id_miembro, asistio')
            .eq('id_evento', id_evento)

        const inicial = {}
        miembros.forEach((m) => {
            const existente = data?.find((a) => a.id_miembro === m.id_miembro)
            inicial[m.id_miembro] = existente ? existente.asistio : 'A'
        })
        setAsistencia(inicial)
    }

    function cambiarAsistencia(id_miembro, valor) {
        setAsistencia((prev) => ({ ...prev, [id_miembro]: valor }))
    }

    async function guardarAsistencia() {
        if (!idEventoElegido) return
        setCargando(true)
        setMensaje(null)

        const registros = miembros.map((m) => ({
            id_evento: idEventoElegido,
            id_miembro: m.id_miembro,
            asistio: asistencia[m.id_miembro] || 'A',
        }))

        const { error } = await supabase.from('asistencias').upsert(registros, { onConflict: 'id_evento,id_miembro' })

        if (error) setMensaje('Error al guardar: ' + error.message)
        else setMensaje('Asistencia guardada.')
        setCargando(false)
    }

    return (
        <div>
            <CrearEvento onEventoCreado={cargarEventos} />

            <hr />

            <h3>Registrar asistencia</h3>

            <label>
                Evento
                <select value={idEventoElegido} onChange={(e) => elegirEvento(e.target.value)}>
                    <option value="">-- Elegí un evento --</option>
                    {eventos.map((ev) => (
                        <option key={ev.id_evento} value={ev.id_evento}>
                            {ev.nombre_evento} ({new Date(ev.fecha_evento).toLocaleDateString()})
                        </option>
                    ))}
                </select>
            </label>

            {idEventoElegido && (
                <div>
                    <table>
                        <thead>
                            <tr>
                                <th>Miembro</th>
                                <th>Presente</th>
                                <th>Ausente</th>
                                <th>Justificado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {miembros.map((m) => (
                                <tr key={m.id_miembro}>
                                    <td>{m.nombre_miembro}</td>
                                    {['P', 'A', 'J'].map((valor) => (
                                        <td key={valor} style={{ textAlign: 'center' }}>
                                            <input
                                                type="radio"
                                                name={'asistencia-' + m.id_miembro}
                                                checked={asistencia[m.id_miembro] === valor}
                                                onChange={() => cambiarAsistencia(m.id_miembro, valor)}
                                            />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <button onClick={guardarAsistencia} disabled={cargando}>
                        {cargando ? 'Guardando...' : 'Guardar asistencia'}
                    </button>
                </div>
            )}

            {mensaje && <p>{mensaje}</p>}
        </div>
    )
}