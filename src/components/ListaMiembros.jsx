import { useState, useEffect } from 'react'
import { Ban, RotateCcw, Trash2, FileText } from 'lucide-react'
import { supabase } from '../supabaseClient'
import FichaMiembro from './FichaMiembro'

const NOMBRES_CALIDAD = { A: 'Aspirante', S: 'Socio', H: 'Honorario' }
const CLASE_CALIDAD = { A: 'aspirante', S: 'socio', H: 'socio' }

export default function ListaMiembros() {
    const [miembros, setMiembros] = useState([])
    const [cargando, setCargando] = useState(true)
    const [mensaje, setMensaje] = useState(null)
    const [seleccionadoId, setSeleccionadoId] = useState(null)
    const [verFicha, setVerFicha] = useState(false)

    useEffect(() => {
        cargarMiembros()
    }, [])

    async function cargarMiembros() {
        setCargando(true)
        const { data, error } = await supabase
            .from('miembro')
            .select('*')
            .order('id_miembro', { ascending: true })

        if (error) setMensaje('Error al cargar miembros: ' + error.message)
        else setMiembros(data)
        setCargando(false)
    }

    const seleccionado = miembros.find((m) => m.id_miembro === seleccionadoId) || null

    async function cambiarEstado() {
        if (!seleccionado) return
        const nuevoEstado = seleccionado.estado_miembro === 'A' ? 'I' : 'A'
        const { error } = await supabase.from('miembro').update({ estado_miembro: nuevoEstado }).eq('id_miembro', seleccionado.id_miembro)
        if (error) setMensaje('Error al cambiar estado: ' + error.message)
        else cargarMiembros()
    }

    async function borrarSeleccionado() {
        if (!seleccionado) return
        const confirmar = window.confirm(
            `¿Seguro que querés borrar a ${seleccionado.nombre_miembro}? Esto también borra su historial y su cuenta de acceso. No se puede deshacer.`
        )
        if (!confirmar) return

        const { data, error } = await supabase.functions.invoke('borrar-miembro', {
            body: { id_miembro: seleccionado.id_miembro },
        })
        if (error) setMensaje('Error al borrar: ' + error.message)
        else if (data?.error) setMensaje('Error al borrar: ' + data.error)
        else {
            setMensaje(seleccionado.nombre_miembro + ' fue eliminado, junto con su cuenta de acceso.')
            setSeleccionadoId(null)
            cargarMiembros()
        }
    }

    if (cargando) return <p>Cargando miembros...</p>

    if (verFicha && seleccionado) {
        return (
            <FichaMiembro
                miembro={seleccionado}
                onCerrar={() => setVerFicha(false)}
                onActualizado={cargarMiembros}
            />
        )
    }

    return (
        <div>
            <h3>Miembros del club</h3>
            {mensaje && <p>{mensaje}</p>}

            <div className="rtc-toolbar">
                <button
                    className="rtc-icon-btn"
                    disabled={!seleccionado}
                    onClick={() => setVerFicha(true)}
                    title="Ver ficha completa"
                >
                    <FileText size={16} /> Ver ficha
                </button>

                <button
                    className="rtc-icon-btn rtc-icon-btn--secundario"
                    disabled={!seleccionado}
                    onClick={cambiarEstado}
                    title={seleccionado?.estado_miembro === 'A' ? 'Marcar inactivo' : 'Marcar activo'}
                >
                    {seleccionado?.estado_miembro === 'I' ? <RotateCcw size={16} /> : <Ban size={16} />}
                    {seleccionado?.estado_miembro === 'I' ? ' Reactivar' : ' Desactivar'}
                </button>

                <button
                    className="rtc-icon-btn rtc-icon-btn--peligro"
                    disabled={!seleccionado}
                    onClick={borrarSeleccionado}
                    title="Borrar miembro"
                >
                    <Trash2 size={16} /> Borrar
                </button>
            </div>

            <table>
                <thead>
                    <tr>
                        <th></th>
                        <th>Nombre</th>
                        <th>Correo</th>
                        <th>Calidad</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
                    {miembros.map((m) => (
                        <tr
                            key={m.id_miembro}
                            className={m.id_miembro === seleccionadoId ? 'rtc-fila-seleccionada' : ''}
                            onClick={() => setSeleccionadoId(m.id_miembro === seleccionadoId ? null : m.id_miembro)}
                        >
                            <td>
                                <input type="radio" checked={m.id_miembro === seleccionadoId} readOnly />
                            </td>
                            <td>{m.nombre_miembro}</td>
                            <td>{m.correo_miembro}</td>
                            <td><span className={'rtc-badge rtc-badge--' + CLASE_CALIDAD[m.calidad]}>{NOMBRES_CALIDAD[m.calidad]}</span></td>
                            <td><span className={'rtc-badge rtc-badge--' + (m.estado_miembro === 'A' ? 'activo' : 'inactivo')}>{m.estado_miembro === 'A' ? 'Activo' : 'Inactivo'}</span></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}