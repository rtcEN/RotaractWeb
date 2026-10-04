-- Completa las cuotas de socio que faltan y las tarifas del primer semestre
-- del período 2026-2027. No modifica cuotas ni pagos existentes.
-- Enero no lleva cuota.

-- Primer semestre 2025-2026: julio a diciembre de 2025.
INSERT INTO cuotas (descripcion_cuota, monto_cuota, periodo_cuota, fecha_vencimiento, aplica_calidad)
SELECT 'Cuota ' || to_char(mes, 'TMMonth YYYY') || ' - Socio',
       25000, to_char(mes, 'TMMonth YYYY'),
       (mes + interval '1 month - 1 day')::date, 'S'
FROM generate_series('2025-07-01'::date, '2025-12-01'::date, interval '1 month') AS serie(mes)
WHERE NOT EXISTS (
  SELECT 1 FROM cuotas c
  WHERE c.aplica_calidad = 'S'
    AND date_trunc('month', c.fecha_vencimiento) = mes
);

-- Segundo semestre 2025-2026: socio paga Gs. 25.000 de febrero a junio de 2026.
INSERT INTO cuotas (descripcion_cuota, monto_cuota, periodo_cuota, fecha_vencimiento, aplica_calidad)
SELECT 'Cuota ' || to_char(mes, 'TMMonth YYYY') || ' - Socio',
       25000, to_char(mes, 'TMMonth YYYY'),
       (mes + interval '1 month - 1 day')::date, 'S'
FROM generate_series('2026-02-01'::date, '2026-06-01'::date, interval '1 month') AS serie(mes)
WHERE NOT EXISTS (
  SELECT 1 FROM cuotas c
  WHERE c.aplica_calidad = 'S'
    AND date_trunc('month', c.fecha_vencimiento) = mes
);

-- Primer semestre 2026-2027: aspirante Gs. 25.000 y socio Gs. 30.000.
INSERT INTO cuotas (descripcion_cuota, monto_cuota, periodo_cuota, fecha_vencimiento, aplica_calidad)
SELECT 'Cuota ' || to_char(mes, 'TMMonth YYYY') || ' - ' || tarifa.nombre,
       tarifa.monto, to_char(mes, 'TMMonth YYYY'),
       (mes + interval '1 month - 1 day')::date, tarifa.calidad
FROM generate_series('2026-07-01'::date, '2026-12-01'::date, interval '1 month') AS serie(mes)
CROSS JOIN (VALUES ('A', 'Aspirante', 25000), ('S', 'Socio', 30000)) AS tarifa(calidad, nombre, monto)
WHERE NOT EXISTS (
  SELECT 1 FROM cuotas c
  WHERE c.aplica_calidad = tarifa.calidad
    AND date_trunc('month', c.fecha_vencimiento) = mes
);
