-- Historial necesario para calcular cada cuota con la calidad que regía
-- durante ese período. Ejecutar en Supabase antes de desplegar el frontend.
CREATE TABLE IF NOT EXISTS miembro_calidad_historial (
  id_historial SERIAL PRIMARY KEY,
  id_miembro INT NOT NULL REFERENCES miembro(id_miembro) ON DELETE CASCADE,
  calidad VARCHAR(1) NOT NULL CHECK (calidad IN ('A', 'S', 'H')),
  fecha_desde DATE NOT NULL,
  fecha_hasta DATE,
  creado_en TIMESTAMP NOT NULL DEFAULT now(),
  CHECK (fecha_hasta IS NULL OR fecha_hasta >= fecha_desde)
);

CREATE INDEX IF NOT EXISTS idx_calidad_historial_miembro_fechas
  ON miembro_calidad_historial (id_miembro, fecha_desde, fecha_hasta);

ALTER TABLE miembro_calidad_historial ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON miembro_calidad_historial TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE miembro_calidad_historial_id_historial_seq TO authenticated;
CREATE POLICY "Miembro ve historial propio, admin ve todos" ON miembro_calidad_historial
  FOR SELECT TO authenticated USING (id_miembro = my_miembro_id() OR is_admin());
CREATE POLICY "Solo admin modifica historial de calidad" ON miembro_calidad_historial
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Inicialización única de miembros existentes. Para miembros cuya calidad
-- cambió antes de aplicar esta migración, corregir fecha_desde manualmente.
INSERT INTO miembro_calidad_historial (id_miembro, calidad, fecha_desde)
SELECT id_miembro, calidad, COALESCE(fecha_ingreso, creado_en::date)
FROM miembro m
WHERE NOT EXISTS (
  SELECT 1 FROM miembro_calidad_historial h WHERE h.id_miembro = m.id_miembro
);

-- Enero no lleva cuota. La cuota de aspirante de 2025 conserva el importe histórico.
INSERT INTO cuotas (descripcion_cuota, monto_cuota, periodo_cuota, fecha_vencimiento, aplica_calidad)
SELECT 'Cuota ' || to_char(mes, 'TMMonth YYYY') || ' - Aspirante',
       20000, to_char(mes, 'TMMonth YYYY'),
       (mes + interval '1 month - 1 day')::date, 'A'
FROM generate_series('2025-02-01'::date, '2025-12-01'::date, interval '1 month') AS mes
WHERE NOT EXISTS (
  SELECT 1 FROM cuotas c
  WHERE c.aplica_calidad = 'A'
    AND date_trunc('month', c.fecha_vencimiento) = mes
);

-- El período actual 2026 mantiene la cuota de aspirante en Gs. 25.000.
-- El filtro evita duplicar los meses ya creados por el SQL inicial.
INSERT INTO cuotas (descripcion_cuota, monto_cuota, periodo_cuota, fecha_vencimiento, aplica_calidad)
SELECT 'Cuota ' || to_char(mes, 'TMMonth YYYY') || ' - Aspirante',
       25000, to_char(mes, 'TMMonth YYYY'),
       (mes + interval '1 month - 1 day')::date, 'A'
FROM generate_series('2026-02-01'::date, '2026-12-01'::date, interval '1 month') AS mes
WHERE NOT EXISTS (
  SELECT 1 FROM cuotas c
  WHERE c.aplica_calidad = 'A'
    AND date_trunc('month', c.fecha_vencimiento) = mes
);
