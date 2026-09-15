export default function Panel({ miembro, onLogout }) {
  return (
    <div>
      <h2>Hola, {miembro.nombre_miembro}</h2>
      <p>Correo: {miembro.correo_miembro}</p>
      <p>
        Calidad:{' '}
        {miembro.calidad === 'A' ? 'Aspirante' : miembro.calidad === 'S' ? 'Socio' : 'Honorario'}
      </p>
      <p>Estado: {miembro.estado_miembro === 'A' ? 'Activo' : 'Inactivo'}</p>

      {miembro.es_admin ? (
        <div>
          <h3>Panel de administración</h3>
          <p>Acá vas a poder aprobar aspirantes, cargar eventos y cuotas, etc.</p>
        </div>
      ) : (
        <div>
          <h3>Mi panel</h3>
          <p>Acá vas a ver tus cuotas, tu asistencia y los eventos del club.</p>
        </div>
      )}

      <button onClick={onLogout}>Cerrar sesión</button>
    </div>
  )
}
