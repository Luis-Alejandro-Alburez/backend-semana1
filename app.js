const dns = require("dns");
dns.setDefaultResultOrder("ipv4first"); // 🔑 Fuerza IPv4

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { Pool } = require("pg");

dotenv.config();

//console.log("DATABASE_URL:", process.env.DATABASE_URL); // Verifica que se cargue bien

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Configuración del pool con timeout y SSL
/* const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000, // 10 segundos de espera
}); */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
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
