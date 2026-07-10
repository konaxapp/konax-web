"use client";

import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    window.location.replace("/login");
  }, []);

  return (
    <div style={pagina}>
      <div style={card}>
        <img
          src="/konax-logo.png"
          alt="KONAX"
          style={logo}
        />

        <h1 style={titulo}>KONAX</h1>

        <p style={texto}>
          Abriendo el inicio de sesión...
        </p>
      </div>
    </div>
  );
}

const pagina = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "20px",
  background:
    "radial-gradient(circle at top, #12345c 0%, #07111f 48%, #020617 100%)",
  fontFamily: "Arial, sans-serif",
};

const card = {
  width: "100%",
  maxWidth: "380px",
  padding: "34px",
  borderRadius: "24px",
  textAlign: "center",
  background: "rgba(15, 23, 42, 0.92)",
  border: "1px solid rgba(34, 211, 238, 0.35)",
  boxShadow:
    "0 24px 70px rgba(0, 0, 0, 0.45)",
};

const logo = {
  width: "95px",
  maxWidth: "100%",
  height: "auto",
  marginBottom: "14px",
  padding: "7px",
  borderRadius: "14px",
  background: "#ffffff",
};

const titulo = {
  margin: "0 0 10px",
  color: "#ffffff",
  fontSize: "34px",
  letterSpacing: "2px",
};

const texto = {
  margin: 0,
  color: "#67e8f9",
  fontSize: "15px",
  fontWeight: "bold",
};
