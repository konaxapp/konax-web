import KonaxMobileNav from "../components/KonaxMobileNav";

export const metadata = {
  title: {
    default: "KONAX",
    template: "%s | KONAX",
  },
  description:
    "Plataforma de gestión para negocios: agenda, clientes, caja, gastos, membresías, pedidos y reportes.",
  applicationName: "KONAX",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/konax-logo.png",
    shortcut: "/konax-logo.png",
    apple: "/konax-logo.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "KONAX",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#083B2A",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          width: "100%",
          minHeight: "100vh",
          overflowX: "hidden",
          fontFamily: "Arial, sans-serif",
          background: "#f5f7fb",
        }}
      >
        <KonaxMobileNav />
        {children}
      </body>
    </html>
  );
}
