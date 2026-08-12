import { redirect } from "next/navigation";

// KONAX · Enlace público corto por negocio
// Ejemplo:
// https://konax.net/fitness-507
// redirige internamente a:
// /alumno/fitness-507

export default function PortalCortoNegocioPage({ params }) {
  const slug = String(params?.slug || "").trim();

  if (!slug) {
    redirect("/login");
  }

  redirect(`/alumno/${encodeURIComponent(slug)}`);
}
