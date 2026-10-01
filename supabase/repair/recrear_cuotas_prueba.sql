-- REINICIO DIRIGIDO DE DATOS DE PRUEBA
-- Afecta solamente a los miembros de prueba 1, 3, 6, 8 y 9.
-- Borra sus filas generadas en miembro_cuota (incluidos sus estados de pago)
-- y su historial de calidad para poder reconstruir el escenario descrito.
-- No toca cuotas/pagos de otros miembros ni la tabla tradicional pagos.

BEGIN;

-- 1. Eliminar solamente las cuotas individuales de estos miembros de prueba.
DELETE FROM miembro_cuota
WHERE id_miembro IN (1, 3, 6, 8, 9);

-- 2. Reiniciar solamente el historial de calidad de estos miembros de prueba.
DELETE FROM miembro_calidad_historial
WHERE id_miembro IN (1, 3, 6, 8, 9);

-- 3. Aspirante desde julio. Los miembros 1, 3, 6 y 8 ascienden durante septiembre,
-- así que siguen como Aspirante hasta septiembre inclusive.
INSERT INTO miembro_calidad_historial (id_miembro, calidad, fecha_desde, fecha_hasta)
VALUES
  (1, 'A', DATE '2026-07-01', DATE '2026-09-30'),
  (3, 'A', DATE '2026-07-01', DATE '2026-09-30'),
  (6, 'A', DATE '2026-07-01', DATE '2026-09-30'),
  (8, 'A', DATE '2026-07-01', DATE '2026-09-30'),
  (9, 'A', DATE '2026-07-01', DATE '2026-10-31');

-- 4. Socio comienza desde el mes siguiente al cambio.
INSERT INTO miembro_calidad_historial (id_miembro, calidad, fecha_desde, fecha_hasta)
VALUES
  (1, 'S', DATE '2026-10-01', NULL),
  (3, 'S', DATE '2026-10-01', NULL),
  (6, 'S', DATE '2026-10-01', NULL),
  (8, 'S', DATE '2026-10-01', NULL),
  (9, 'S', DATE '2026-11-01', NULL);

-- 5. Sincronizar la calidad actual de los registros de prueba.
UPDATE miembro
SET calidad = 'S'
WHERE id_miembro IN (1, 3, 6, 8, 9);

-- 6. Crear todas las cuotas faltantes según periodo_lectivo e historial.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id_miembro
    FROM miembro
    WHERE id_miembro IN (1, 3, 6, 8, 9)
  LOOP
    PERFORM generar_cuotas_miembro(r.id_miembro);
  END LOOP;
END;
$$;

COMMIT;

-- 7. Revisar resultados.
SELECT
  m.id_miembro,
  m.nombre_miembro,
  h.calidad,
  h.fecha_desde,
  h.fecha_hasta
FROM miembro_calidad_historial h
JOIN miembro m ON m.id_miembro = h.id_miembro
WHERE h.id_miembro IN (1, 3, 6, 8, 9)
ORDER BY m.nombre_miembro, h.fecha_desde;

SELECT
  m.id_miembro,
  m.nombre_miembro,
  p.anio_inicio,
  p.semestre,
  p.mes,
  p.anio,
  mc.calidad_aplicada,
  mc.monto_generado,
  mc.estado_pago,
  mc.fecha_pago
FROM miembro_cuota mc
JOIN miembro m ON m.id_miembro = mc.id_miembro
JOIN periodo_lectivo p ON p.id_periodo = mc.id_periodo
WHERE mc.id_miembro IN (1, 3, 6, 8, 9)
ORDER BY m.nombre_miembro, p.anio, p.mes;
