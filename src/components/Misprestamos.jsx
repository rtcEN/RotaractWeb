import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const NOMBRES_ESTADO = { pendiente: 'Pendiente', aprobado: 'Aprobado', rechazado: 'Rechazado', pagado: 'Pagado' }

export default function MisPrestamos({ miembro }) {
    const [prestamos, setPrestamos] = useState([])
    const [monto, setMonto] = useState('')
    const [observaciones, setObservaciones] = useState('')
    const [mensaje, setMensaje] = useState(null)
    const [cargando, setCargando] = useState(true)

    useEffect(() => {
        cargar()
    }, [])

    async function cargar() {
        setCargando(true)
        const { data } = await supabase
            .from('prestamos')
            .select('*')
            .eq('id_miembro', miembro.id_miembro)
            .order('fecha_solicitud', { ascending: false })
        setPrestamos(data || [])
        setCargando(false)
    }

    async function solicitar(e) {
        e.preventDefault()
        if (!monto) return
        const { error } = await supabase.from('prestamos').insert({
            id_miembro: miembro.id_miembro,
            monto,
            observaciones,
        })
        if (error) setMensaje('Error al solicitar: ' + error.message)
        else {
            setMensaje('Solicitud enviada.')
            setMonto('')
            setObservaciones('')
            cargar()
        }
    }

    if (cargando) return <p>Cargando...</p>

    return (
        <div>
            {mensaje && <p>{mensaje}</p>}
            <table>
                <thead><tr><th>Monto</th><th>Fecha</th><th>Estado</th></tr></thead>
                <tbody>
                    {prestamos.length === 0 && <tr><td colSpan={3}>No tenés préstamos solicitados.</td></tr>}
                    {prestamos.map((p) => (
                        <tr key={p.id_prestamo}>
                            <td>Gs. {Number(p.monto).toLocaleString('es-PY')}</td>
                            <td>{new Date(p.fecha_solicitud).toLocaleDateString('es-PY')}</td>
                            <td><span className={'rtc-badge rtc-badge--' + (p.estado_prestamo === 'pagado' ? 'activo' : 'pendiente')}>{NOMBRES_ESTADO[p.estado_prestamo]}</span></td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <h4>Solicitar un préstamo</h4>
            <form onSubmit={solicitar}>
                <label>
                    Monto (Gs.)
                    <input type="number" value={monto} onChange={(e) => setMonto(e.target.value)} required />
                </label>
                <label>
                    Motivo / observaciones
                    <input value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
                </label>
                <button type="submit">Solicitar</button>
            </form>
        </div>
    )
}