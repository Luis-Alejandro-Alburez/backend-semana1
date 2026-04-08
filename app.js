const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { Pool } = require("pg");

dotenv.config();

// === DEPURACIÓN ===
console.log("DATABASE_URL:", process.env.DATABASE_URL);
console.log("Todas las variables de entorno:", Object.keys(process.env));
// === FIN DEPURACIÓN ===

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Hola desde Railway" });
});

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
