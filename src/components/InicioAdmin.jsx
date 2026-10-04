import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

// Qué estados de préstamo cuentan como "sin saldar". Ajustalo si tu criterio es otro.
const ESTADOS_PRESTAMO_SIN_SALDAR = ['pendiente', 'aprobado']

function fechaLocal() {
    const hoy = new Date()
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
}

function pluralizar(n, singular, plural) {
    return `${n} ${n === 1 ? singular : plural}`
}

function mayuscula(texto) {
    return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : ''
}

function Icono({ children }) {
    return (
        <svg
            className="rtc-accion-icono"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            {children}
        </svg>
    )
}

const ACCIONES = [
    {
        destino: 'alta',
        titulo: 'Cargar miembro',
        texto: 'Crear la cuenta y el registro de un nuevo miembro.',
        icono: (
            <>
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" />
                <line x1="23" y1="11" x2="17" y2="11" />
            </>
        ),
    },
    {
        destino: 'asistencia',
        titulo: 'Registrar asistencia',
        texto: 'Marcar quién vino a un evento.',
        icono: (
            <>
                <polyline points="9 11 12 14 22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </>
        ),
    },
    {
        destino: 'tesoreria',
        titulo: 'Registrar un pago',
        texto: 'Anotar el pago de una cuota en Tesorería.',
        icono: (
            <>
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
            </>
        ),
    },
]

function Tarjeta({ titulo, valor, detalle, estado, enlace, onIrA }) {
    return (
        <div className={'rtc-kpi' + (estado ? ` rtc-kpi--${estado}` : '')}>
            <span className="rtc-kpi-titulo">{titulo}</span>
            <strong className="rtc-kpi-valor">{valor}</strong>
            {detalle && <span className="rtc-kpi-detalle">{detalle}</span>}
            {enlace && (
                <div className="rtc-kpi-pie">
                    <button type="button" className="rtc-enlace" onClick={() => onIrA(enlace.destino)}>
                        {enlace.texto}
                    </button>
                </div>
            )}
        </div>
    )
}

export default function InicioAdmin({ onIrA }) {
    const [resumen, setResumen] = useState(null)
    const [eventos, setEventos] = useState([])
    const [fallos, setFallos] = useState([])
    const [cargando, setCargando] = useState(true)

    useEffect(() => {
        cargar()
    }, [])

    async function cargar() {
        setCargando(true)
        const ahora = new Date()
        const limite = new Date()
        limite.setDate(limite.getDate() + 30)
        const hoy = fechaLocal()
        const problemas = []

        const [miembrosR, periodosR, cuotasR, prestamosR, eventos30R, proximosR] = await Promise.all([
            supabase.from('miembro').select('calidad, estado_miembro'),
            supabase.from('periodo_lectivo').select('id_periodo, mes, anio, fecha_vencimiento'),
            supabase
                .from('miembro_cuota')
                .select('id_periodo, monto_generado, estado_pago')
                .or('estado_pago.is.null,estado_pago.neq.pagado'),
            supabase
                .from('prestamos')
                .select('id_prestamo', { count: 'exact', head: true })
                .in('estado_prestamo', ESTADOS_PRESTAMO_SIN_SALDAR),
            supabase
                .from('eventos')
                .select('id_evento', { count: 'exact', head: true })
                .gte('fecha_evento', ahora.toISOString())
                .lte('fecha_evento', limite.toISOString()),
            supabase
                .from('eventos')
                .select('*')
                .gte('fecha_evento', ahora.toISOString())
                .order('fecha_evento', { ascending: true })
                .limit(5),
        ])

        // Miembros activos, con desglose por calidad
        let activos = null
        let porCalidad = null
        if (miembrosR.error) {
            problemas.push('Miembros: ' + miembrosR.error.message)
        } else {
            const lista = (miembrosR.data || []).filter((m) => m.estado_miembro === 'A')
            activos = lista.length
            porCalidad = {
                A: lista.filter((m) => m.calidad === 'A').length,
                S: lista.filter((m) => m.calidad === 'S').length,
                H: lista.filter((m) => m.calidad === 'H').length,
            }
        }

        // Cuotas atrasadas: misma regla que estadoCuota() en Tesoreria.jsx
        let atrasadas = null
        let montoAtrasado = null
        if (periodosR.error || cuotasR.error) {
            problemas.push('Cuotas: ' + (periodosR.error || cuotasR.error).message)
        } else {
            const periodos = Object.fromEntries((periodosR.data || []).map((p) => [p.id_periodo, p]))
            const mesHoy = hoy.slice(0, 7)
            atrasadas = 0
            montoAtrasado = 0
            for (const c of cuotasR.data || []) {
                const p = periodos[c.id_periodo]
                if (!p) continue
                const mesCuota = `${p.anio}-${String(p.mes).padStart(2, '0')}`
                if (mesHoy < mesCuota) continue // cuota futura
                if (p.fecha_vencimiento && hoy <= p.fecha_vencimiento) continue // todavía no venció
                atrasadas += 1
                montoAtrasado += Number(c.monto_generado) || 0
            }
        }

        if (prestamosR.error) problemas.push('Préstamos: ' + prestamosR.error.message)
        if (eventos30R.error) problemas.push('Eventos: ' + eventos30R.error.message)
        if (proximosR.error) problemas.push('Próximos eventos: ' + proximosR.error.message)

        setResumen({
            activos,
            porCalidad,
            atrasadas,
            montoAtrasado,
            prestamos: prestamosR.error ? null : prestamosR.count ?? 0,
            eventos30: eventos30R.error ? null : eventos30R.count ?? 0,
        })
        setEventos(proximosR.data || [])
        setFallos(problemas)
        setCargando(false)
    }

    if (cargando) return <p>Cargando...</p>

    const proximo = eventos[0]
    const detalleMiembros = resumen.porCalidad
        ? `${pluralizar(resumen.porCalidad.A, 'aspirante', 'aspirantes')}, ${pluralizar(resumen.porCalidad.S, 'socio', 'socios')} y ${pluralizar(resumen.porCalidad.H, 'honorario', 'honorarios')}`
        : null

    let estadoCuotas
    let detalleCuotas = null
    if (resumen.atrasadas === 0) {
        estadoCuotas = 'ok'
        detalleCuotas = 'Todo al día'
    } else if (resumen.atrasadas > 0) {
        estadoCuotas = 'alerta'
        detalleCuotas = `Gs. ${resumen.montoAtrasado.toLocaleString('es-PY')} por cobrar`
    }

    return (
        <div className="rtc-inicio-admin">
            <section>
                <h4>Resumen del club</h4>
                <div className="rtc-kpis">
                    <Tarjeta
                        titulo="Miembros activos"
                        valor={resumen.activos ?? '—'}
                        detalle={detalleMiembros}
                        enlace={{ texto: 'Ver miembros', destino: 'miembros' }}
                        onIrA={onIrA}
                    />
                    <Tarjeta
                        titulo="Cuotas atrasadas"
                        valor={resumen.atrasadas ?? '—'}
                        detalle={detalleCuotas}
                        estado={estadoCuotas}
                        enlace={{ texto: 'Ver cuotas', destino: 'tesoreria' }}
                        onIrA={onIrA}
                    />
                    <Tarjeta
                        titulo="Préstamos sin saldar"
                        valor={resumen.prestamos ?? '—'}
                        detalle={resumen.prestamos === 0 ? 'Ninguno pendiente' : resumen.prestamos > 0 ? 'Pendientes o aprobados' : null}
                    />
                    <Tarjeta
                        titulo="Eventos en 30 días"
                        valor={resumen.eventos30 ?? '—'}
                        detalle={
                            proximo
                                ? `Próximo: ${proximo.nombre_evento}, ${new Date(proximo.fecha_evento).toLocaleDateString('es-PY', { day: 'numeric', month: 'short' })}`
                                : 'Ninguno programado'
                        }
                        enlace={{ texto: 'Ver eventos', destino: 'asistencia' }}
                        onIrA={onIrA}
                    />
                </div>
                {fallos.length > 0 && (
                    <p role="alert">No se pudieron cargar algunos datos. {fallos.join(' ')}</p>
                )}
            </section>

            <section>
                <h4>Acciones frecuentes</h4>
                <div className="rtc-acciones">
                    {ACCIONES.map((a) => (
                        <button key={a.destino} type="button" className="rtc-accion" onClick={() => onIrA(a.destino)}>
                            <span className="rtc-accion-icono-caja">
                                <Icono>{a.icono}</Icono>
                            </span>
                            <span>
                                <span className="rtc-accion-titulo">{a.titulo}</span>
                                <span className="rtc-accion-texto">{a.texto}</span>
                            </span>
                        </button>
                    ))}
                </div>
            </section>

            <section className="rtc-card rtc-eventos-card">
                <div className="rtc-eventos-cab">
                    <h4>Próximos eventos</h4>
                    {eventos.length > 0 && (
                        <button type="button" className="rtc-btn-secundario" onClick={() => onIrA('asistencia')}>
                            Crear evento
                        </button>
                    )}
                </div>

                {eventos.length === 0 ? (
                    <div className="rtc-vacio">
                        <p>Todavía no hay eventos programados.</p>
                        <button type="button" onClick={() => onIrA('asistencia')}>Crear el primer evento</button>
                    </div>
                ) : (
                    <ul className="rtc-eventos">
                        {eventos.map((e) => {
                            const fecha = new Date(e.fecha_evento)
                            const dia = fecha.toLocaleDateString('es-PY', { weekday: 'long' })
                            const hora = fecha.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit', hour12: false })
                            return (
                                <li key={e.id_evento} className="rtc-evento">
                                    <div className="rtc-evento-fecha" aria-hidden="true">
                                        <span className="rtc-evento-dia">{fecha.getDate()}</span>
                                        <span className="rtc-evento-mes">{fecha.toLocaleDateString('es-PY', { month: 'short' })}</span>
                                    </div>
                                    <div className="rtc-evento-info">
                                        <span className="rtc-evento-nombre">{e.nombre_evento}</span>
                                        <span className="rtc-evento-detalle">
                                            {mayuscula(dia)} a las {hora}{e.lugar_evento ? ` en ${e.lugar_evento}` : ''}
                                        </span>
                                    </div>
                                    {e.tipo_evento && <span className="rtc-evento-tipo">{e.tipo_evento}</span>}
                                </li>
                            )
                        })}
                    </ul>
                )}
            </section>
        </div>
    )
}