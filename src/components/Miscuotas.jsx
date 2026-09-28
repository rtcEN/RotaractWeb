import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function MisCuotas({ miembro }) {
    const [cuotas, setCuotas] = useState([])
    const [pagos, setPagos] = useState([])
    const [cargando, setCargando] = useState(true)

    useEffect(() => {
        cargar()
    }, [])

    async function cargar() {
        setCargando(true)
        const { data: c } = await supabase
            .from('cuotas')
            .select('*')
            .eq('aplica_calidad', miembro.calidad)
            .order('fecha_vencimiento')
        setCuotas(c || [])

        const { data: p } = await supabase.from('pagos').select('*').eq('id_miembro', miembro.id_miembro)
        setPagos(p || [])
        setCargando(false)
    }

    if (cargando) return <p>Cargando...</p>

    return (
        <div>
            <table>
                <thead><tr><th>Período</th><th>Monto</th><th>Estado</th><th>Fecha de pago</th></tr></thead>
                <tbody>
                    {cuotas.map((c) => {
                        const pago = pagos.find((p) => p.id_cuota === c.id_cuota)
                        const pagado = pago?.estado_pago === 'pagado'
                        return (
                            <tr key={c.id_cuota}>
                                <td>{c.periodo_cuota}</td>
                                <td>Gs. {Number(c.monto_cuota).toLocaleString('es-PY')}</td>
                                <td>
                                    <span className={'rtc-badge rtc-badge--' + (pagado ? 'activo' : 'pendiente')}>
                                        {pagado ? 'Pagado' : 'Pendiente'}
                                    </span>
                                </td>
                                <td>{pago?.fecha_pago ? new Date(pago.fecha_pago).toLocaleDateString('es-PY') : '—'}</td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}