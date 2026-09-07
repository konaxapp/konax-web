export async function GET(request, { params }) {
  const slug = String(params?.slug || "").trim();

  const manifest = {
    id: `/alumno/${slug}`,
    name: "KONAX - Portal del Alumno",
    short_name: "KONAX",
    description: "Portal del Alumno KONAX",
    start_url: `/alumno/${slug}`,
    scope: `/alumno/${slug}/`,
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#083B2A",
    orientation: "portrait",
    icons: [
      {
        src: "/konax-icon-192-1.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/konax-icon-512-1.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
  };

  return new Response(JSON.stringify(manifest), {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=300",
    },
  });
}
