import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function fechaLocal() {
    const hoy = new Date()
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
}

function primerDiaMesSiguiente(fecha) {
    const [anio, mes] = fecha.split('-').map(Number)
    return `${mes === 12 ? anio + 1 : anio}-${String(mes === 12 ? 1 : mes + 1).padStart(2, '0')}-01`
}

function estadoCuota(cuota, periodo) {
    if (cuota.estado_pago === 'pagado') return { id: 'pagada', etiqueta: 'Pagada', clase: 'activo' }
    const hoy = fechaLocal()
    const mesCuota = `${periodo.anio}-${String(periodo.mes).padStart(2, '0')}`
    if (hoy.slice(0, 7) < mesCuota) return { id: 'proxima', etiqueta: 'Próxima', clase: 'proxima' }
    if (periodo.fecha_vencimiento && hoy <= periodo.fecha_vencimiento) {
        return { id: 'por-pagar', etiqueta: 'Por pagar', clase: 'por-pagar' }
    }
    return { id: 'atrasada', etiqueta: 'Atrasada', clase: 'atrasada' }
}

function etiquetaPeriodo(periodo) {
    return `${MESES[periodo.mes - 1]} ${periodo.anio} · Período ${periodo.anio_inicio}–${periodo.anio_inicio + 1}`
}

// Compartida entre la generación individual y la masiva: busca, dentro
// del historial de un miembro, qué calidad tenía vigente en un mes dado.
function calidadVigenteEnMes(historial, periodo) {
    const mes = `${periodo.anio}-${String(periodo.mes).padStart(2, '0')}`
    return (historial || [])
        .filter((h) => h.fecha_desde?.slice(0, 7) <= mes && (!h.fecha_hasta || h.fecha_hasta.slice(0, 7) >= mes))
        .sort((a, b) => b.fecha_desde.localeCompare(a.fecha_desde))[0]?.calidad
}

export default function Tesoreria() {
    const [periodos, setPeriodos] = useState([])
    const [idPeriodo, setIdPeriodo] = useState('')
    const [cuotas, setCuotas] = useState([])
    const [miembros, setMiembros] = useState({})
    const [generandoMiembro, setGenerandoMiembro] = useState(null)
    const [busqueda, setBusqueda] = useState('')
    const [filtroEstado, setFiltroEstado] = useState('todos')
    const [cargandoPeriodos, setCargandoPeriodos] = useState(true)
    const [cargandoCuotas, setCargandoCuotas] = useState(false)
    const [mensaje, setMensaje] = useState('')
    const [cuotaSeleccionada, setCuotaSeleccionada] = useState(null)
    const [fechaPago, setFechaPago] = useState(fechaLocal)
    const [guardandoPago, setGuardandoPago] = useState(false)
    const [miembroSinHistorial, setMiembroSinHistorial] = useState(null)
    const [calidadInicial, setCalidadInicial] = useState('A')
    const [fechaInicioCalidad, setFechaInicioCalidad] = useState('')
    const [fechaCambioCalidad, setFechaCambioCalidad] = useState('')
    const [guardandoHistorial, setGuardandoHistorial] = useState(false)
    const [generandoTodas, setGenerandoTodas] = useState(false)

    useEffect(() => {
        cargarPeriodos()
    }, [])

    useEffect(() => {
        if (idPeriodo) cargarCuotas()
    }, [idPeriodo])

    async function cargarPeriodos() {
        setCargandoPeriodos(true)
        const { data, error } = await supabase
            .from('periodo_lectivo')
            .select('id_periodo, anio_inicio, semestre, mes, anio, fecha_vencimiento')
            .order('anio', { ascending: false })
            .order('mes', { ascending: false })

        if (error) {
            setMensaje('No se pudieron cargar los períodos: ' + error.message)
            setCargandoPeriodos(false)
            return
        }

        const lista = data || []
        setPeriodos(lista)
        const hoy = fechaLocal()
        const periodoActual = lista.find((p) => `${p.anio}-${String(p.mes).padStart(2, '0')}` === hoy.slice(0, 7))
        if (periodoActual) setIdPeriodo(String(periodoActual.id_periodo))
        else if (lista[0]) setIdPeriodo(String(lista[0].id_periodo))
        setCargandoPeriodos(false)
    }

    async function cargarCuotas() {
        setCargandoCuotas(true)
        setMensaje('')
        const { data, error } = await supabase
            .from('miembro_cuota')
            .select('id_miembro_cuota, id_miembro, calidad_aplicada, monto_generado, estado_pago, fecha_pago')
            .eq('id_periodo', Number(idPeriodo))
            .order('id_miembro')

        if (error) {
            setMensaje('No se pudieron cargar las cuotas del período: ' + error.message)
            setCuotas([])
            setMiembros({})
            setCargandoCuotas(false)
            return
        }

        const miembrosResp = await supabase
            .from('miembro')
            .select('id_miembro, nombre_miembro, calidad, estado_miembro, fecha_ingreso, creado_en')
            .order('nombre_miembro')
        if (miembrosResp.error) {
            setMensaje('No se pudieron cargar los miembros: ' + miembrosResp.error.message)
            setCuotas([])
            setMiembros({})
            setCargandoCuotas(false)
            return
        }
        const miembrosData = miembrosResp.data || []
        setMiembros(Object.fromEntries(miembrosData.map((m) => [m.id_miembro, m])))
        setCuotas(data || [])
        setCargandoCuotas(false)
    }

    const periodoSeleccionado = periodos.find((p) => String(p.id_periodo) === idPeriodo)
    const filas = useMemo(() => {
        const existentes = cuotas.map((cuota) => ({
            cuota,
            miembro: miembros[cuota.id_miembro],
            estado: periodoSeleccionado ? estadoCuota(cuota, periodoSeleccionado) : null,
        }))
        const idsConCuota = new Set(cuotas.map((cuota) => cuota.id_miembro))
        const mesSeleccionado = periodoSeleccionado
            ? `${periodoSeleccionado.anio}-${String(periodoSeleccionado.mes).padStart(2, '0')}`
            : ''
        const faltantes = Object.values(miembros)
            .filter((persona) => {
                const ingreso = persona.fecha_ingreso || persona.creado_en?.slice(0, 10)
                const mesIngreso = ingreso?.slice(0, 7)
                return persona.estado_miembro === 'A'
                    && ['A', 'S'].includes(persona.calidad)
                    && !idsConCuota.has(persona.id_miembro)
                    && (!mesIngreso || mesIngreso <= mesSeleccionado)
            })
            .map((persona) => ({
                cuota: null,
                miembro: persona,
                estado: { id: 'sin-generar', etiqueta: 'Cuota no generada', clase: 'inactivo' },
            }))
        return [...existentes, ...faltantes].sort((a, b) => a.miembro?.nombre_miembro?.localeCompare(b.miembro?.nombre_miembro || '') || 0)
    }, [cuotas, miembros, periodoSeleccionado])

    const resumen = useMemo(() => filas.reduce((totales, fila) => {
        if (!fila.estado) return totales
        if (!fila.cuota) {
            if (fila.estado.id === 'sin-generar') totales.sinGenerar += 1
            return totales
        }
        if (fila.estado.id === 'pagada') {
            totales.pagadas += 1
            totales.recaudado += Number(fila.cuota.monto_generado) || 0
        } else if (fila.estado.id === 'por-pagar') totales.porPagar += 1
        else if (fila.estado.id === 'atrasada') totales.atrasadas += 1
        else if (fila.estado.id === 'proxima') totales.proximas += 1
        return totales
    }, { recaudado: 0, pagadas: 0, porPagar: 0, atrasadas: 0, proximas: 0, sinGenerar: 0 }), [filas])

    const filasVisibles = filas.filter(({ miembro, estado }) => {
        const coincideNombre = !busqueda || miembro?.nombre_miembro?.toLowerCase().includes(busqueda.toLowerCase())
        const coincideEstado = filtroEstado === 'todos' || estado?.id === filtroEstado
        return coincideNombre && coincideEstado
    })

    function abrirRegistro(cuota) {
        setCuotaSeleccionada(cuota)
        setFechaPago(fechaLocal())
    }

    async function generarCuotasFaltantes(persona) {
        if (!periodoSeleccionado) return
        setGenerandoMiembro(persona.id_miembro)
        setMensaje('')
        const { data: historial, error: historialError } = await supabase
            .from('miembro_calidad_historial')
            .select('calidad, fecha_desde, fecha_hasta')
            .eq('id_miembro', persona.id_miembro)
        if (historialError) {
            setMensaje('No se pudo comprobar el historial de calidad: ' + historialError.message)
            setGenerandoMiembro(null)
            return
        }

        if (!historial?.length) {
            setMiembroSinHistorial(persona)
            setCalidadInicial(persona.calidad)
            setFechaInicioCalidad(persona.fecha_ingreso || '')
            setFechaCambioCalidad('')
            setGenerandoMiembro(null)
            return
        }

        const calidad = calidadVigenteEnMes(historial, periodoSeleccionado)
        if (!['A', 'S'].includes(calidad)) {
            setMensaje(`No se generaron cuotas para ${persona.nombre_miembro}: falta un historial A o S válido para ${MESES[periodoSeleccionado.mes - 1]} ${periodoSeleccionado.anio}.`)
            setGenerandoMiembro(null)
            return
        }

        const { error } = await supabase.rpc('generar_cuotas_miembro', { p_id_miembro: persona.id_miembro })
        setGenerandoMiembro(null)
        if (error) {
            setMensaje('No se pudieron generar las cuotas: ' + error.message)
            return
        }
        await cargarCuotas()
        setMensaje(`Se generaron las cuotas faltantes de ${persona.nombre_miembro}.`)
    }

    async function crearHistorialYGenerar(e) {
        e.preventDefault()
        if (!miembroSinHistorial || !fechaInicioCalidad || !['A', 'S'].includes(calidadInicial)) return
        const cambiosCalidad = calidadInicial !== miembroSinHistorial.calidad
        const fechaEfectiva = cambiosCalidad && fechaCambioCalidad
            ? primerDiaMesSiguiente(fechaCambioCalidad)
            : null
        if (cambiosCalidad && !fechaCambioCalidad) {
            setMensaje('Indicá en qué mes cambió a su calidad actual.')
            return
        }
        if (fechaEfectiva && fechaEfectiva <= fechaInicioCalidad.slice(0, 7) + '-01') {
            setMensaje('El cambio debe ocurrir después de la fecha de inicio de la calidad anterior.')
            return
        }
        setGuardandoHistorial(true)
        let fechaHastaInicial = null
        if (fechaEfectiva) {
            const diaAnterior = new Date(`${fechaEfectiva}T12:00:00`)
            diaAnterior.setDate(diaAnterior.getDate() - 1)
            fechaHastaInicial = diaAnterior.toISOString().slice(0, 10)
        }
        const historialNuevo = [{
            id_miembro: miembroSinHistorial.id_miembro,
            calidad: calidadInicial,
            fecha_desde: fechaInicioCalidad,
            fecha_hasta: fechaHastaInicial,
        }]
        if (fechaEfectiva) {
            historialNuevo.push({
                id_miembro: miembroSinHistorial.id_miembro,
                calidad: miembroSinHistorial.calidad,
                fecha_desde: fechaEfectiva,
                fecha_hasta: null,
            })
        }
        const { error: historialError } = await supabase.from('miembro_calidad_historial').insert(historialNuevo)
        if (historialError) {
            setMensaje('No se pudo guardar el historial de calidad: ' + historialError.message)
            setGuardandoHistorial(false)
            return
        }

        const { error: cuotasError } = await supabase.rpc('generar_cuotas_miembro', {
            p_id_miembro: miembroSinHistorial.id_miembro,
        })
        setGuardandoHistorial(false)
        setMiembroSinHistorial(null)
        if (cuotasError) {
            setMensaje('Se guardó el historial, pero no se pudieron generar las cuotas: ' + cuotasError.message)
            return
        }
        await cargarCuotas()
        setMensaje(`Se inició el historial y se generaron las cuotas de ${miembroSinHistorial.nombre_miembro}.`)
    }

    async function confirmarPago(e) {
        e.preventDefault()
        if (!cuotaSeleccionada || !fechaPago) return
        setGuardandoPago(true)
        const { error } = await supabase
            .from('miembro_cuota')
            .update({ estado_pago: 'pagado', fecha_pago: fechaPago })
            .eq('id_miembro_cuota', cuotaSeleccionada.id_miembro_cuota)
        setGuardandoPago(false)
        if (error) {
            setMensaje('No se pudo registrar el pago: ' + error.message)
            return
        }
        setCuotaSeleccionada(null)
        cargarCuotas()
    }

    if (cargandoPeriodos) return <p>Cargando períodos...</p>

    return (
        <div className="rtc-tesoreria">
            <div className="rtc-tesoreria-header">
                <div>
                    <h2>Tesorería</h2>
                    <p>Control de cuotas y registro de pagos por período.</p>
                </div>
                <label>
                    Período mensual
                    <select value={idPeriodo} onChange={(e) => setIdPeriodo(e.target.value)}>
                        {periodos.map((p) => <option key={p.id_periodo} value={p.id_periodo}>{etiquetaPeriodo(p)}</option>)}
                    </select>
                </label>
            </div>

            {mensaje && <p className="rtc-tesoreria-mensaje" role="alert">{mensaje}</p>}
            {!periodos.length && <p>No hay períodos lectivos cargados.</p>}

            {periodoSeleccionado && <>
                <h3 className="rtc-tesoreria-periodo">{etiquetaPeriodo(periodoSeleccionado)}</h3>
                <div className="rtc-tesoreria-resumen">
                    <article><span>Miembros sujetos a cuota</span><strong>{filas.length}</strong></article>
                    <article><span>Pagaron</span><strong>{resumen.pagadas}</strong></article>
                    <article><span>Por pagar</span><strong>{resumen.porPagar}</strong></article>
                    <article><span>Atrasadas</span><strong>{resumen.atrasadas}</strong></article>
                    <article><span>Sin generar</span><strong>{resumen.sinGenerar}</strong></article>
                    <article><span>Recaudado</span><strong>Gs. {resumen.recaudado.toLocaleString('es-PY')}</strong></article>
                </div>

                <div className="rtc-tesoreria-filtros">
                    <input aria-label="Buscar miembro" placeholder="Buscar miembro..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                    <select aria-label="Filtrar por estado" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                        <option value="todos">Todos los estados</option>
                        <option value="pagada">Pagadas</option>
                        <option value="por-pagar">Por pagar</option>
                        <option value="atrasada">Atrasadas</option>
                        <option value="proxima">Próximas</option>
                        <option value="sin-generar">Cuota no generada</option>
                    </select>
                </div>

                {cargandoCuotas ? <p>Cargando cuotas...</p> : (
                    <div className="rtc-tabla-scroll">
                        <table className="rtc-tabla-tesoreria">
                            <thead><tr><th>Miembro</th><th>Calidad aplicada</th><th>Monto</th><th>Estado</th><th>Fecha de pago</th><th>Acción</th></tr></thead>
                            <tbody>
                                {filasVisibles.map(({ cuota, miembro: persona, estado }) => (
                                    <tr key={cuota?.id_miembro_cuota || `miembro-${persona.id_miembro}`}>
                                        <td>{persona?.nombre_miembro || `Miembro ${persona?.id_miembro || cuota?.id_miembro}`}</td>
                                        <td>{(cuota?.calidad_aplicada || persona?.calidad) === 'A' ? 'Aspirante' : 'Socio'}</td>
                                        <td>{cuota ? `Gs. ${Number(cuota.monto_generado).toLocaleString('es-PY')}` : '—'}</td>
                                        <td><span className={`rtc-badge rtc-badge--${estado.clase}`}>{estado.etiqueta}</span></td>
                                        <td>{cuota?.fecha_pago ? new Date(`${cuota.fecha_pago}T12:00:00`).toLocaleDateString('es-PY') : '—'}</td>
                                        <td>{!cuota
                                            ? <button disabled={generandoMiembro === persona?.id_miembro} onClick={() => generarCuotasFaltantes(persona)}>{generandoMiembro === persona?.id_miembro ? 'Generando...' : 'Generar cuotas'}</button>
                                            : estado.id === 'pagada'
                                            ? <span>Registrado</span>
                                            : <button onClick={() => abrirRegistro(cuota)}>Registrar pago</button>}
                                        </td>
                                    </tr>
                                ))}
                                {!filasVisibles.length && <tr><td colSpan={6}>No hay miembros para mostrar con esos filtros.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                )}
            </>}

            {cuotaSeleccionada && (
                <div className="rtc-modal-fondo" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setCuotaSeleccionada(null) }}>
                    <form className="rtc-modal-tesoreria" onSubmit={confirmarPago}>
                        <h3>Registrar pago</h3>
                        <p><strong>Miembro:</strong> {miembros[cuotaSeleccionada.id_miembro]?.nombre_miembro}</p>
                        <p><strong>Cuota:</strong> {periodoSeleccionado && etiquetaPeriodo(periodoSeleccionado)}</p>
                        <p><strong>Monto:</strong> Gs. {Number(cuotaSeleccionada.monto_generado).toLocaleString('es-PY')}</p>
                        <label>Fecha de pago<input type="date" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} required /></label>
                        <div className="rtc-modal-acciones">
                            <button type="button" className="rtc-btn-secundario" onClick={() => setCuotaSeleccionada(null)}>Cancelar</button>
                            <button type="submit" disabled={guardandoPago}>{guardandoPago ? 'Guardando...' : 'Confirmar pago'}</button>
                        </div>
                    </form>
                </div>
            )}

            {miembroSinHistorial && (
                <div className="rtc-modal-fondo" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget && !guardandoHistorial) setMiembroSinHistorial(null) }}>
                    <form className="rtc-modal-tesoreria" onSubmit={crearHistorialYGenerar}>
                        <h3>Iniciar historial de calidad</h3>
                        <p>Este miembro todavía no tiene historial. Indicá sus fechas reales; se usarán para calcular cuotas pasadas y futuras.</p>
                        <p><strong>Miembro:</strong> {miembroSinHistorial.nombre_miembro}</p>
                        <label>Calidad inicial
                            <select value={calidadInicial} onChange={(e) => setCalidadInicial(e.target.value)}>
                                <option value="A">Aspirante</option>
                                <option value="S">Socio</option>
                            </select>
                        </label>
                        <label>Desde qué fecha<input type="date" value={fechaInicioCalidad} onChange={(e) => setFechaInicioCalidad(e.target.value)} required /></label>
                        {calidadInicial !== miembroSinHistorial.calidad && <label>Fecha del cambio a {miembroSinHistorial.calidad === 'A' ? 'Aspirante' : 'Socio'}<input type="date" value={fechaCambioCalidad} onChange={(e) => setFechaCambioCalidad(e.target.value)} required /><small>La nueva calidad comienza el mes siguiente.</small></label>}
                        <small>El formulario registra la calidad inicial y, si corresponde, un cambio posterior a la calidad actual. Si hubo más cambios, primero hay que completar el historial entero.</small>
                        <div className="rtc-modal-acciones">
                            <button type="button" className="rtc-btn-secundario" disabled={guardandoHistorial} onClick={() => setMiembroSinHistorial(null)}>Cancelar</button>
                            <button type="submit" disabled={guardandoHistorial}>{guardandoHistorial ? 'Guardando...' : 'Guardar y generar cuotas'}</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    )
}