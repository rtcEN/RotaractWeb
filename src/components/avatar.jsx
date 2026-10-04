import { useState } from 'react'

function iniciales(nombre) {
    const partes = (nombre || '').trim().split(/\s+/).filter(Boolean)
    if (partes.length === 0) return '?'
    const primera = partes[0][0]
    const ultima = partes.length > 1 ? partes[partes.length - 1][0] : ''
    return (primera + ultima).toUpperCase()
}

export default function Avatar({ nombre, fotoUrl, tamano }) {
    const [falla, setFalla] = useState(false)
    const clase = 'rtc-avatar' + (tamano === 'sm' ? ' rtc-avatar--sm' : '')

    if (fotoUrl && !falla) {
        return <img className={clase} src={fotoUrl} alt="" onError={() => setFalla(true)} />
    }
    return (
        <div className={clase + ' rtc-avatar--iniciales'} aria-hidden="true">
            {iniciales(nombre)}
        </div>
    )
}