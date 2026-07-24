"use client";

import { useRouter } from "next/navigation";

export default function CargaCarteraPage() {
  const router = useRouter();

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "40px",
        background: "#f3f6f4",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          padding: "30px",
          background: "#ffffff",
          borderRadius: "20px",
          border: "1px solid #dfe7e2",
        }}
      >
        <h1>Carga de cartera</h1>

        <p>
          Aquí se cargará el archivo Excel o CSV con los clientes y cuentas existentes.
        </p>

        <button
          type="button"
          onClick={() => router.push("/clientes")}
          style={{
            padding: "12px 18px",
            border: "none",
            borderRadius: "10px",
            background: "#16834f",
            color: "#ffffff",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          Volver a Clientes
        </button>
      </div>
    </main>
  );
}
