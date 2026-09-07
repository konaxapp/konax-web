export async function generateMetadata({ params }) {
  const slug = String(params?.slug || "").trim();

  return {
    title: "Portal del Alumno",
    description: "Portal del Alumno KONAX",
    manifest: `/alumno/${slug}/manifest.webmanifest`,
    icons: {
      icon: "/konax-icon-192-1.png",
      shortcut: "/konax-icon-192-1.png",
      apple: "/konax-icon-192-1.png",
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: "KONAX",
    },
  };
}

export default function PortalAlumnoLayout({ children }) {
  return children;
}
