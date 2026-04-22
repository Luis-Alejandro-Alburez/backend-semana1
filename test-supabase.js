// test-supabase.js
const { Pool } = require("pg");

// Reemplaza esta URL con tu cadena de conexión completa de Supabase
const DATABASE_URL =
  //"postgresql://postgres:MiNuevaPass123@db.sichvnyvbtapddtjnsop.supabase.co:5432/postgres?sslmode=require"
  "postgresql://neondb_owner:npg_KSoyU8CsT0Be@ep-young-smoke-aj03kkpm.c-3.us-east-2.aws.neon.tech/neondb?sslmode=require";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

pool.query("SELECT NOW() as current_time", (err, res) => {
  if (err) {
    console.error("❌ Error de conexión:", err.message);
  } else {
    console.log("✅ Conexión exitosa!");
    console.log("Hora actual en la base de datos:", res.rows[0].current_time);
  }
  pool.end();
});
