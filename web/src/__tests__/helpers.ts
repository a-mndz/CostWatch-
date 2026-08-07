import Database from 'better-sqlite3';

export function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS costs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      service TEXT NOT NULL,
      region TEXT NOT NULL DEFAULT 'unknown',
      account TEXT NOT NULL DEFAULT 'default',
      amount REAL NOT NULL,
      usage_quantity REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(date, service, region, account)
    );

    CREATE TABLE IF NOT EXISTS anomalies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      service TEXT NOT NULL,
      region TEXT NOT NULL,
      dimension_type TEXT NOT NULL DEFAULT 'service',
      expected REAL NOT NULL,
      actual REAL NOT NULL,
      z_score REAL NOT NULL,
      severity TEXT NOT NULL CHECK(severity IN ('low', 'medium', 'high')),
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'acknowledged', 'resolved')),
      root_cause TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS alerts_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      anomaly_id INTEGER REFERENCES anomalies(id),
      channel TEXT,
      status TEXT NOT NULL DEFAULT 'sent',
      sent_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cloud_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT NOT NULL CHECK(provider IN ('aws', 'gcp')),
      label TEXT NOT NULL,
      account_id TEXT NOT NULL,
      role_arn TEXT,
      external_id TEXT,
      project_id TEXT,
      service_account_key TEXT,
      status TEXT NOT NULL DEFAULT 'connected' CHECK(status IN ('connected', 'error', 'disconnected')),
      last_sync TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_costs_date ON costs(date);
    CREATE INDEX IF NOT EXISTS idx_costs_service ON costs(service);
    CREATE INDEX IF NOT EXISTS idx_anomalies_date ON anomalies(date);
    CREATE INDEX IF NOT EXISTS idx_anomalies_status ON anomalies(status);
  `);

  return db;
}
