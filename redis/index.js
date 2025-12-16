const { createClient } = require('redis');
require('dotenv').config();

// Initialize Redis client (RediSearch enabled)
const client = createClient({
    url: process.env.REDIS_URL || 'redis://redis:6379'
});
client.on('error', err => console.error('Redis Client Error', err));
client.connect();

/**
 * Ensure the vector index exists. Call once at startup.
 */
async function ensureIndex() {
    const indexName = process.env.REDIS_VECTOR_INDEX || 'doc_idx';
    try {
        await client.sendCommand(['FT.CREATE', indexName,
            'ON', 'HASH',
            'PREFIX', '1', 'doc:',
            'SCHEMA',
            'content', 'TEXT',
            'embedding', 'VECTOR', 'FLAT', '6', 'TYPE', 'FLOAT32', 'DIM', '1536', 'DISTANCE_METRIC', 'COSINE',
            'INITIAL_CAP', '1000'
        ]);
        console.log('Redis vector index created');
    } catch (e) {
        if (e.message.includes('Index already exists')) {
            console.log('Redis vector index already exists');
        } else {
            console.error('Error creating Redis index:', e);
        }
    }
}

/**
 * Store an embedding vector in Redis.
 * @param {string} id - Unique identifier for the document.
 * @param {Array<number>} vector - Float32 array of embedding values.
 * @param {Object} metadata - Additional fields to store (e.g., title, source).
 */
async function storeEmbedding(id, vector, metadata = {}) {
    const key = `doc:${id}`;
    const flatVector = Buffer.from(new Float32Array(vector).buffer);
    const fields = [
        'content', metadata.content || '',
        'embedding', flatVector
    ];
    await client.hSet(key, fields);
}

/**
 * Search for top‑K similar vectors.
 * @param {Array<number>} queryVector - Embedding of the query text.
 * @param {number} k - Number of results to return.
 * @returns {Promise<Array<Object>>} Array of matching documents.
 */
async function searchTopK(queryVector, k = 5) {
    const indexName = process.env.REDIS_VECTOR_INDEX || 'doc_idx';
    const flatQuery = Buffer.from(new Float32Array(queryVector).buffer);
    const base64Query = flatQuery.toString('base64');
    const result = await client.sendCommand([
        'FT.SEARCH', indexName,
        '*=>[KNN $K @embedding $BLOB]',
        'PARAMS', '2', 'K', k.toString(), 'BLOB', base64Query,
        'SORTBY', '__vector_score', 'ASC',
        'RETURN', '2', 'content', 'embedding',
        'LIMIT', '0', k.toString()
    ]);
    // Result parsing omitted for brevity – in production parse into objects.
    return result;
}

module.exports = { client, ensureIndex, storeEmbedding, searchTopK };
