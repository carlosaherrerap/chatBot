require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

// PostgreSQL connection pool
const pool = new Pool({
    connectionString: process.env.POSTGRES_URL || `postgres://user:password@postgres:5432/${process.env.POSTGRES_DB}`
});

// Endpoint: get debts for a user
app.get('/api/debts/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const result = await pool.query('SELECT amount, due_date FROM debts WHERE user_id = $1', [userId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al consultar deudas' });
    }
});

// Endpoint: get recent conversations (paginated)
app.get('/api/conversations', async (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    try {
        const result = await pool.query('SELECT direction, message, timestamp FROM conversations ORDER BY timestamp DESC LIMIT $1 OFFSET $2', [limit, offset]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener conversaciones' });
    }
});

// Endpoint: get embeddings (debug)
app.get('/api/embeddings', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, doc_id, content FROM embeddings LIMIT 100');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener embeddings' });
    }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API listening on port ${PORT}`));
