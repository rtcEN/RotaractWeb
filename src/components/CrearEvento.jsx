import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function CrearEvento({ onEventoCreado }) {
    const [nombre, setNombre] = useState('')
    const [descripcion, setDescripcion] = useState('')
    const [fecha, setFecha] = useState('')
    const [lugar, setLugar] = useState('')
    const [tipo, setTipo] = useState('reunion')
    const [mensaje, setMensaje] = useState(null)

    async function handleSubmit(e) {
        e.preventDefault()
        setMensaje(null)

        const { error } = await supabase.from('eventos').insert({
            nombre_evento: nombre,
            descripcion_evento: descripcion,
            fecha_evento: fecha,
            lugar_evento: lugar,
            tipo_evento: tipo,
        })

        if (error) {
            setMensaje('Error: ' + error.message)
        } else {
            setMensaje('Evento creado.')
            setNombre('')
            setDescripcion('')
            setFecha('')
            setLugar('')
            if (onEventoCreado) onEventoCreado()
        }
    }

    return (
        <form onSubmit={handleSubmit}>
            <h3>Crear evento</h3>

            <label>
                Nombre
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
            </label>

            <label>
                Descripción
                <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
            </label>

            <label>
                Fecha y hora
                <input type="datetime-local" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
            </label>

            <label>
                Lugar
                <input value={lugar} onChange={(e) => setLugar(e.target.value)} />
            </label>

            <label>
                Tipo
                <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
                    <option value="reunion">Reunión</option>
                    <option value="servicio">Servicio</option>
                    <option value="social">Social</option>
                    <option value="recaudacion">Recaudación</option>
                    <option value="distrital">Distrital (Asamblea, Conferencia, ERIPA...)</option>
                </select>
            </label>

            <button type="submit">Crear evento</button>

            {mensaje && <p>{mensaje}</p>}
        </form>
    )
}