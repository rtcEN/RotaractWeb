-- Ajusta la cuota histórica de aspirante del segundo semestre 2025-2026.
-- Aspirante: Gs. 20.000 por mes de febrero a junio de 2026.
-- Las cuotas de socio no se modifican.
UPDATE cuotas
SET monto_cuota = 20000
WHERE aplica_calidad = 'A'
  AND fecha_vencimiento >= '2026-02-01'::date
  AND fecha_vencimiento < '2026-07-01'::date;
