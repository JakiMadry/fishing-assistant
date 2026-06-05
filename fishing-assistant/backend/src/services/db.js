const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/fishing.db');

let db;

function getDb() {
  if (!db) {
    const fs = require('fs');
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    migrate(db);
  }
  return db;
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_spots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      type TEXT DEFAULT 'nieznane',
      description TEXT,
      species TEXT,        -- JSON array
      techniques TEXT,     -- JSON array
      difficulty TEXT,
      isPublic INTEGER DEFAULT 1,
      createdAt TEXT DEFAULT (datetime('now')),
      userId TEXT
    );

    CREATE TABLE IF NOT EXISTS spot_catches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      spotId INTEGER,
      species TEXT NOT NULL,
      weight REAL,
      length REAL,
      bait TEXT,
      technique TEXT,
      pressure REAL,
      temperature REAL,
      moonPhase REAL,
      catchDate TEXT,
      note TEXT,
      FOREIGN KEY(spotId) REFERENCES user_spots(id)
    );

    CREATE TABLE IF NOT EXISTS push_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT UNIQUE NOT NULL,
      createdAt TEXT DEFAULT (datetime('now'))
    );
  `);
}

// User spots CRUD
const spotsDb = {
  getAll() {
    return getDb().prepare('SELECT * FROM user_spots WHERE isPublic = 1 ORDER BY createdAt DESC').all()
      .map(parseSpotFromDb);
  },

  getById(id) {
    const spot = getDb().prepare('SELECT * FROM user_spots WHERE id = ?').get(id);
    return spot ? parseSpotFromDb(spot) : null;
  },

  getNearby(lat, lng, radiusKm = 50) {
    // SQLite nie ma funkcji geo, filtrujemy przybliżonym bounding boxem
    const delta = radiusKm / 111;
    return getDb().prepare(`
      SELECT * FROM user_spots
      WHERE lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?
      AND isPublic = 1
    `).all(lat - delta, lat + delta, lng - delta, lng + delta).map(parseSpotFromDb);
  },

  create(spot) {
    const stmt = getDb().prepare(`
      INSERT INTO user_spots (name, lat, lng, type, description, species, techniques, difficulty, isPublic, userId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      spot.name, spot.lat, spot.lng, spot.type || 'nieznane',
      spot.description || null,
      JSON.stringify(spot.species || []),
      JSON.stringify(spot.techniques || []),
      spot.difficulty || null,
      spot.isPublic !== false ? 1 : 0,
      spot.userId || null
    );
    return spotsDb.getById(result.lastInsertRowid);
  },

  addCatch(spotId, catchData) {
    return getDb().prepare(`
      INSERT INTO spot_catches (spotId, species, weight, length, bait, technique, pressure, temperature, moonPhase, catchDate, note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      spotId, catchData.species, catchData.weight, catchData.length,
      catchData.bait, catchData.technique, catchData.pressure,
      catchData.temperature, catchData.moonPhase,
      catchData.catchDate || new Date().toISOString(), catchData.note
    );
  },

  getCatches(spotId) {
    return getDb().prepare('SELECT * FROM spot_catches WHERE spotId = ? ORDER BY catchDate DESC').all(spotId);
  }
};

function parseSpotFromDb(row) {
  return {
    ...row,
    species: tryParse(row.species, []),
    techniques: tryParse(row.techniques, [])
  };
}

function tryParse(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

// Push tokens
const tokensDb = {
  save(token) {
    getDb().prepare('INSERT OR IGNORE INTO push_tokens (token) VALUES (?)').run(token);
  },
  getAll() {
    return getDb().prepare('SELECT token FROM push_tokens').all().map(r => r.token);
  }
};

module.exports = { spotsDb, tokensDb };
