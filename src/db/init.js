const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config();

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../mon_enfant.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Table des parents (comptes utilisateurs)
db.exec(`
  CREATE TABLE IF NOT EXISTS parents (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    nom TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

// Table des enfants (profils suivis, rattachés à un parent)
db.exec(`
  CREATE TABLE IF NOT EXISTS children (
    id TEXT PRIMARY KEY,
    parent_id TEXT NOT NULL,
    nom TEXT NOT NULL,
    code_appareil TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE CASCADE
  )
`);

// Table des positions GPS envoyées par le téléphone de l'enfant
db.exec(`
  CREATE TABLE IF NOT EXISTS positions (
    id TEXT PRIMARY KEY,
    child_id TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    accuracy REAL,
    battery_level REAL,
    recorded_at TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
  )
`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_positions_child_time ON positions(child_id, recorded_at)`);

// Table des zones de sécurité (geofencing)
db.exec(`
  CREATE TABLE IF NOT EXISTS zones (
    id TEXT PRIMARY KEY,
    child_id TEXT NOT NULL,
    nom TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    rayon_metres REAL NOT NULL,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
  )
`);

// Table de l'état courant (dans/hors zone) pour détecter les transitions
db.exec(`
  CREATE TABLE IF NOT EXISTS zone_states (
    zone_id TEXT NOT NULL,
    child_id TEXT NOT NULL,
    is_inside INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (zone_id, child_id)
  )
`);

// Table des alertes générées (entrée/sortie de zone, batterie faible, etc.)
db.exec(`
  CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    child_id TEXT NOT NULL,
    zone_id TEXT,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
    FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE SET NULL
  )
`);

module.exports = db;
