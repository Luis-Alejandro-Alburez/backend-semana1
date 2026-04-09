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
console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_PORT:", process.env.DB_PORT);
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_DATABASE:", process.env.DB_DATABASE);
// No imprimir la contraseña por seguridad, pero puedes verificar si existe:
console.log("DB_PASSWORD definida:", !!process.env.DB_PASSWORD);
// === FIN DEPURACIÓN ===

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Configuración del pool usando variables separadas
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000, // opcional, 10 segundos
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
