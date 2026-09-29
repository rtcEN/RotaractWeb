import { useState } from 'react'
import AltaMiembro from './AltaMiembro'
import ListaMiembros from './ListaMiembros'
import RegistrarAsistencia from './RegistrarAsistencia'
import Documentos from './Documentos'
import MiResumen from './Miresumen'
import MisCuotas from './Miscuotas'
import MiAsistencia from './Miasistencia'
import MisPrestamos from './Misprestamos'

const NOMBRES_CALIDAD = { A: 'Aspirante', S: 'Socio', H: 'Honorario' }

export default function Panel({ miembro, onLogout }) {
  const seccionesAdmin = [
    { id: 'inicio', label: 'Inicio' },
    { id: 'alta', label: 'Cargar miembro' },
    { id: 'miembros', label: 'Miembros' },
    { id: 'asistencia', label: 'Eventos y asistencia' },
  ]
  const seccionesSocio = [
    { id: 'inicio', label: 'Inicio' },
    { id: 'cuotas', label: 'Mis cuotas' },
    { id: 'asistencia', label: 'Mi asistencia' },
    { id: 'prestamos', label: 'Préstamos' },
    { id: 'documentos', label: 'Documentos' },
  ]

  const secciones = miembro.es_admin ? seccionesAdmin : seccionesSocio
  const [seccionActiva, setSeccionActiva] = useState('inicio')

  return (
    <div className="rtc-shell">
      <aside className="rtc-sidebar">
        <div className="rtc-brand">
          <img src={`${import.meta.env.BASE_URL}images/logo2.png`} alt="Rotaract Encarnación Norte" />
        </div>

        <nav className="rtc-sidebar-nav">
          {secciones.map((s) => (
            <button
              key={s.id}
              className={'rtc-sidebar-btn' + (seccionActiva === s.id ? ' activo' : '')}
              onClick={() => setSeccionActiva(s.id)}
            >
              {s.label}
            </button>
          ))}
        </nav>

        <button className="rtc-sidebar-logout" onClick={onLogout}>
          Cerrar sesión
        </button>
      </aside>

      <main className="rtc-main">
        <div className="rtc-topbar">
          <div>
            <h1>Hola, {miembro.nombre_miembro}</h1>
            <p>
              {NOMBRES_CALIDAD[miembro.calidad]} · {miembro.estado_miembro === 'A' ? 'Activo' : 'Inactivo'}
              {miembro.es_admin ? ' · Administrador' : ''}
            </p>
          </div>
        </div>

        {seccionActiva === 'inicio' && (
          <div className="rtc-card">
            <p>Correo: {miembro.correo_miembro}</p>
            {!miembro.es_admin && <MiResumen miembro={miembro} />}
          </div>
        )}

        {miembro.es_admin && seccionActiva === 'alta' && (
          <div className="rtc-card"><AltaMiembro /></div>
        )}
        {miembro.es_admin && seccionActiva === 'miembros' && (
          <div className="rtc-card"><ListaMiembros /></div>
        )}
        {miembro.es_admin && seccionActiva === 'asistencia' && (
          <div className="rtc-card"><RegistrarAsistencia /></div>
        )}

        {!miembro.es_admin && seccionActiva === 'cuotas' && (
          <div className="rtc-card"><MisCuotas miembro={miembro} /></div>
        )}
        {!miembro.es_admin && seccionActiva === 'asistencia' && (
          <div className="rtc-card"><MiAsistencia miembro={miembro} /></div>
        )}
        {!miembro.es_admin && seccionActiva === 'prestamos' && (
          <div className="rtc-card"><MisPrestamos miembro={miembro} /></div>
        )}
        {!miembro.es_admin && seccionActiva === 'documentos' && (
          <div className="rtc-card">
            <Documentos categoria={miembro.calidad === 'A' ? 'aspirante' : 'socio'} />
          </div>
        )}
      </main>
    </div>
  )
}