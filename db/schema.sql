-- Schema for InformaPerubots database

-- Table to store user debts
CREATE TABLE IF NOT EXISTS debts (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    due_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table to store conversation logs (read‑only for UI)
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    direction VARCHAR(10) NOT NULL, -- inbound / outbound
    message TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    metadata JSONB
);

-- Table for storing vector embeddings (optional)
CREATE TABLE IF NOT EXISTS embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_id UUID NOT NULL,
    embedding BYTEA NOT NULL,
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
