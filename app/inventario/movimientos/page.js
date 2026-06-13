"use client";

export default function MovimientosInventario() {
  return (
    <div style={{ padding: "30px" }}>
      <h1>📦 Movimientos de Inventario</h1>

      <div
        style={{
          background: "#fff",
          padding: "20px",
          borderRadius: "10px",
          marginTop: "20px",
        }}
      >
        <h3>Nuevo Movimiento</h3>

        <div style={{ marginBottom: "15px" }}>
          <label>Producto</label>
          <select style={{ width: "100%", padding: "10px" }}>
            <option>Seleccione producto</option>
          </select>
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label>Tipo Movimiento</label>
          <select style={{ width: "100%", padding: "10px" }}>
            <option>Entrada</option>
            <option>Salida</option>
            <option>Ajuste</option>
          </select>
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label>Cantidad</label>
          <input
            type="number"
            style={{ width: "100%", padding: "10px" }}
          />
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label>Observación</label>
          <textarea
            style={{
              width: "100%",
              padding: "10px",
              minHeight: "80px",
            }}
          />
        </div>

        <button
          style={{
            background: "#16a34a",
            color: "#fff",
            border: "none",
            padding: "12px 20px",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Guardar Movimiento
        </button>
      </div>

      <div
        style={{
          marginTop: "30px",
          background: "#fff",
          padding: "20px",
          borderRadius: "10px",
        }}
      >
        <h3>Historial</h3>

        <table width="100%">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Producto</th>
              <th>Tipo</th>
              <th>Cantidad</th>
              <th>Stock Antes</th>
              <th>Stock Después</th>
            </tr>
          </thead>
        </table>
      </div>
    </div>
  );
}
