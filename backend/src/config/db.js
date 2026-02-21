const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

// Database file location
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../data/mfdb.sqlite');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db = null;
let SQL = null;

// Initialize database
async function initDb() {
  if (db) return db;

  SQL = await initSqlJs();

  // Load existing database or create new one
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
    console.log('SQLite database loaded from:', DB_PATH);
  } else {
    db = new SQL.Database();
    console.log('New SQLite database created');
  }

  // Create schema with expanded fields
  db.run(`
    CREATE TABLE IF NOT EXISTS funds (
      scheme_code TEXT PRIMARY KEY,
      scheme_name TEXT NOT NULL,
      scheme_name_unique TEXT,
      amc TEXT,
      amc_code TEXT,
      category TEXT,
      sub_category TEXT,
      plan_name TEXT,
      option_name TEXT,

      -- NAV Info
      current_nav REAL,
      nav_date TEXT,

      -- Fund Details
      aum REAL,
      expense_ratio REAL,
      fund_manager TEXT,
      benchmark TEXT,
      date_of_inception TEXT,

      -- Risk Info
      risk_profile TEXT,
      risk_rating REAL,
      riskometer TEXT,
      vr_rating TEXT,

      -- Investment Info
      min_investment REAL,
      min_sip_investment REAL,
      exit_load_period INTEGER,
      exit_load_rate REAL,
      exit_load_remark TEXT,

      -- Other
      isin TEXT,
      objective TEXT,
      scheme_doc_url TEXT,

      -- Timestamps
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS fund_returns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scheme_code TEXT UNIQUE,
      return_1y REAL,
      return_3y REAL,
      return_5y REAL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_name TEXT NOT NULL,
      sub_category_name TEXT,
      UNIQUE(category_name, sub_category_name)
    )
  `);

  // Create indexes
  try {
    db.run(`CREATE INDEX IF NOT EXISTS idx_funds_scheme_name ON funds(scheme_name)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_funds_category ON funds(category, sub_category)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_funds_amc ON funds(amc)`);
  } catch (e) {
    // Indexes might already exist
  }

  // Save initial database
  saveDb();

  return db;
}

// Save database to file
function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// Get database instance (must call initDb first)
function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return db;
}

// Run a query with parameters (INSERT, UPDATE, DELETE)
function run(sql, params = []) {
  const database = getDb();
  const stmt = database.prepare(sql);
  if (params.length > 0) {
    stmt.bind(params);
  }
  stmt.step();
  stmt.free();
  return { changes: database.getRowsModified() };
}

// Get a single row
function get(sql, params = []) {
  const database = getDb();
  const stmt = database.prepare(sql);
  if (params.length > 0) {
    stmt.bind(params);
  }
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

// Get all rows
function all(sql, params = []) {
  const database = getDb();
  const stmt = database.prepare(sql);
  if (params.length > 0) {
    stmt.bind(params);
  }
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

// For compatibility with existing code
function query(sql, params = []) {
  if (sql.trim().toUpperCase().startsWith('SELECT')) {
    return { rows: all(sql, params) };
  } else {
    return { rows: [], changes: run(sql, params) };
  }
}

module.exports = {
  initDb,
  getDb,
  run,
  get,
  all,
  query,
  saveDb
};
