CREATE TABLE IF NOT EXISTS ping_results (
    id SERIAL PRIMARY KEY,
    ip VARCHAR(15) NOT NULL,
    name VARCHAR(100),
    reachable VARCHAR(100),
    rtt_ms REAL,
    ttl INTEGER,
    timestamp TIMESTAMP NOT NULL,
    error TEXT
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'operator',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP
);

CREATE TABLE IF NOT EXISTS equipements (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    ip VARCHAR(15) NOT NULL UNIQUE,
    type VARCHAR(50) DEFAULT 'Camera',
    location VARCHAR(100),
    description TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Sync initial equipment from ping history on first install
INSERT INTO equipements (name, ip)
SELECT DISTINCT ON (ip) name, ip
FROM ping_results
ORDER BY ip, timestamp DESC
ON CONFLICT (ip) DO NOTHING;
