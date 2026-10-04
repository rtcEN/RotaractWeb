-- Cuotas del segundo semestre del período rotario 2026-2027.
-- Enero no lleva cuota.
INSERT INTO cuotas (
  descripcion_cuota,
  monto_cuota,
  periodo_cuota,
  fecha_vencimiento,
  aplica_calidad
)
SELECT
  'Cuota ' || to_char(mes, 'TMMonth YYYY') || ' - ' || calidad.nombre,
  calidad.monto,
  to_char(mes, 'TMMonth YYYY'),
  (mes + interval '1 month - 1 day')::date,
  calidad.codigo
FROM generate_series(
  '2027-02-01'::date,
  '2027-06-01'::date,
  interval '1 month'
) AS serie(mes)
CROSS JOIN (VALUES ('A', 'Aspirante', 25000), ('S', 'Socio', 30000))
  AS calidad(codigo, nombre, monto)
WHERE NOT EXISTS (
  SELECT 1
  FROM cuotas c
  WHERE c.aplica_calidad = calidad.codigo
    AND date_trunc('month', c.fecha_vencimiento) = mes
);
