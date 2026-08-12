"use client";

import { createClient } from "@supabase/supabase-js";
import { supabase as supabaseBase } from "./supabase";

// Cliente Auth separado del panel administrativo.
// Así el dueño puede tener su Dashboard abierto y, en otra pestaña,
// probar el Portal del Alumno sin que ambas sesiones se mezclen.

export const supabasePortalAlumno = createClient(
  supabaseBase.supabaseUrl,
  supabaseBase.supabaseKey,
  {
    auth: {
      storageKey: "konax.portal.alumno.auth",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
