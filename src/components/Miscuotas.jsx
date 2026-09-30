import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const NOMBRE_CALIDAD = { A: 'Aspirante', S: 'Socio', H: 'Honorario' }

function mesDeCuota(cuota) {
    if (cuota.fecha_vencimiento) return `${cuota.fecha_vencimiento.slice(0, 7)}-01`
    const match = cuota.periodo_cuota?.match(/^\s*([A-Za-zÁÉÍÓÚÑáéíóúñ]+)\s+(\d{4})\s*$/)
    if (!match) return null
    const meses = ['febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
    const indice = meses.indexOf(match[1].normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase())
    return indice < 0 ? null : `${match[2]}-${String(indice + 1).padStart(2, '0')}-01`
}

function calidadEnFecha(historial, fecha, miembro) {
    const mes = fecha.slice(0, 7)
    // Si hay períodos superpuestos, prevalece el que empezó más recientemente.
    const periodo = [...historial]
        .filter((h) => h.fecha_desde.slice(0, 7) <= mes && (!h.fecha_hasta || h.fecha_hasta.slice(0, 7) >= mes))
        .sort((a, b) => b.fecha_desde.localeCompare(a.fecha_desde))[0]?.calidad
    if (periodo) return periodo

    // Si hay historial, no aplicar la calidad actual a meses fuera de sus períodos.
    if (historial.length) return null

    // Miembros creados después de activar el historial pueden no tener fila todavía.
    const fechaIngreso = miembro.fecha_ingreso || miembro.creado_en?.slice(0, 10)
    if (fechaIngreso && mes < fechaIngreso.slice(0, 7)) return null
    return miembro.calidad
}

function agruparPorPeriodo(cuotas, pagos) {
    const periodos = new Map()
    for (const cuota of cuotas) {
        const fecha = mesDeCuota(cuota)
        if (!fecha) continue
        const anio = Number(fecha.slice(0, 4))
        const mes = Number(fecha.slice(5, 7))
        const inicioPeriodo = mes >= 7 ? anio : anio - 1
        const idPeriodo = `${inicioPeriodo}-${inicioPeriodo + 1}`
        const semestre = mes >= 7 ? 1 : 2
        if (!periodos.has(idPeriodo)) periodos.set(idPeriodo, { id: idPeriodo, inicio: inicioPeriodo, semestres: { 1: [], 2: [] } })
        periodos.get(idPeriodo).semestres[semestre].push(cuota)
    }

    const hoy = new Date()
    const periodoActualInicio = hoy.getMonth() >= 6 ? hoy.getFullYear() : hoy.getFullYear() - 1
    return [...periodos.values()]
        .filter((periodo) => periodo.inicio === periodoActualInicio || periodo.inicio === periodoActualInicio - 1)
        .sort((a, b) => b.inicio - a.inicio)
        .map((periodo) => ({
        ...periodo,
        semestres: Object.entries(periodo.semestres)
            .filter(([numero, items]) => items.length > 0 && !(periodo.inicio === periodoActualInicio - 1 && numero === '1'))
            .map(([numero, items]) => {
                const pagadas = items.filter((cuota) => pagos.find((p) => p.id_cuota === cuota.id_cuota)?.estado_pago === 'pagado').length
                const numeroSemestre = Number(numero)
                const rango = numeroSemestre === 1
                    ? `julio–diciembre ${periodo.inicio}`
                    : `febrero–junio ${periodo.inicio + 1}`
                return { numero: numeroSemestre, rango, cuotas: items, pendientes: items.length - pagadas }
            }),
        }))
}

export default function MisCuotas({ miembro }) {
    const [cuotas, setCuotas] = useState([])
    const [pagos, setPagos] = useState([])
    const [cargando, setCargando] = useState(true)
    const [mensaje, setMensaje] = useState('')

    useEffect(() => { cargar() }, [miembro.id_miembro])

    async function cargar() {
        setCargando(true)
        const [cuotasResp, pagosResp, historialResp] = await Promise.all([
            supabase.from('cuotas').select('*').order('fecha_vencimiento'),
            supabase.from('pagos').select('*').eq('id_miembro', miembro.id_miembro),
            supabase.from('miembro_calidad_historial').select('*').eq('id_miembro', miembro.id_miembro).order('fecha_desde', { ascending: false }),
        ])
        const error = cuotasResp.error || pagosResp.error || historialResp.error
        if (error) setMensaje('No se pudieron cargar las cuotas: ' + error.message)
        const historial = historialResp.data || []
        const visibles = (cuotasResp.data || []).filter((cuota) => {
            const mes = mesDeCuota(cuota)
            if (!mes || mes.slice(5, 7) === '01') return false
            const calidad = calidadEnFecha(historial, mes, miembro)
            return calidad != null && cuota.aplica_calidad === calidad
        })
        setCuotas(visibles)
        setPagos(pagosResp.data || [])
        setCargando(false)
    }

    if (cargando) return <p>Cargando...</p>

    const periodos = agruparPorPeriodo(cuotas, pagos)

    return (
        <div>
            {mensaje && <p>{mensaje}</p>}
            <p>Las cuotas se agrupan por período rotario. Enero no tiene cuota.</p>
            {periodos.map((periodo) => (
                <section key={periodo.id}>
                    <h3>Período {periodo.inicio}–{periodo.inicio + 1}</h3>
                    {periodo.semestres.map((semestre) => (
                        <details key={semestre.numero}>
                            <summary>
                                {semestre.numero === 1 ? 'Primer' : 'Segundo'} semestre · Período {periodo.inicio}–{periodo.inicio + 1} ({semestre.rango}) · {semestre.cuotas.length} cuotas · {semestre.pendientes} pendientes
                            </summary>
                            <table>
                                <thead><tr><th>Mes</th><th>Calidad del período</th><th>Monto</th><th>Estado</th><th>Fecha de pago</th></tr></thead>
                                <tbody>
                                    {semestre.cuotas.map((c) => {
                                        const pago = pagos.find((p) => p.id_cuota === c.id_cuota)
                                        const pagado = pago?.estado_pago === 'pagado'
                                        return (
                                            <tr key={c.id_cuota}>
                                                <td>{c.periodo_cuota}</td>
                                                <td>{NOMBRE_CALIDAD[c.aplica_calidad] || '—'}</td>
                                                <td>Gs. {Number(c.monto_cuota).toLocaleString('es-PY')}</td>
                                                <td><span className={'rtc-badge rtc-badge--' + (pagado ? 'activo' : 'pendiente')}>{pagado ? 'Pagado' : 'Pendiente'}</span></td>
                                                <td>{pago?.fecha_pago ? new Date(`${pago.fecha_pago}T12:00:00`).toLocaleDateString('es-PY') : '—'}</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </details>
                    ))}
                </section>
            ))}
            {periodos.length === 0 && <p>No hay cuotas para mostrar.</p>}
        </div>
    )
}
