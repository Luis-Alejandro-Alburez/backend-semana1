const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const jwt = require("jsonwebtoken");

// Cargar dotenv solo en desarrollo (local)
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

// === DEPURACIÓN ===
// console.log("NODE_ENV:", process.env.NODE_ENV);
// console.log("DB_HOST:", process.env.DB_HOST);
// console.log("DB_PORT:", process.env.DB_PORT);
// console.log("DB_USER:", process.env.DB_USER);
// console.log("DB_DATABASE:", process.env.DB_DATABASE);
// console.log("DB_PASSWORD definida:", !!process.env.DB_PASSWORD);
// === FIN DEPURACIÓN ===

const app = express();
const port = process.env.PORT || 3000;

// ------------------------------
// Configuración de CORS (permitir credenciales y orígenes específicos)
// ------------------------------
const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:5173",
  "https://frontend-semana1.vercel.app",
];
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);
app.use(express.json());

// ------------------------------
// Configuración de sesión (necesaria para OAuth)
// ------------------------------
app.use(
  session({
    secret: process.env.JWT_SECRET || "un_secreto_temporal",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === "production" }, // true solo en HTTPS
  }),
);

// Inicializar Passport
app.use(passport.initialize());
app.use(passport.session());

// Serialización/deserialización (guardamos solo el correo y nombre)
passport.serializeUser((user, done) =>
  done(null, { email: user.email, name: user.name }),
);
passport.deserializeUser((obj, done) => done(null, obj));

// ------------------------------
// Estrategia de Google OAuth
// ------------------------------
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.RENDER_EXTERNAL_URL || "http://localhost:3000"}/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      const email = profile.emails[0].value;
      const allowedEmails = process.env.ALLOWED_EMAILS
        ? process.env.ALLOWED_EMAILS.split(",")
        : [];

      if (!allowedEmails.includes(email)) {
        return done(null, false, { message: "Correo no autorizado" });
      }

      const user = {
        id: profile.id,
        name: profile.displayName,
        email: email,
      };
      return done(null, user);
    },
  ),
);

// ------------------------------
// Endpoints de autenticación
// ------------------------------
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login-failed",
    session: false,
  }),
  (req, res) => {
    // Éxito: generar JWT y redirigir al frontend con el token
    const token = jwt.sign(
      { id: req.user.id, email: req.user.email, name: req.user.name },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    res.redirect(`${frontendUrl}?token=${token}`);
  },
);

app.get("/login-failed", (req, res) => {
  res.send("Acceso denegado: tu correo no está autorizado.");
});

// ------------------------------
// Middleware para verificar JWT en rutas protegidas
// ------------------------------
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No token provided" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

// ------------------------------
// Configuración del pool de base de datos
// ------------------------------
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

// ------------------------------
// Endpoints públicos (no requieren token)
// ------------------------------
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

// ------------------------------
// Rutas protegidas (requieren token)
// ------------------------------
app.use("/api/tasks", verifyToken);

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
