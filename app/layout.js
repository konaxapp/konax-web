import SubscriptionGuard from "./components/SubscriptionGuard";

export const metadata = {
  title: "Konax",
  description: "Plataforma SaaS de gestión comercial, crédito y cobranza",
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
        <SubscriptionGuard>{children}</SubscriptionGuard>
      </body>
    </html>
  );
}
