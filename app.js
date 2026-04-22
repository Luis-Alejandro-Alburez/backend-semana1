const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

// Cargar dotenv solo en desarrollo (local)
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

// === DEPURACIÓN ===
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_PORT:", process.env.DB_PORT);
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_DATABASE:", process.env.DB_DATABASE);
console.log("DB_PASSWORD definida:", !!process.env.DB_PASSWORD);
// === FIN DEPURACIÓN ===

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Configuración del pool usando variables separadas
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
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

// Obtener todas las tareas
app.get("/api/tasks", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM tasks ORDER BY created_at DESC",
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Crear una nueva tarea
app.post("/api/tasks", async (req, res) => {
  const { title } = req.body;
  if (!title)
    return res.status(400).json({ error: "El título es obligatorio" });
  try {
    const result = await pool.query(
      "INSERT INTO tasks (title) VALUES ($1) RETURNING *",
      [title],
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Actualizar una tarea (completado o título)
app.put("/api/tasks/:id", async (req, res) => {
  const { id } = req.params;
  const { title, completed } = req.body;
  try {
    let result;
    if (title !== undefined) {
      result = await pool.query(
        "UPDATE tasks SET title = $1 WHERE id = $2 RETURNING *",
        [title, id],
      );
    } else if (completed !== undefined) {
      result = await pool.query(
        "UPDATE tasks SET completed = $1 WHERE id = $2 RETURNING *",
        [completed, id],
      );
    } else {
      return res
        .status(400)
        .json({ error: "No se proporcionaron campos para actualizar" });
    }
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Tarea no encontrada" });
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Eliminar una tarea
app.delete("/api/tasks/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM tasks WHERE id = $1 RETURNING *",
      [id],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Tarea no encontrada" });
    res.json({ message: "Tarea eliminada", task: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = app;
