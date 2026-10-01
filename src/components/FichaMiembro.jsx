import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const PESTAÑAS = [
    { id: 'personales', label: 'Datos personales' },
    { id: 'club', label: 'Datos del club' },
    { id: 'cargos', label: 'Cargos y comités' },
    { id: 'asistencias', label: 'Asistencias' },
    { id: 'cuotas', label: 'Cuotas' },
    { id: 'prestamos', label: 'Préstamos' },
]

function fechaHoyLocal() {
    const fecha = new Date()
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`
}

function primerDiaDelMesSiguiente(fecha) {
    const [anio, mes] = fecha.split('-').map(Number)
    return `${mes === 12 ? anio + 1 : anio}-${String(mes === 12 ? 1 : mes + 1).padStart(2, '0')}-01`
}

function calidadEnMes(historial, mesYYYYMM) {
    const mesInicio = mesYYYYMM + '-01'
    return [...historial]
        .filter((h) => {
            const desde = h.fecha_desde?.slice(0, 7) + '-01'
            const hasta = h.fecha_hasta ? (h.fecha_hasta.slice(0, 7) + '-01') : '9999-12-31'
            return mesInicio >= desde && mesInicio <= hasta
        })
        .sort((a, b) => b.fecha_desde.localeCompare(a.fecha_desde))[0]?.calidad
}

export default function FichaMiembro({ miembro, onCerrar, onActualizado }) {
    const [pestaña, setPestaña] = useState('personales')

    return (
        <div className="rtc-ficha">
            <div className="rtc-ficha-header">
                <h3>{miembro.nombre_miembro}</h3>
                <button className="rtc-btn-secundario" onClick={onCerrar}>Volver a la lista</button>
            </div>

            <div className="rtc-tabs">
                {PESTAÑAS.map((p) => (
                    <button
                        key={p.id}
                        className={'rtc-tab-btn' + (pestaña === p.id ? ' activo' : '')}
                        onClick={() => setPestaña(p.id)}
                    >
                        {p.label}
                    </button>
                ))}
            </div>

            {pestaña === 'personales' && <DatosPersonales miembro={miembro} onActualizado={onActualizado} />}
            {pestaña === 'club' && <DatosClub miembro={miembro} onActualizado={onActualizado} />}
            {pestaña === 'cargos' && <CargosYComites miembro={miembro} />}
            {pestaña === 'asistencias' && <AsistenciasMiembro miembro={miembro} />}
            {pestaña === 'cuotas' && <CuotasMiembro miembro={miembro} />}
            {pestaña === 'prestamos' && <PrestamosMiembro miembro={miembro} />}
        </div>
    )
}

function DatosPersonales({ miembro, onActualizado }) {
    const [nombre, setNombre] = useState(miembro.nombre_miembro)
    const [correo, setCorreo] = useState(miembro.correo_miembro)
    const [fechaNacimiento, setFechaNacimiento] = useState(miembro.fecha_nacimiento)
    const [telefono, setTelefono] = useState(miembro.telefono_miembro || '')
    const [mensaje, setMensaje] = useState(null)
    const [cargando, setCargando] = useState(false)

    async function guardar(e) {
        e.preventDefault()
        setCargando(true)
        setMensaje(null)

        const { error } = await supabase
            .from('miembro')
            .update({
                nombre_miembro: nombre,
                correo_miembro: correo,
                fecha_nacimiento: fechaNacimiento,
                telefono_miembro: telefono,
            })
            .eq('id_miembro', miembro.id_miembro)

        if (error) setMensaje('Error al guardar: ' + error.message)
        else {
            setMensaje('Datos actualizados.')
            onActualizado()
        }
        setCargando(false)
    }

    return (
        <form onSubmit={guardar}>
            <label>
                Nombre completo
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
            </label>
            <label>
                Correo
                <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required />
            </label>
            <label>
                Fecha de nacimiento
                <input type="date" value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)} required />
            </label>
            <label>
                Teléfono
                <input value={telefono} onChange={(e) => setTelefono(e.target.value)} />
            </label>
            <button type="submit" disabled={cargando}>{cargando ? 'Guardando...' : 'Guardar cambios'}</button>
            {mensaje && <p>{mensaje}</p>}
        </form>
    )
}

function DatosClub({ miembro, onActualizado }) {
    const [calidad, setCalidad] = useState(miembro.calidad)
    const [fechaCambioCalidad, setFechaCambioCalidad] = useState(fechaHoyLocal)
    const [estado, setEstado] = useState(miembro.estado_miembro)
    const [mensaje, setMensaje] = useState(null)
    const [cargando, setCargando] = useState(false)

    async function guardar(e) {
        e.preventDefault()
        setCargando(true)
        setMensaje(null)

        if (calidad !== miembro.calidad) {
            if (!fechaCambioCalidad) {
                setMensaje('Indicá desde qué fecha se aplica la nueva calidad.')
                setCargando(false)
                return
            }

            const fechaEfectiva = primerDiaDelMesSiguiente(fechaCambioCalidad)
            const { data: historial, error: historialError } = await supabase
                .from('miembro_calidad_historial')
                .select('*')
                .eq('id_miembro', miembro.id_miembro)
                .is('fecha_hasta', null)
                .order('fecha_desde', { ascending: false })
                .limit(1)

            if (historialError) {
                setMensaje('No se pudo leer el historial: ' + historialError.message)
                setCargando(false)
                return
            }

            let periodoActual = historial?.[0]
            if (!periodoActual) {
                const fechaInicio = miembro.fecha_ingreso || miembro.creado_en?.slice(0, 10)
                if (fechaInicio) {
                    const { data: inicial, error: inicialError } = await supabase.from('miembro_calidad_historial').insert({
                        id_miembro: miembro.id_miembro,
                        calidad: miembro.calidad,
                        fecha_desde: fechaInicio,
                    }).select().single()

                    if (inicialError) {
                        setMensaje('No se pudo iniciar el historial: ' + inicialError.message)
                        setCargando(false)
                        return
                    }
                    periodoActual = inicial
                }
            }

            const mesEfectivo = fechaEfectiva.slice(0, 7)
            const mesVigente = periodoActual?.fecha_desde ? periodoActual.fecha_desde.slice(0, 7) : null

            if (mesVigente && mesEfectivo < mesVigente) {
                setMensaje('El mes del ascenso no puede ser anterior al inicio de la calidad vigente.')
                setCargando(false)
                return
            }

            if (periodoActual) {
                const diaAnterior = new Date(`${fechaEfectiva}T12:00:00`)
                diaAnterior.setDate(diaAnterior.getDate() - 1)
                const { error: cerrarError } = await supabase
                    .from('miembro_calidad_historial')
                    .update({ fecha_hasta: diaAnterior.toISOString().slice(0, 10) })
                    .eq('id_historial', periodoActual.id_historial)

                if (cerrarError) {
                    setMensaje('No se pudo cerrar el período anterior: ' + cerrarError.message)
                    setCargando(false)
                    return
                }
            }

            const { error: insertarError } = await supabase.from('miembro_calidad_historial').insert({
                id_miembro: miembro.id_miembro,
                calidad,
                fecha_desde: fechaEfectiva,
            })

            if (insertarError) {
                setMensaje('No se pudo guardar el nuevo período de calidad: ' + insertarError.message)
                setCargando(false)
                return
            }

            const { error: cuotasError } = await supabase.rpc('generar_cuotas_miembro', {
                p_id_miembro: miembro.id_miembro,
            })
            if (cuotasError) {
                setMensaje('Se guardó el historial, pero no se pudieron generar las cuotas faltantes: ' + cuotasError.message)
                setCargando(false)
                return
            }
        }

        const { error } = await supabase
            .from('miembro')
            .update({ calidad, estado_miembro: estado })
            .eq('id_miembro', miembro.id_miembro)

        if (error) setMensaje('Error al guardar: ' + error.message)
        else {
            setMensaje('Datos actualizados.')
            onActualizado()
        }
        setCargando(false)
    }

    return (
        <form onSubmit={guardar}>
            <label>
                Calidad
                <select value={calidad} onChange={(e) => setCalidad(e.target.value)}>
                    <option value="A">Aspirante</option>
                    <option value="S">Socio</option>
                    <option value="H">Honorario</option>
                </select>
            </label>
            {calidad !== miembro.calidad && (
                <label>
                    Fecha del cambio de calidad
                    <input type="date" value={fechaCambioCalidad} onChange={(e) => setFechaCambioCalidad(e.target.value)} required />
                    <small>El mes del cambio conserva la calidad anterior. La nueva calidad se aplica desde el mes siguiente.</small>
                </label>
            )}
            <label>
                Estado
                <select value={estado} onChange={(e) => setEstado(e.target.value)}>
                    <option value="A">Activo</option>
                    <option value="I">Inactivo</option>
                </select>
            </label>
            <button type="submit" disabled={cargando}>{cargando ? 'Guardando...' : 'Guardar cambios'}</button>
            {mensaje && <p>{mensaje}</p>}
        </form>
    )
}

function CargosYComites({ miembro }) {
    const [cargos, setCargos] = useState([])
    const [comites, setComites] = useState([])
    const [miCargos, setMiCargos] = useState([])
    const [miComites, setMiComites] = useState([])
    const [idCargo, setIdCargo] = useState('')
    const [periodo, setPeriodo] = useState('')
    const [idComite, setIdComite] = useState('')
    const [rolComite, setRolComite] = useState('miembro')
    const [mensaje, setMensaje] = useState(null)

    useEffect(() => { cargarTodo() }, [])

    async function cargarTodo() {
        const { data: c } = await supabase.from('cargos').select('*').order('nombre_cargo')
        setCargos(c || [])
        const { data: co } = await supabase.from('comites').select('*').order('nombre_comite')
        setComites(co || [])
        const { data: mc } = await supabase
            .from('miembro_cargos')
            .select('*, cargos(nombre_cargo)')
            .eq('id_miembro', miembro.id_miembro)
            .order('periodo', { ascending: false })
        setMiCargos(mc || [])
        const { data: mco } = await supabase
            .from('miembro_comites')
            .select('*, comites(nombre_comite)')
            .eq('id_miembro', miembro.id_miembro)
        setMiComites(mco || [])
    }

    function normalizar(texto) {
        return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
    }

    async function asignarCargo(e) {
        e.preventDefault()
        if (!idCargo || !periodo) return

        const { error } = await supabase.from('miembro_cargos').insert({
            id_miembro: miembro.id_miembro,
            id_cargo: idCargo,
            periodo: periodo,
        })
        if (error) { setMensaje('Error: ' + error.message); return }

        const cargoElegido = cargos.find((c) => String(c.id_cargo) === String(idCargo))
        const nombreCargo = cargoElegido?.nombre_cargo || ''
        if (normalizar(nombreCargo).startsWith('director de ')) {
            const nombreComiteBuscado = nombreCargo.replace(/^director de /i, '')
            const comiteRelacionado = comites.find((c) => normalizar(c.nombre_comite) === normalizar(nombreComiteBuscado))
            const yaAsignado = miComites.some((mc) => mc.id_comite === comiteRelacionado?.id_comite)

            if (comiteRelacionado && !yaAsignado) {
                await supabase.from('miembro_comites').insert({
                    id_miembro: miembro.id_miembro,
                    id_comite: comiteRelacionado.id_comite,
                    rol_comite: 'coordinador',
                })
                setMensaje(`Se asignó también como coordinador de "${comiteRelacionado.nombre_comite}".`)
            }
        }

        setIdCargo('')
        setPeriodo('')
        cargarTodo()
    }

    async function asignarComite(e) {
        e.preventDefault()
        if (!idComite) return
        const { error } = await supabase.from('miembro_comites').insert({
            id_miembro: miembro.id_miembro,
            id_comite: idComite,
            rol_comite: rolComite,
        })
        if (error) setMensaje('Error: ' + error.message)
        else {
            setIdComite('')
            cargarTodo()
        }
    }

    async function quitarCargo(id_miembro_cargo) {
        if (!window.confirm('¿Quitar esta asignación de cargo?')) return
        const { error } = await supabase.from('miembro_cargos').delete().eq('id_miembro_cargo', id_miembro_cargo)
        if (error) setMensaje('Error: ' + error.message)
        else cargarTodo()
    }

    async function quitarComite(id_miembro_comite) {
        if (!window.confirm('¿Quitar esta asignación de comité?')) return
        const { error } = await supabase.from('miembro_comites').delete().eq('id_miembro_comite', id_miembro_comite)
        if (error) setMensaje('Error: ' + error.message)
        else cargarTodo()
    }

    return (
        <div>
            <h4>Cargos</h4>
            {mensaje && <p>{mensaje}</p>}
            <table>
                <thead><tr><th>Cargo</th><th>Período</th><th></th></tr></thead>
                <tbody>
                    {miCargos.length === 0 && <tr><td colSpan={3}>No tiene cargos asignados.</td></tr>}
                    {miCargos.map((mc) => (
                        <tr key={mc.id_miembro_cargo}>
                            <td>{mc.cargos?.nombre_cargo}</td>
                            <td>{mc.periodo}</td>
                            <td><button className="rtc-btn-peligro" onClick={() => quitarCargo(mc.id_miembro_cargo)}>Quitar</button></td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <form onSubmit={asignarCargo}>
                <label>
                    Asignar cargo
                    <select value={idCargo} onChange={(e) => setIdCargo(e.target.value)}>
                        <option value="">-- Elegí un cargo --</option>
                        {cargos.map((c) => <option key={c.id_cargo} value={c.id_cargo}>{c.nombre_cargo}</option>)}
                    </select>
                </label>
                <label>
                    Período
                    <input placeholder="2025-2026" value={periodo} onChange={(e) => setPeriodo(e.target.value)} />
                </label>
                <button type="submit">Asignar</button>
            </form>

            <hr />

            <h4>Comités</h4>
            <table>
                <thead><tr><th>Comité</th><th>Rol</th><th></th></tr></thead>
                <tbody>
                    {miComites.length === 0 && <tr><td colSpan={3}>No integra ningún comité.</td></tr>}
                    {miComites.map((mc) => (
                        <tr key={mc.id_miembro_comite}>
                            <td>{mc.comites?.nombre_comite}</td>
                            <td>{mc.rol_comite}</td>
                            <td><button className="rtc-btn-peligro" onClick={() => quitarComite(mc.id_miembro_comite)}>Quitar</button></td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <form onSubmit={asignarComite}>
                <label>
                    Asignar comité
                    <select value={idComite} onChange={(e) => setIdComite(e.target.value)}>
                        <option value="">-- Elegí un comité --</option>
                        {comites.map((c) => <option key={c.id_comite} value={c.id_comite}>{c.nombre_comite}</option>)}
                    </select>
                </label>
                <label>
                    Rol
                    <select value={rolComite} onChange={(e) => setRolComite(e.target.value)}>
                        <option value="miembro">Miembro</option>
                        <option value="coordinador">Coordinador</option>
                    </select>
                </label>
                <button type="submit">Asignar</button>
            </form>
        </div>
    )
}

function AsistenciasMiembro({ miembro }) {
    const [asistencias, setAsistencias] = useState([])
    const [mensaje, setMensaje] = useState(null)

    useEffect(() => { cargar() }, [])

    async function cargar() {
        const { data } = await supabase
            .from('asistencias')
            .select('*, eventos(nombre_evento, fecha_evento, tipo_evento)')
            .eq('id_miembro', miembro.id_miembro)
            .order('id_asistencia', { ascending: false })
        setAsistencias(data || [])
    }

    async function corregir(id_asistencia, nuevoValor) {
        const { error } = await supabase.from('asistencias').update({ asistio: nuevoValor }).eq('id_asistencia', id_asistencia)
        if (error) setMensaje('Error: ' + error.message)
        else cargar()
    }

    return (
        <div>
            {mensaje && <p>{mensaje}</p>}
            <table>
                <thead><tr><th>Evento</th><th>Fecha</th><th>Tipo</th><th>Asistencia</th></tr></thead>
                <tbody>
                    {asistencias.length === 0 && <tr><td colSpan={4}>Todavía no tiene asistencia registrada.</td></tr>}
                    {asistencias.map((a) => (
                        <tr key={a.id_asistencia}>
                            <td>{a.eventos?.nombre_evento}</td>
                            <td>{new Date(a.eventos?.fecha_evento).toLocaleDateString()}</td>
                            <td>{a.eventos?.tipo_evento}</td>
                            <td>
                                <select value={a.asistio} onChange={(e) => corregir(a.id_asistencia, e.target.value)}>
                                    <option value="P">Presente</option>
                                    <option value="A">Ausente</option>
                                    <option value="J">Justificado</option>
                                </select>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

function agruparCuotasGeneradas(cuotas) {
    const grupos = new Map()
    for (const item of cuotas) {
        const periodo = Array.isArray(item.periodo_lectivo) ? item.periodo_lectivo[0] : item.periodo_lectivo
        if (!periodo) continue
        const clave = `${periodo.anio_inicio}-${periodo.anio_inicio + 1}`
        if (!grupos.has(clave)) grupos.set(clave, { clave, inicio: periodo.anio_inicio, semestres: { 1: [], 2: [] } })
        grupos.get(clave).semestres[periodo.semestre].push({ ...item, periodoInfo: periodo })
    }

    return [...grupos.values()]
        .sort((a, b) => b.inicio - a.inicio)
        .map((grupo) => ({
            ...grupo,
            semestres: Object.entries(grupo.semestres)
                .filter(([, items]) => items.length)
                .map(([numero, items]) => ({
                    numero: Number(numero),
                    rango: numero === '1' ? `julio–diciembre ${grupo.inicio}` : `febrero–junio ${grupo.inicio + 1}`,
                    cuotas: items.sort((a, b) => a.periodoInfo.mes - b.periodoInfo.mes),
                    pendientes: items.filter((item) => item.estado_pago !== 'pagado').length,
                })),
        }))
}

function estadoVisualCuota(cuota) {
    if (cuota.estado_pago === 'pagado') return { etiqueta: 'Pagada', clase: 'activo' }
    const periodo = cuota.periodoInfo
    const hoyDate = new Date()
    const hoy = `${hoyDate.getFullYear()}-${String(hoyDate.getMonth() + 1).padStart(2, '0')}-${String(hoyDate.getDate()).padStart(2, '0')}`
    const mes = `${periodo.anio}-${String(periodo.mes).padStart(2, '0')}`
    if (hoy.slice(0, 7) < mes) return { etiqueta: 'Próxima', clase: 'proxima' }
    if (periodo.fecha_vencimiento && hoy <= periodo.fecha_vencimiento) return { etiqueta: 'Por pagar', clase: 'por-pagar' }
    return { etiqueta: 'Atrasada', clase: 'atrasada' }
}

function CuotasMiembro({ miembro }) {
    const [cuotas, setCuotas] = useState([])
    const [mensaje, setMensaje] = useState(null)

    useEffect(() => { cargar() }, [miembro.id_miembro])

    async function cargar() {
        const { data, error } = await supabase
            .from('miembro_cuota')
            .select(`id_miembro_cuota, calidad_aplicada, monto_generado, estado_pago, fecha_pago,
                periodo_lectivo!id_periodo (id_periodo, anio_inicio, semestre, mes, anio, fecha_vencimiento)`)
            .eq('id_miembro', miembro.id_miembro)

        if (error) {
            setMensaje('No se pudieron cargar las cuotas generadas: ' + error.message)
            setCuotas([])
            return
        }
        setMensaje(null)
        setCuotas(data || [])
    }

    async function cambiarPago(cuota, pagado) {
        const fecha = pagado ? new Date().toISOString().slice(0, 10) : null
        const { error } = await supabase
            .from('miembro_cuota')
            .update({ estado_pago: pagado ? 'pagado' : 'pendiente', fecha_pago: fecha })
            .eq('id_miembro_cuota', cuota.id_miembro_cuota)
        if (error) setMensaje('No se pudo actualizar el pago: ' + error.message)
        else cargar()
    }

    const periodos = agruparCuotasGeneradas(cuotas)
    return (
        <div>
            {mensaje && <p role="alert">{mensaje}</p>}
            {periodos.map((periodo) => (
                <section key={periodo.clave}>
                    <h4 className="rtc-cuotas-periodo">Período {periodo.inicio}–{periodo.inicio + 1}</h4>
                    {periodo.semestres.map((semestre) => (
                        <details className="rtc-cuotas-semestre" key={semestre.numero}>
                            <summary className="rtc-cuotas-resumen">
                                {semestre.numero === 1 ? 'Primer' : 'Segundo'} semestre · Período {periodo.inicio}–{periodo.inicio + 1} ({semestre.rango}) · {semestre.cuotas.length} cuotas · {semestre.pendientes} pendientes
                            </summary>
                            <table>
                                <thead><tr><th>Mes</th><th>Calidad</th><th>Monto</th><th>Estado</th><th>Acción</th></tr></thead>
                                <tbody>
                                    {semestre.cuotas.map((cuota) => {
                                        const periodoInfo = cuota.periodoInfo
                                        const pagado = cuota.estado_pago === 'pagado'
                                        const estado = estadoVisualCuota(cuota)
                                        const mes = new Date(periodoInfo.anio, periodoInfo.mes - 1, 1)
                                            .toLocaleDateString('es-PY', { month: 'long', year: 'numeric' })
                                        return (
                                            <tr key={cuota.id_miembro_cuota}>
                                                <td>{mes}</td>
                                                <td>{cuota.calidad_aplicada === 'A' ? 'Aspirante' : 'Socio'}</td>
                                                <td>Gs. {Number(cuota.monto_generado).toLocaleString('es-PY')}</td>
                                                <td><span className={'rtc-badge rtc-badge--' + estado.clase}>{estado.etiqueta}</span></td>
                                                <td>{pagado
                                                    ? <button className="rtc-btn-secundario" onClick={() => cambiarPago(cuota, false)}>Deshacer pago</button>
                                                    : <button onClick={() => cambiarPago(cuota, true)}>Marcar pagado</button>}
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
            {!mensaje && periodos.length === 0 && <p>No hay cuotas generadas para este miembro en los períodos recientes.</p>}
        </div>
    )
}

function PrestamosMiembro({ miembro }) {
    const [prestamos, setPrestamos] = useState([])
    const [monto, setMonto] = useState('')
    const [observaciones, setObservaciones] = useState('')
    const [mensaje, setMensaje] = useState(null)

    useEffect(() => { cargar() }, [])

    async function cargar() {
        const { data } = await supabase
            .from('prestamos')
            .select('*')
            .eq('id_miembro', miembro.id_miembro)
            .order('fecha_solicitud', { ascending: false })
        setPrestamos(data || [])
    }

    async function registrarPrestamo(e) {
        e.preventDefault()
        if (!monto) return
        const { error } = await supabase.from('prestamos').insert({
            id_miembro: miembro.id_miembro,
            monto,
            observaciones,
        })
        if (error) setMensaje('Error: ' + error.message)
        else {
            setMonto('')
            setObservaciones('')
            cargar()
        }
    }

    async function cambiarEstado(id_prestamo, nuevoEstado) {
        const { error } = await supabase.from('prestamos').update({ estado_prestamo: nuevoEstado }).eq('id_prestamo', id_prestamo)
        if (error) setMensaje('Error: ' + error.message)
        else cargar()
    }

    return (
        <div>
            {mensaje && <p>{mensaje}</p>}
            <table>
                <thead><tr><th>Monto</th><th>Fecha</th><th>Estado</th></tr></thead>
                <tbody>
                    {prestamos.length === 0 && <tr><td colSpan={3}>No tiene préstamos registrados.</td></tr>}
                    {prestamos.map((p) => (
                        <tr key={p.id_prestamo}>
                            <td>Gs. {Number(p.monto).toLocaleString('es-PY')}</td>
                            <td>{new Date(p.fecha_solicitud).toLocaleDateString()}</td>
                            <td>
                                <select value={p.estado_prestamo} onChange={(e) => cambiarEstado(p.id_prestamo, e.target.value)}>
                                    <option value="pendiente">Pendiente</option>
                                    <option value="aprobado">Aprobado</option>
                                    <option value="rechazado">Rechazado</option>
                                    <option value="pagado">Pagado</option>
                                </select>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <form onSubmit={registrarPrestamo}>
                <label>
                    Monto (Gs.)
                    <input type="number" value={monto} onChange={(e) => setMonto(e.target.value)} required />
                </label>
                <label>
                    Observaciones
                    <input value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
                </label>
                <button type="submit">Registrar préstamo</button>
            </form>
        </div>
    )
}
