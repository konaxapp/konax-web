export const metadata = {
  title: "KONAX",
  description:
    "Plataforma SaaS de gestión comercial, crédito, cobranza, ventas e inventario",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          fontFamily: "Arial, sans-serif",
          background: "#f5f7fb",
        }}
      >
        {children}
      </body>
    </html>
  );
}
