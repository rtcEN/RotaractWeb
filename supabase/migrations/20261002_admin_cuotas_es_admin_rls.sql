-- Mantiene las acciones administrativas limitadas a miembros con es_admin = true.
-- Esto alinea RLS con el indicador que utiliza el panel React.

CREATE OR REPLACE FUNCTION public.miembro_es_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.miembro m
    WHERE m.user_id = auth.uid()
      AND m.es_admin IS TRUE
  );
$$;

REVOKE ALL ON FUNCTION public.miembro_es_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.miembro_es_admin() TO authenticated;

-- Historial: los miembros conservan las políticas de lectura propias ya existentes;
-- las operaciones administrativas se autorizan con el mismo rol que muestra el panel.
DROP POLICY IF EXISTS "Panel admin gestiona historial de calidad" ON public.miembro_calidad_historial;
CREATE POLICY "Panel admin gestiona historial de calidad"
  ON public.miembro_calidad_historial
  FOR ALL TO authenticated
  USING (public.miembro_es_admin())
  WITH CHECK (public.miembro_es_admin());

-- Cuotas individuales: permite al administrador generar y registrar pagos.
DROP POLICY IF EXISTS "Panel admin gestiona cuotas individuales" ON public.miembro_cuota;
CREATE POLICY "Panel admin gestiona cuotas individuales"
  ON public.miembro_cuota
  FOR ALL TO authenticated
  USING (public.miembro_es_admin())
  WITH CHECK (public.miembro_es_admin());

-- Tesorería necesita consultar los miembros asociados a las cuotas del período.
DROP POLICY IF EXISTS "Panel admin consulta miembros" ON public.miembro;
CREATE POLICY "Panel admin consulta miembros"
  ON public.miembro
  FOR SELECT TO authenticated
  USING (public.miembro_es_admin());
