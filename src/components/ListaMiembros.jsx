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
    const [miembroSeleccionado, setMiembroSeleccionado] = useState(null)
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

    async function cambiarEstado(miembro) {
        const nuevoEstado = miembro.estado_miembro === 'A' ? 'I' : 'A'
        const { error } = await supabase
            .from('miembro')
            .update({ estado_miembro: nuevoEstado })
            .eq('id_miembro', miembro.id_miembro)

        if (error) setMensaje('Error al cambiar estado: ' + error.message)
        else cargarMiembros()
    }

    async function borrarMiembro(miembro) {
        const confirmar = window.confirm(
            `¿Seguro que querés borrar a ${miembro.nombre_miembro}? Esto también borra su historial y su cuenta de acceso. No se puede deshacer.`
        )
        if (!confirmar) return

        const { data, error } = await supabase.functions.invoke('borrar-miembro', {
            body: { id_miembro: miembro.id_miembro },
        })

        if (error) setMensaje('Error al borrar: ' + error.message)
        else if (data?.error) setMensaje('Error al borrar: ' + data.error)
        else {
            setMensaje(miembro.nombre_miembro + ' fue eliminado, junto con su cuenta de acceso.')
            cargarMiembros()
        }
    }

    const abrirFicha = (miembro) => {
        setMiembroSeleccionado(miembro)
        setVerFicha(true)
    }

    if (cargando) return <p>Cargando miembros...</p>

    if (verFicha && miembroSeleccionado) {
        return (
            <FichaMiembro
                miembro={miembroSeleccionado}
                onCerrar={() => {
                    setVerFicha(false)
                    setMiembroSeleccionado(null)
                }}
                onActualizado={cargarMiembros}
            />
        )
    }

    return (
        <div>
            <h3>Miembros del club</h3>
            {mensaje && <p>{mensaje}</p>}

            <table>
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>Correo</th>
                        <th>Calidad</th>
                        <th>Estado</th>
                        <th style={{ textAlign: 'center' }}>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {miembros.map((m) => (
                        <tr key={m.id_miembro}>
                            <td>{m.nombre_miembro}</td>
                            <td>{m.correo_miembro}</td>
                            <td>
                                <span className={'rtc-badge rtc-badge--' + CLASE_CALIDAD[m.calidad]}>
                                    {NOMBRES_CALIDAD[m.calidad]}
                                </span>
                            </td>
                            <td>
                                <span className={'rtc-badge rtc-badge--' + (m.estado_miembro === 'A' ? 'activo' : 'inactivo')}>
                                    {m.estado_miembro === 'A' ? 'Activo' : 'Inactivo'}
                                </span>
                            </td>
                            <td>
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                    <button
                                        className="rtc-icon-btn"
                                        onClick={() => abrirFicha(m)}
                                        title="Ver ficha completa"
                                    >
                                        <FileText size={16} />
                                    </button>

                                    <button
                                        className="rtc-icon-btn rtc-icon-btn--secundario"
                                        onClick={() => cambiarEstado(m)}
                                        title={m.estado_miembro === 'A' ? 'Desactivar' : 'Reactivar'}
                                    >
                                        {m.estado_miembro === 'I' ? <RotateCcw size={16} /> : <Ban size={16} />}
                                    </button>

                                    <button
                                        className="rtc-icon-btn rtc-icon-btn--peligro"
                                        onClick={() => borrarMiembro(m)}
                                        title="Borrar miembro"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}