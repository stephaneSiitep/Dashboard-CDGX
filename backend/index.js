const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const XLSX = require('xlsx');
const { Pool } = require('pg');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const app = express();
const port = process.env.PORT || 3000;
const host = process.env.HOST || '0.0.0.0';
const JWT_SECRET = process.env.JWT_SECRET || 'cibest_secret_key_change_in_production';

// PostgreSQL connection
const pool = new Pool({
  host: process.env.POSTGRES_HOST || process.env.DB_HOST || 'db',
  port: process.env.POSTGRES_PORT || process.env.DB_PORT || 5432,
  database: process.env.POSTGRES_DB || process.env.DB_NAME || 'cdgxpress',
  user: process.env.POSTGRES_USER || process.env.DB_USER || 'cdgxpress_user',
  password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD || 'password',
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 20,
});

// Middleware
app.use(cors());
app.use(express.json());

// ─── Auth Middleware ──────────────────────────────────────────────────────────

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, error: 'Token manquant' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ success: false, error: 'Token invalide' });
    req.user = user;
    next();
  });
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs' });
  }
  next();
};

// ─── Seed default admin on startup ───────────────────────────────────────────

const seedAdmin = async () => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM users');
    if (parseInt(result.rows[0].count) === 0) {
      const hash = await bcrypt.hash('Admin123!', 10);
      await pool.query(
        `INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4)`,
        ['admin', 'admin@cibest.local', hash, 'admin']
      );
      console.log('✅ Compte admin par défaut créé (admin / Admin123!)');
    }
  } catch (err) {
    console.error('⚠️  Seed admin échoué (table peut-être absente):', err.message);
  }
};

// ─── Auth Routes ─────────────────────────────────────────────────────────────

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Identifiants requis' });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1 AND is_active = true',
      [username]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ success: false, error: 'Identifiants incorrects' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, error: 'Identifiants incorrects' });
    }

    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      success: true,
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, role, created_at, last_login FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ success: false, error: 'Utilisateur introuvable' });
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// ─── Admin: User Management ───────────────────────────────────────────────────

app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, role, is_active, created_at, last_login FROM users ORDER BY created_at DESC'
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

app.post('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  const { username, email, password, role } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ success: false, error: 'Champs requis: username, email, password' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4)
       RETURNING id, username, email, role, is_active, created_at`,
      [username, email, hash, role || 'operator']
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, error: 'Nom d\'utilisateur ou email déjà utilisé' });
    }
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

app.put('/api/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  const { username, email, role, is_active, password } = req.body;

  try {
    let query, params;
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      query = `UPDATE users SET username=$1, email=$2, role=$3, is_active=$4, password_hash=$5
               WHERE id=$6 RETURNING id, username, email, role, is_active, created_at`;
      params = [username, email, role, is_active, hash, id];
    } else {
      query = `UPDATE users SET username=$1, email=$2, role=$3, is_active=$4
               WHERE id=$5 RETURNING id, username, email, role, is_active, created_at`;
      params = [username, email, role, is_active, id];
    }

    const result = await pool.query(query, params);
    if (result.rowCount === 0) return res.status(404).json({ success: false, error: 'Utilisateur introuvable' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, error: 'Nom d\'utilisateur ou email déjà utilisé' });
    }
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  if (id === req.user.id) {
    return res.status(400).json({ success: false, error: 'Impossible de supprimer son propre compte' });
  }

  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1', [id]);
    if (result.rowCount === 0) return res.status(404).json({ success: false, error: 'Utilisateur introuvable' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// ─── Admin: Equipment Import / Export ────────────────────────────────────────

// Download blank template
app.get('/api/admin/equipements/template', authenticateToken, requireAdmin, (req, res) => {
  const rows = [
    { Nom: 'Camera 01', 'Adresse IP': '10.136.115.60', Type: 'Camera', Localisation: 'Entrée principale', Description: 'Caméra PTZ extérieure' },
    { Nom: 'Camera 02', 'Adresse IP': '10.136.115.61', Type: 'Camera', Localisation: 'Parking', Description: '' },
    { Nom: 'Switch Core', 'Adresse IP': '10.136.115.1',  Type: 'Switch', Localisation: 'Salle serveurs', Description: 'Switch principal' },
    { Nom: 'Serveur IA',  'Adresse IP': '10.136.115.100', Type: 'Server', Localisation: 'Datacenter', Description: 'Serveur inference IA' },
  ];
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{ wch: 20 }, { wch: 16 }, { wch: 12 }, { wch: 20 }, { wch: 30 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Equipements');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename="modele_equipements.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

// Export all equipment to Excel
app.get('/api/admin/equipements/export', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT name, ip, type, location, description, active FROM equipements ORDER BY created_at'
    );
    const rows = result.rows.map(e => ({
      Nom: e.name,
      'Adresse IP': e.ip,
      Type: e.type,
      Localisation: e.location || '',
      Description: e.description || '',
      Actif: e.active ? 'oui' : 'non',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 20 }, { wch: 16 }, { wch: 12 }, { wch: 20 }, { wch: 30 }, { wch: 8 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Equipements');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="equipements_export.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// Import equipment from Excel
app.post('/api/admin/equipements/import', authenticateToken, requireAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'Aucun fichier fourni' });
  try {
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws);
    if (rows.length === 0) return res.status(400).json({ success: false, error: 'Fichier vide' });

    let added = 0, skipped = 0, errors = [];

    for (const row of rows) {
      const name = (row['Nom'] || row['name'] || '').toString().trim();
      const ip   = (row['Adresse IP'] || row['ip'] || '').toString().trim();
      const type = (row['Type'] || row['type'] || 'Camera').toString().trim();
      const location    = (row['Localisation'] || row['location'] || '').toString().trim() || null;
      const description = (row['Description'] || row['description'] || '').toString().trim() || null;

      if (!name || !ip) { errors.push(`Ligne ignorée : nom ou IP manquant`); skipped++; continue; }

      try {
        const r = await pool.query(
          `INSERT INTO equipements (name, ip, type, location, description)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (ip) DO NOTHING`,
          [name, ip, type, location, description]
        );
        r.rowCount > 0 ? added++ : (skipped++, errors.push(`${ip} : IP déjà existante, ignorée`));
      } catch (err) {
        errors.push(`${ip} : ${err.message}`);
        skipped++;
      }
    }

    res.json({ success: true, added, skipped, errors });
  } catch {
    res.status(400).json({ success: false, error: 'Fichier Excel invalide ou corrompu' });
  }
});

// ─── Admin: Equipment Management ─────────────────────────────────────────────

app.get('/api/admin/equipements', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM equipements ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

app.post('/api/admin/equipements', authenticateToken, requireAdmin, async (req, res) => {
  const { name, ip, type, location, description } = req.body;
  if (!name || !ip) {
    return res.status(400).json({ success: false, error: 'Champs requis: name, ip' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO equipements (name, ip, type, location, description)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, ip, type || 'Camera', location || null, description || null]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, error: 'Une adresse IP identique existe déjà' });
    }
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

app.put('/api/admin/equipements/:id', authenticateToken, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, ip, type, location, description, active } = req.body;

  try {
    const result = await pool.query(
      `UPDATE equipements SET name=$1, ip=$2, type=$3, location=$4, description=$5, active=$6
       WHERE id=$7 RETURNING *`,
      [name, ip, type, location, description, active, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ success: false, error: 'Équipement introuvable' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, error: 'Une adresse IP identique existe déjà' });
    }
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

app.delete('/api/admin/equipements/:id', authenticateToken, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const result = await pool.query('DELETE FROM equipements WHERE id = $1', [id]);
    if (result.rowCount === 0) return res.status(404).json({ success: false, error: 'Équipement introuvable' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// ─── Public API Routes ────────────────────────────────────────────────────────

app.get('/api/cibest/equipements', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT ON (ip) id, ip, name, reachable, rtt_ms, ttl, timestamp, error
      FROM ping_results
      ORDER BY ip, timestamp DESC;
    `);

    res.json({
      success: true,
      data: result.rows,
      timestamp: new Date().toISOString(),
      total_equipements: result.rowCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'DB query failed' });
  }
});

app.get('/api/cibest/equipements/status', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ip, reachable
      FROM (
        SELECT DISTINCT ON (ip) ip, reachable
        FROM ping_results
        ORDER BY ip, timestamp DESC
      ) latest;
    `);

    const total = result.rows.length;
    const online = result.rows.filter(r => r.reachable === 'true').length;
    const offline = total - online;

    res.json({
      success: true,
      summary: {
        total_equipements: total,
        online,
        offline,
        uptime_percentage: total > 0 ? Math.round((online / total) * 10000) / 100 : 0,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'DB query failed' });
  }
});

app.get('/api/cibest/equipements/:equipementId', async (req, res) => {
  try {
    const id = parseInt(req.params.equipementId);
    const result = await pool.query(
      `SELECT * FROM ping_results WHERE id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: `Equipement with ID ${id} not found` });
    }

    res.json({
      success: true,
      data: result.rows[0],
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'DB query failed' });
  }
});

app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM ping_results;');
    res.json({
      status: 'healthy',
      service: 'Cibest Equipement Monitoring API (Node.js)',
      timestamp: new Date().toISOString(),
      rows_in_db: parseInt(result.rows[0].count, 10),
    });
  } catch (err) {
    res.status(500).json({
      status: 'unhealthy',
      error: 'DB not reachable',
      timestamp: new Date().toISOString(),
    });
  }
});

// ─── DB init ──────────────────────────────────────────────────────────────────

pool.connect(async (err, client, release) => {
  if (err) {
    console.error('❌ Error connecting to database:', err);
  } else {
    console.log('✅ Database connection successful');
    release();
    await seedAdmin();
  }
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client:', err);
});

// ─── Server ───────────────────────────────────────────────────────────────────

const server = app.listen(port, host, () => {
  console.log(`🚀 API server running at http://${host}:${port}`);
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
});

process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    pool.end(() => process.exit(0));
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    pool.end(() => process.exit(0));
  });
});
