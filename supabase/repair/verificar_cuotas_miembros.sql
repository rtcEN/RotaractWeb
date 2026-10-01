-- Diagnóstico general de cuotas: muestra todos los miembros y cuántas cuotas
-- generadas tienen por período rotario. Consulta de solo lectura.
SELECT
  m.id_miembro,
  m.nombre_miembro,
  m.calidad AS calidad_actual,
  m.estado_miembro,
  CASE WHEN p.anio_inicio IS NULL THEN NULL
       ELSE p.anio_inicio || '-' || (p.anio_inicio + 1)::text
  END AS periodo_rotario,
  COUNT(DISTINCT h.id_historial) AS periodos_calidad,
  COUNT(DISTINCT mc.id_miembro_cuota) AS cuotas_generadas,
  COUNT(DISTINCT mc.id_miembro_cuota) FILTER (WHERE mc.estado_pago = 'pagado') AS cuotas_pagadas
FROM miembro m
LEFT JOIN miembro_calidad_historial h
  ON h.id_miembro = m.id_miembro
LEFT JOIN miembro_cuota mc
  ON mc.id_miembro = m.id_miembro
LEFT JOIN periodo_lectivo p
  ON p.id_periodo = mc.id_periodo
GROUP BY m.id_miembro, m.nombre_miembro, m.calidad, m.estado_miembro, p.anio_inicio
ORDER BY m.nombre_miembro, p.anio_inicio;
