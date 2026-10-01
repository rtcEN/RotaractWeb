import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'

const NOMBRE_CALIDAD = { A: 'Aspirante', S: 'Socio', H: 'Honorario' }

const MESES_NOMBRES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

function fechaHoyLocal() {
    const hoy = new Date()
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
}

function estadoVisual(cuota) {
    if (cuota.estado_pago === 'pagado') return { etiqueta: 'Pagada', clase: 'activo' }

    const periodo = Array.isArray(cuota.periodo_lectivo) ? cuota.periodo_lectivo[0] : cuota.periodo_lectivo
    const mes = `${periodo.anio}-${String(periodo.mes).padStart(2, '0')}`
    const hoy = fechaHoyLocal()
    if (hoy.slice(0, 7) < mes) return { etiqueta: 'Próxima', clase: 'proxima' }
    if (periodo.fecha_vencimiento && hoy <= periodo.fecha_vencimiento) {
        return { etiqueta: 'Por pagar', clase: 'por-pagar' }
    }
    return { etiqueta: 'Atrasada', clase: 'atrasada' }
}

function agruparPorPeriodo(cuotas) {
    const periodos = new Map()

    for (const item of cuotas) {
        // Soporta tanto si la relación viene como objeto o como array de 1 elemento
        const p = Array.isArray(item.periodo_lectivo) ? item.periodo_lectivo[0] : item.periodo_lectivo
        if (!p) continue

        const idPeriodo = `${p.anio_inicio}-${p.anio_inicio + 1}`

        if (!periodos.has(idPeriodo)) {
            periodos.set(idPeriodo, {
                id: idPeriodo,
                inicio: p.anio_inicio,
                semestres: { 1: [], 2: [] }
            })
        }

        periodos.get(idPeriodo).semestres[p.semestre].push({ ...item, periodo_info: p })
    }

    return [...periodos.values()]
        .sort((a, b) => b.inicio - a.inicio)
        .map((periodo) => ({
            ...periodo,
            semestres: Object.entries(periodo.semestres)
                .filter(([_, items]) => items.length > 0)
                .map(([numero, items]) => {
                    const numeroSemestre = Number(numero)
                    const pagadas = items.filter((c) => c.estado_pago === 'pagado').length
                    const rango = numeroSemestre === 1
                        ? `julio–diciembre ${periodo.inicio}`
                        : `febrero–junio ${periodo.inicio + 1}`

                    return {
                        numero: numeroSemestre,
                        rango,
                        cuotas: items.sort((a, b) => a.periodo_info.mes - b.periodo_info.mes),
                        pendientes: items.length - pagadas
                    }
                })
        }))
}

export default function MisCuotas({ miembro }) {
    const [cuotasMiembro, setCuotasMiembro] = useState([])
    const [cargando, setCargando] = useState(true)
    const [mensaje, setMensaje] = useState('')

    const cargar = useCallback(async () => {
        if (!miembro?.id_miembro) return

        setCargando(true)
        setMensaje('')

        try {
            const { data, error } = await supabase
                .from('miembro_cuota')
                .select(`
                    id_miembro_cuota,
                    calidad_aplicada,
                    monto_generado,
                    estado_pago,
                    fecha_pago,
                    periodo_lectivo!id_periodo (
                        id_periodo,
                        anio_inicio,
                        semestre,
                        mes,
                        anio,
                        fecha_vencimiento
                    )
                `)
                .eq('id_miembro', miembro.id_miembro)

            if (error) {
                console.error('Error Supabase:', error)
                setMensaje(`Error al cargar las cuotas: ${error.message}`)
                setCuotasMiembro([])
                return
            }

            setCuotasMiembro(data || [])
        } catch (err) {
            console.error('Error inesperado:', err)
            setMensaje(`Error inesperado: ${err.message}`)
        } finally {
            setCargando(false)
        }
    }, [miembro?.id_miembro])

    useEffect(() => {
        cargar()
    }, [cargar])

    if (cargando) return <p>Cargando cuotas...</p>

    const periodos = agruparPorPeriodo(cuotasMiembro)

    return (
        <div>
            {mensaje && <p className="error-mensaje" style={{ color: 'red' }}>{mensaje}</p>}
            
            <p>Las cuotas se agrupan por período rotario. Enero no tiene cuota.</p>

            {periodos.map((periodo) => (
                <section key={periodo.id}>
                    <h3>Período {periodo.inicio}–{periodo.inicio + 1}</h3>
                    {periodo.semestres.map((semestre) => (
                        <details key={semestre.numero} open>
                            <summary>
                                {semestre.numero === 1 ? 'Primer' : 'Segundo'} semestre · Período {periodo.inicio}–{periodo.inicio + 1} ({semestre.rango}) · {semestre.cuotas.length} cuotas · {semestre.pendientes} pendientes
                            </summary>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Mes</th>
                                        <th>Calidad del período</th>
                                        <th>Monto</th>
                                        <th>Estado</th>
                                        <th>Fecha de pago</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {semestre.cuotas.map((c) => {
                                        const p = c.periodo_info
                                        const nombreMes = MESES_NOMBRES[p.mes - 1]
                                        const estado = estadoVisual(c)

                                        return (
                                            <tr key={c.id_miembro_cuota}>
                                                <td>{nombreMes} {p.anio}</td>
                                                <td>{NOMBRE_CALIDAD[c.calidad_aplicada] || '—'}</td>
                                                <td>Gs. {Number(c.monto_generado).toLocaleString('es-PY')}</td>
                                                <td>
                                                    <span className={`rtc-badge rtc-badge--${estado.clase}`}>
                                                        {estado.etiqueta}
                                                    </span>
                                                </td>
                                                <td>
                                                    {c.fecha_pago
                                                        ? new Date(`${c.fecha_pago}T12:00:00`).toLocaleDateString('es-PY')
                                                        : '—'}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </details>
                    ))}
                </section>
            ))}
            
            {!cargando && periodos.length === 0 && (
                <p>No se encontraron cuotas generadas para este socio. Verifique haber ejecutado el script en la base de datos.</p>
            )}
        </div>
    )
}
