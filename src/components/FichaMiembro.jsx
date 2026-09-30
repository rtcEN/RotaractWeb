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

/* ===================================================================
   Datos personales
   =================================================================== */
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

/* ===================================================================
   Datos del club (calidad / estado)
   =================================================================== */
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
            // La cuota del mes de promoción conserva la calidad anterior.
            // La nueva calidad se aplica desde el primer día del mes siguiente.
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
            if (periodoActual && fechaEfectiva <= `${periodoActual.fecha_desde.slice(0, 7)}-01`) {
                setMensaje('Elegí un mes posterior al inicio de la calidad vigente.')
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
                    Fecha de ascenso a socio
                    <input type="date" value={fechaCambioCalidad} onChange={(e) => setFechaCambioCalidad(e.target.value)} required />
                    <small>El mes del ascenso conserva la cuota de aspirante. La cuota de socio empieza el mes siguiente.</small>
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

/* ===================================================================
   Cargos y comités
   =================================================================== */
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

    useEffect(() => {
        cargarTodo()
    }, [])

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
        if (error) {
            setMensaje('Error: ' + error.message)
            return
        }

        // Si el cargo es "Director de <comité>", asignamos ese comité
        // automáticamente como coordinador, para no cargarlo dos veces.
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
        const confirmar = window.confirm('¿Quitar esta asignación de cargo? Podés volver a asignarla después con los datos correctos.')
        if (!confirmar) return
        const { error } = await supabase.from('miembro_cargos').delete().eq('id_miembro_cargo', id_miembro_cargo)
        if (error) setMensaje('Error: ' + error.message)
        else cargarTodo()
    }

    async function quitarComite(id_miembro_comite) {
        const confirmar = window.confirm('¿Quitar esta asignación de comité?')
        if (!confirmar) return
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

/* ===================================================================
   Asistencias
   =================================================================== */
function AsistenciasMiembro({ miembro }) {
    const [asistencias, setAsistencias] = useState([])
    const [mensaje, setMensaje] = useState(null)

    useEffect(() => {
        cargar()
    }, [])

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

/* ===================================================================
   Cuotas
   =================================================================== */
function agruparCuotasPorPeriodo(cuotas, pagos) {
    const periodos = new Map()
    for (const cuota of cuotas) {
        const fecha = cuota.fecha_vencimiento
        if (!fecha) continue
        const anio = Number(fecha.slice(0, 4))
        const mes = Number(fecha.slice(5, 7))
        const inicio = mes >= 7 ? anio : anio - 1
        const semestre = mes >= 7 ? 1 : 2
        const clave = `${inicio}-${inicio + 1}`
        if (!periodos.has(clave)) periodos.set(clave, { clave, inicio, semestres: { 1: [], 2: [] } })
        periodos.get(clave).semestres[semestre].push(cuota)
    }

    const hoy = new Date()
    const periodoActualInicio = hoy.getMonth() >= 6 ? hoy.getFullYear() : hoy.getFullYear() - 1
    return [...periodos.values()]
        .filter((periodo) => periodo.inicio === periodoActualInicio || periodo.inicio === periodoActualInicio - 1)
        .sort((a, b) => b.inicio - a.inicio)
        .map((periodo) => ({
        ...periodo,
        semestres: Object.entries(periodo.semestres).filter(([numero, items]) => items.length && !(periodo.inicio === periodoActualInicio - 1 && numero === '1')).map(([numero, items]) => {
            const pagadas = items.filter((cuota) => pagos.find((p) => p.id_cuota === cuota.id_cuota)?.estado_pago === 'pagado').length
            const n = Number(numero)
            return {
                numero: n,
                rango: n === 1 ? `julio–diciembre ${periodo.inicio}` : `febrero–junio ${periodo.inicio + 1}`,
                cuotas: items,
                pendientes: items.length - pagadas,
            }
        }),
        }))
}

function CuotasMiembro({ miembro }) {
    const [cuotas, setCuotas] = useState([])
    const [pagos, setPagos] = useState([])
    const [mensaje, setMensaje] = useState(null)

    useEffect(() => {
        cargar()
    }, [])

    async function cargar() {
        const [cuotasResp, pagosResp, historialResp] = await Promise.all([
            supabase.from('cuotas').select('*').order('fecha_vencimiento'),
            supabase.from('pagos').select('*').eq('id_miembro', miembro.id_miembro),
            supabase.from('miembro_calidad_historial').select('*').eq('id_miembro', miembro.id_miembro).order('fecha_desde'),
        ])
        const historial = historialResp.data || []
        setCuotas((cuotasResp.data || []).filter((c) => {
            if (!c.fecha_vencimiento || c.fecha_vencimiento.slice(5, 7) === '01') return false
            const mes = c.fecha_vencimiento.slice(0, 7)
            const periodo = historial.find((h) => h.fecha_desde.slice(0, 7) <= mes && (!h.fecha_hasta || h.fecha_hasta.slice(0, 7) >= mes))
            return c.aplica_calidad === (periodo?.calidad || miembro.calidad)
        }))
        setPagos(pagosResp.data || [])
    }

    function pagoDeCuota(id_cuota) {
        return pagos.find((p) => p.id_cuota === id_cuota)
    }

    async function marcarPagado(cuota) {
        const existente = pagoDeCuota(cuota.id_cuota)
        let error
        if (existente) {
            ; ({ error } = await supabase
                .from('pagos')
                .update({ estado_pago: 'pagado', fecha_pago: new Date().toISOString().slice(0, 10), monto_pagado: cuota.monto_cuota })
                .eq('id_pago', existente.id_pago))
        } else {
            ; ({ error } = await supabase.from('pagos').insert({
                id_miembro: miembro.id_miembro,
                id_cuota: cuota.id_cuota,
                monto_pagado: cuota.monto_cuota,
                fecha_pago: new Date().toISOString().slice(0, 10),
                estado_pago: 'pagado',
            }))
        }
        if (error) setMensaje('Error: ' + error.message)
        else cargar()
    }

    async function deshacerPago(cuota) {
        const existente = pagoDeCuota(cuota.id_cuota)
        if (!existente || existente.estado_pago !== 'pagado') return
        const confirmar = window.confirm(`¿Deshacer el pago de ${cuota.periodo_cuota} y dejar la cuota pendiente?`)
        if (!confirmar) return

        const { error } = await supabase
            .from('pagos')
            .update({ estado_pago: 'pendiente', fecha_pago: null, monto_pagado: 0 })
            .eq('id_pago', existente.id_pago)

        if (error) setMensaje('Error al deshacer el pago: ' + error.message)
        else {
            setMensaje('Pago deshecho. La cuota quedó pendiente.')
            cargar()
        }
    }

    const periodos = agruparCuotasPorPeriodo(cuotas, pagos)

    return (
        <div>
            {mensaje && <p>{mensaje}</p>}
            {periodos.map((periodo) => (
                <section key={periodo.clave}>
                    <h4>Período {periodo.inicio}–{periodo.inicio + 1}</h4>
                    {periodo.semestres.map((semestre) => (
                        <details key={semestre.numero}>
                            <summary>
                                {semestre.numero === 1 ? 'Primer' : 'Segundo'} semestre · Período {periodo.inicio}–{periodo.inicio + 1} ({semestre.rango}) · {semestre.cuotas.length} cuotas · {semestre.pendientes} pendientes
                            </summary>
                            <table>
                                <thead><tr><th>Mes</th><th>Calidad</th><th>Monto</th><th>Estado</th><th>Acción</th></tr></thead>
                                <tbody>
                                    {semestre.cuotas.map((c) => {
                                        const pago = pagoDeCuota(c.id_cuota)
                                        const pagado = pago?.estado_pago === 'pagado'
                                        return (
                                            <tr key={c.id_cuota}>
                                                <td>{c.periodo_cuota}</td>
                                                <td>{c.aplica_calidad === 'A' ? 'Aspirante' : 'Socio'}</td>
                                                <td>Gs. {Number(c.monto_cuota).toLocaleString('es-PY')}</td>
                                                <td><span className={'rtc-badge rtc-badge--' + (pagado ? 'activo' : 'pendiente')}>{pagado ? 'Pagado' : 'Pendiente'}</span></td>
                                                <td>
                                                    {pagado
                                                        ? <button className="rtc-btn-secundario" onClick={() => deshacerPago(c)}>Deshacer pago</button>
                                                        : <button onClick={() => marcarPagado(c)}>Marcar pagado</button>}
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
            {periodos.length === 0 && <p>No hay cuotas para mostrar.</p>}
        </div>
    )
}

/* ===================================================================
   Préstamos
   =================================================================== */
function PrestamosMiembro({ miembro }) {
    const [prestamos, setPrestamos] = useState([])
    const [monto, setMonto] = useState('')
    const [observaciones, setObservaciones] = useState('')
    const [mensaje, setMensaje] = useState(null)

    useEffect(() => {
        cargar()
    }, [])

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
