import express from 'express';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Verbindung zu Neon Postgres herstellen
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

app.use(express.json());

// Ein Test-Endpunkt für das Frontend
app.get('/api/message', async (req, res) => {
  try {
    // Ein einfacher Test-Query an die Datenbank
    const result = await pool.query('SELECT NOW()');
    res.json({ 
      message: "Hallo vom Express-Backend!", 
      dbTime: result.rows[0].now 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Datenbank-Verbindungsfehler" });
  }
});

app.listen(port, () => {
  console.log(`Server läuft auf http://localhost:${port}`);
});