import KonaxMobileNav from "../components/KonaxMobileNav";

export const metadata = {
  title: "KONAX",
  description:
    "Plataforma SaaS de gestión comercial, crédito, cobranza, ventas e inventario",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
