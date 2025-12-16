const { Worker, Queue } = require('bullmq');
const { Client } = require('pg');
const fetch = require('node-fetch');
require('dotenv').config();

// Initialize Redis connection for BullMQ
const connection = { host: process.env.REDIS_HOST || 'redis', port: 6379 };

// Initialize Postgres client for debt queries
const pgClient = new Client({
    connectionString: process.env.POSTGRES_URL || 'postgres://user:password@postgres:5432/chatbot'
});
pgClient.connect();

// Helper to detect intent (simple keyword based)
function detectIntent(text) {
    const lowered = text.toLowerCase();
    if (lowered.includes('deuda')) return 'debt_query';
    if (lowered.includes('hablar') && lowered.includes('asesor')) return 'human_escalation';
    return 'general_query';
}

// Worker to process messages
const worker = new Worker('processMessage', async job => {
    const { jid, text, timestamp } = job.data;
    const intent = detectIntent(text);

    if (intent === 'debt_query') {
        // Simple query example; adjust table/column names as needed
        const res = await pgClient.query('SELECT amount, due_date FROM debts WHERE user_id = $1', [jid]);
        const row = res.rows[0];
        const reply = row ? `Su deuda es $${row.amount}, con vencimiento ${row.due_date.toDateString()}` : 'No se encontró información de deuda.';
        await sendWhatsAppMessage(jid, reply);
        return;
    }

    if (intent === 'human_escalation') {
        // Enqueue email job
        const emailQueue = new Queue('emailQueue', { connection });
        await emailQueue.add('sendEmail', { jid, text, timestamp });
        await sendWhatsAppMessage(jid, 'Se ha enviado su solicitud a un asesor humano.');
        return;
    }

    // General RAG query
    const embedding = await getEmbedding(text);
    const topK = await searchVector(embedding, 5);
    const prompt = buildPrompt(topK, text);
    const answer = await callLLM(prompt);
    await sendWhatsAppMessage(jid, answer);
}, { connection });

// Helper to send WhatsApp messages via Baileys (placeholder – actual implementation via bot service API)
async function sendWhatsAppMessage(jid, message) {
    // In a real setup, you would call an internal API or use a shared client.
    // Here we just log for demonstration.
    console.log(`Sending to ${jid}: ${message}`);
}

// Placeholder functions for embeddings and vector search
async function getEmbedding(text) {
    const resp = await fetch('https://api.deepseek.com/v1/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}` },
        body: JSON.stringify({ input: text })
    });
    const data = await resp.json();
    return data.data[0].embedding;
}

async function searchVector(embedding, k) {
    // Assume a Redis module with FT.SEARCH; using a simple placeholder HTTP call to a mock endpoint.
    // Replace with actual RediSearch query in production.
    return [];
}

function buildPrompt(frags, userText) {
    const fragments = frags.map(f => f.text).join('\n');
    return `Usa SOLO la información a continuación para responder la pregunta.\n${fragments}\nPregunta: ${userText}`;
}

async function callLLM(prompt) {
    const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}` },
        body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'user', content: prompt }] })
    });
    const data = await resp.json();
    return data.choices[0].message.content.trim();
}

worker.on('completed', job => console.log(`Job ${job.id} completed`));
worker.on('failed', (job, err) => console.error(`Job ${job.id} failed:`, err));
