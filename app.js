const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

// Cargar dotenv solo en desarrollo (local)
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

// === DEPURACIÓN (puedes eliminar después) ===
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("DATABASE_URL definida?:", !!process.env.DATABASE_URL);
// Muestra los primeros 30 caracteres para depurar (sin mostrar la contraseña completa)
if (process.env.DATABASE_URL) {
  console.log(
    "DATABASE_URL (inicio):",
    process.env.DATABASE_URL.substring(0, 30),
  );
}
// === FIN DEPURACIÓN ===

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Configuración del pool usando connectionString (más simple y robusto)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000, // 10 segundos
});

// Endpoint de prueba
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Hola desde Railway" });
});

// Endpoint que prueba la base de datos
app.get("/api/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() as current_time");
    res.json({ success: true, time: result.rows[0].current_time });
  } catch (error) {
    console.error("Error en db-test:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = app;
