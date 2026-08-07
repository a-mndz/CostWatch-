import Database from 'better-sqlite3';
import path from 'path';

const isPG = !!process.env.DATABASE_URL;
const DB_PATH = path.join(process.cwd(), 'costwatch.db');
let sqliteDb: Database.Database;

export function getDb(): Database.Database {
  if (isPG) throw new Error('getDb() not available with Postgres — use pg* functions from db-pg.ts');
  return getSqlite();
}

function getSqlite(): Database.Database {
  if (!sqliteDb) {
    sqliteDb = new Database(DB_PATH);
    sqliteDb.pragma('journal_mode = WAL');
    sqliteDb.pragma('foreign_keys = ON');
    initSqliteSchema();
  }
  return sqliteDb;
}

function initSqliteSchema() {
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, name TEXT, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS costs (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER REFERENCES users(id), date TEXT NOT NULL, service TEXT NOT NULL, region TEXT NOT NULL DEFAULT 'unknown', account TEXT NOT NULL DEFAULT 'default', amount REAL NOT NULL, usage_quantity REAL DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), UNIQUE(user_id, date, service, region, account));
    CREATE TABLE IF NOT EXISTS anomalies (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER REFERENCES users(id), date TEXT NOT NULL, service TEXT NOT NULL, region TEXT NOT NULL, dimension_type TEXT NOT NULL DEFAULT 'service', expected REAL NOT NULL, actual REAL NOT NULL, z_score REAL NOT NULL, severity TEXT NOT NULL CHECK(severity IN ('low', 'medium', 'high')), status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'acknowledged', 'resolved')), root_cause TEXT, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS config (user_id INTEGER REFERENCES users(id), key TEXT NOT NULL, value TEXT NOT NULL, updated_at TEXT DEFAULT (datetime('now')), PRIMARY KEY(user_id, key));
    CREATE TABLE IF NOT EXISTS alerts_log (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER REFERENCES users(id), anomaly_id INTEGER REFERENCES anomalies(id), channel TEXT, status TEXT NOT NULL DEFAULT 'sent', sent_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS cloud_accounts (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER REFERENCES users(id), provider TEXT NOT NULL CHECK(provider IN ('aws', 'gcp')), label TEXT NOT NULL, account_id TEXT NOT NULL, role_arn TEXT, external_id TEXT, project_id TEXT, service_account_key TEXT, status TEXT NOT NULL DEFAULT 'connected' CHECK(status IN ('connected', 'error', 'disconnected')), last_sync TEXT, created_at TEXT DEFAULT (datetime('now')));
    CREATE INDEX IF NOT EXISTS idx_costs_date ON costs(date);
    CREATE INDEX IF NOT EXISTS idx_costs_user ON costs(user_id);
    CREATE INDEX IF NOT EXISTS idx_anomalies_date ON anomalies(date);
    CREATE INDEX IF NOT EXISTS idx_anomalies_status ON anomalies(status);
    CREATE INDEX IF NOT EXISTS idx_anomalies_user ON anomalies(user_id);
    CREATE INDEX IF NOT EXISTS idx_cloud_accounts_user ON cloud_accounts(user_id);
  `);
}

// Cost queries — scoped by userId
export function insertCosts(userId: number, rows: Array<{date: string; service: string; region: string; account: string; amount: number; usage_quantity: number}>) {
  if (isPG) throw new Error('Use pgInsertCosts from db-pg.ts');
  const db = getSqlite();
  const insert = db.prepare('INSERT OR REPLACE INTO costs (user_id, date, service, region, account, amount, usage_quantity) VALUES (?, @date, @service, @region, @account, @amount, @usage_quantity)');
  const tx = db.transaction((rows) => { for (const row of rows) insert.run(userId, row); });
  tx(rows);
  return rows.length;
}

export function getCostsByDay(userId: number, days = 30) {
  if (isPG) throw new Error('Use pgGetCostsByDay from db-pg.ts');
  const db = getSqlite();
  return db.prepare(`SELECT date, SUM(amount) as total FROM costs WHERE user_id = ? AND date >= date('now', '-' || ? || ' days') GROUP BY date ORDER BY date`).all(userId, days) as Array<{ date: string; total: number }>;
}

export function getCostsByService(userId: number) {
  if (isPG) throw new Error('Use pgGetCostsByService from db-pg.ts');
  const db = getSqlite();
  return db.prepare(`SELECT service, SUM(amount) as total FROM costs WHERE user_id = ? AND date >= date('now', '-30 days') GROUP BY service ORDER BY total DESC`).all(userId) as Array<{ service: string; total: number }>;
}

export function getCostSummary(userId: number) {
  if (isPG) throw new Error('Use pgGetCostSummary from db-pg.ts');
  const db = getSqlite();
  return db.prepare(`SELECT SUM(amount) as total_spend, COUNT(DISTINCT date) as days, MIN(date) as first_date, MAX(date) as last_date FROM costs WHERE user_id = ? AND date >= date('now', '-30 days')`).get(userId);
}

// Anomaly queries — scoped by userId
export function insertAnomaly(userId: number, a: { date: string; service: string; region: string; expected: number; actual: number; z_score: number; severity: string; root_cause?: string }) {
  if (isPG) throw new Error('Use pgInsertAnomaly from db-pg.ts');
  const db = getSqlite();
  return db.prepare(`INSERT INTO anomalies (user_id, date, service, region, dimension_type, expected, actual, z_score, severity, root_cause) VALUES (?, @date, @service, @region, 'service', @expected, @actual, @z_score, @severity, @root_cause)`).run(userId, a);
}

export function getAnomalies(userId: number, status?: string) {
  if (isPG) throw new Error('Use pgGetAnomalies from db-pg.ts');
  const db = getSqlite();
  if (status) return db.prepare('SELECT * FROM anomalies WHERE user_id = ? AND status = ? ORDER BY date DESC').all(userId, status);
  return db.prepare('SELECT * FROM anomalies WHERE user_id = ? ORDER BY date DESC').all(userId);
}

export function getOpenAnomalyCount(userId: number) {
  if (isPG) throw new Error('Use pgGetOpenAnomalyCount from db-pg.ts');
  const db = getSqlite();
  return (db.prepare("SELECT COUNT(*) as count FROM anomalies WHERE user_id = ? AND status = 'open'").get(userId) as { count: number }).count;
}

export function updateAnomalyStatus(userId: number, id: number, status: string) {
  if (isPG) throw new Error('Use pgUpdateAnomalyStatus from db-pg.ts');
  const db = getSqlite();
  return db.prepare('UPDATE anomalies SET status = ? WHERE id = ? AND user_id = ?').run(status, id, userId);
}

// Alert log — scoped by userId
export function logAlert(userId: number, anomalyId: number, channel: string) {
  if (isPG) throw new Error('Use pgLogAlert from db-pg.ts');
  const db = getSqlite();
  return db.prepare('INSERT INTO alerts_log (user_id, anomaly_id, channel) VALUES (?, ?, ?)').run(userId, anomalyId, channel);
}

export function getAlertHistory(userId: number) {
  if (isPG) throw new Error('Use pgGetAlertHistory from db-pg.ts');
  const db = getSqlite();
  return db.prepare(`SELECT a.*, al.channel, al.sent_at, al.status as delivery_status FROM alerts_log al JOIN anomalies a ON a.id = al.anomaly_id WHERE al.user_id = ? ORDER BY al.sent_at DESC`).all(userId);
}

// Config — scoped by userId
export function getConfig(userId: number, key: string) {
  if (isPG) throw new Error('Use pgGetConfig from db-pg.ts');
  const db = getSqlite();
  return (db.prepare('SELECT value FROM config WHERE user_id = ? AND key = ?').get(userId, key) as { value: string } | undefined)?.value;
}

export function setConfig(userId: number, key: string, value: string) {
  if (isPG) throw new Error('Use pgSetConfig from db-pg.ts');
  const db = getSqlite();
  return db.prepare("INSERT OR REPLACE INTO config (user_id, key, value, updated_at) VALUES (?, ?, ?, datetime('now'))").run(userId, key, value);
}

// Cloud accounts — scoped by userId
export function getCloudAccounts(userId: number) {
  if (isPG) throw new Error('Use pgGetCloudAccounts from db-pg.ts');
  const db = getSqlite();
  return db.prepare('SELECT * FROM cloud_accounts WHERE user_id = ? ORDER BY created_at DESC').all(userId);
}

export function addCloudAccount(userId: number, a: { provider: string; label: string; account_id: string; role_arn?: string; external_id?: string; project_id?: string; service_account_key?: string }) {
  if (isPG) throw new Error('Use pgAddCloudAccount from db-pg.ts');
  const db = getSqlite();
  return db.prepare(`INSERT INTO cloud_accounts (user_id, provider, label, account_id, role_arn, external_id, project_id, service_account_key) VALUES (?, @provider, @label, @account_id, @role_arn, @external_id, @project_id, @service_account_key)`).run(userId, a);
}

export function removeCloudAccount(userId: number, id: number) {
  if (isPG) throw new Error('Use pgRemoveCloudAccount from db-pg.ts');
  const db = getSqlite();
  return db.prepare('DELETE FROM cloud_accounts WHERE id = ? AND user_id = ?').run(id, userId);
}

export function updateCloudAccountSync(userId: number, id: number) {
  if (isPG) throw new Error('Use pgUpdateCloudAccountSync from db-pg.ts');
  const db = getSqlite();
  return db.prepare("UPDATE cloud_accounts SET last_sync = datetime('now') WHERE id = ? AND user_id = ?").run(id, userId);
}

// User queries
export function createUser(email: string, passwordHash: string, name?: string) {
  if (isPG) throw new Error('Use pgCreateUser from db-pg.ts');
  const db = getSqlite();
  return db.prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)').run(email, passwordHash, name);
}

export function getUserByEmail(email: string) {
  if (isPG) throw new Error('Use pgGetUserByEmail from db-pg.ts');
  const db = getSqlite();
  return db.prepare('SELECT id, email, password_hash, name FROM users WHERE email = ?').get(email) as { id: number; email: string; password_hash: string; name: string | null; } | undefined;
}
