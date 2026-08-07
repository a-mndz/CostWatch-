import Database from 'better-sqlite3';

let mockDb: Database.Database;

jest.mock('@/lib/db', () => {
  const testDb = new Database(':memory:');
  testDb.pragma('foreign_keys = ON');
  testDb.exec(`
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
  // Create a test user
  testDb.prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)').run('test@test.com', 'hash', 'Test');
  mockDb = testDb;

  const TEST_USER_ID = 1;

  return {
    getDb: () => testDb,
    insertCosts: (userId: number, rows: Array<{date: string; service: string; region: string; account: string; amount: number; usage_quantity: number}>) => {
      const insert = testDb.prepare('INSERT OR REPLACE INTO costs (user_id, date, service, region, account, amount, usage_quantity) VALUES (?, @date, @service, @region, @account, @amount, @usage_quantity)');
      const tx = testDb.transaction((rows: Array<{date: string; service: string; region: string; account: string; amount: number; usage_quantity: number}>) => { for (const row of rows) insert.run(userId, row); });
      tx(rows);
      return rows.length;
    },
    getCostsByDay: (userId: number, days: number) => testDb.prepare(`SELECT date, SUM(amount) as total FROM costs WHERE user_id = ? AND date >= date('now', '-' || ? || ' days') GROUP BY date ORDER BY date`).all(userId, days),
    getCostsByService: (userId: number) => testDb.prepare(`SELECT service, SUM(amount) as total FROM costs WHERE user_id = ? AND date >= date('now', '-30 days') GROUP BY service ORDER BY total DESC`).all(userId),
    getCostSummary: (userId: number) => testDb.prepare(`SELECT SUM(amount) as total_spend, COUNT(DISTINCT date) as days, MIN(date) as first_date, MAX(date) as last_date FROM costs WHERE user_id = ? AND date >= date('now', '-30 days')`).get(userId),
    insertAnomaly: (userId: number, a: {date: string; service: string; region: string; expected: number; actual: number; z_score: number; severity: string; root_cause?: string}) => {
      const stmt = testDb.prepare(`INSERT INTO anomalies (user_id, date, service, region, dimension_type, expected, actual, z_score, severity, root_cause) VALUES (?, ?, ?, ?, 'service', ?, ?, ?, ?, ?)`);
      return stmt.run(userId, a.date, a.service, a.region, a.expected, a.actual, a.z_score, a.severity, a.root_cause ?? null);
    },
    getAnomalies: (userId: number, status?: string) => {
      if (status) return testDb.prepare('SELECT * FROM anomalies WHERE user_id = ? AND status = ? ORDER BY date DESC').all(userId, status);
      return testDb.prepare('SELECT * FROM anomalies WHERE user_id = ? ORDER BY date DESC').all(userId);
    },
    updateAnomalyStatus: (userId: number, id: number, status: string) => testDb.prepare('UPDATE anomalies SET status = ? WHERE id = ? AND user_id = ?').run(status, id, userId),
    getOpenAnomalyCount: (userId: number) => (testDb.prepare("SELECT COUNT(*) as count FROM anomalies WHERE user_id = ? AND status = 'open'").get(userId) as {count: number}).count,
    getConfig: (userId: number, key: string) => (testDb.prepare('SELECT value FROM config WHERE user_id = ? AND key = ?').get(userId, key) as {value: string} | undefined)?.value,
    setConfig: (userId: number, key: string, value: string) => testDb.prepare("INSERT OR REPLACE INTO config (user_id, key, value, updated_at) VALUES (?, ?, ?, datetime('now'))").run(userId, key, value),
    addCloudAccount: (userId: number, a: {provider: string; label: string; account_id: string; role_arn?: string; external_id?: string; project_id?: string; service_account_key?: string}) => {
      return testDb.prepare(`INSERT INTO cloud_accounts (user_id, provider, label, account_id, role_arn, external_id, project_id, service_account_key) VALUES (?, @provider, @label, @account_id, @role_arn, @external_id, @project_id, @service_account_key)`).run(userId, {...a, role_arn: a.role_arn ?? null, external_id: a.external_id ?? null, project_id: a.project_id ?? null, service_account_key: a.service_account_key ?? null});
    },
    getCloudAccounts: (userId: number) => testDb.prepare('SELECT * FROM cloud_accounts WHERE user_id = ? ORDER BY created_at DESC').all(userId),
    removeCloudAccount: (userId: number, id: number) => testDb.prepare('DELETE FROM cloud_accounts WHERE id = ? AND user_id = ?').run(id, userId),
    logAlert: (userId: number, anomalyId: number, channel: string) => testDb.prepare('INSERT INTO alerts_log (user_id, anomaly_id, channel) VALUES (?, ?, ?)').run(userId, anomalyId, channel),
    getAlertHistory: (userId: number) => testDb.prepare(`SELECT a.*, al.channel, al.sent_at, al.status as delivery_status FROM alerts_log al JOIN anomalies a ON a.id = al.anomaly_id WHERE al.user_id = ? ORDER BY al.sent_at DESC`).all(userId),
    _testUserId: TEST_USER_ID,
  };
});

afterEach(() => {
  if (mockDb) {
    mockDb.exec('DELETE FROM alerts_log');
    mockDb.exec('DELETE FROM costs');
    mockDb.exec('DELETE FROM anomalies');
    mockDb.exec('DELETE FROM config');
    mockDb.exec('DELETE FROM cloud_accounts');
  }
});

const today = new Date().toISOString().split('T')[0];
const UID = 1; // test user

import {
  insertCosts, getCostsByDay, getCostsByService, getCostSummary,
  insertAnomaly, getAnomalies, updateAnomalyStatus, getOpenAnomalyCount,
  getConfig, setConfig,
  addCloudAccount, getCloudAccounts, removeCloudAccount,
  logAlert, getAlertHistory,
} from '@/lib/db';

describe('Cost queries', () => {
  it('inserts and retrieves costs', () => {
    insertCosts(UID, [{ date: today, service: 'EC2', region: 'us-east-1', account: 'default', amount: 100, usage_quantity: 1000 }]);
    const costs = getCostsByDay(UID, 30) as any[];
    expect(costs.length).toBeGreaterThan(0);
    expect(costs[0].total).toBe(100);
  });

  it('gets costs by service', () => {
    insertCosts(UID, [
      { date: today, service: 'EC2', region: 'us-east-1', account: 'default', amount: 100, usage_quantity: 0 },
      { date: today, service: 'S3', region: 'us-east-1', account: 'default', amount: 50, usage_quantity: 0 },
    ]);
    const byService = getCostsByService(UID) as any[];
    expect(byService.length).toBe(2);
    expect(byService[0].service).toBe('EC2');
  });

  it('gets cost summary', () => {
    insertCosts(UID, [{ date: today, service: 'EC2', region: 'us-east-1', account: 'default', amount: 100, usage_quantity: 0 }]);
    const summary = getCostSummary(UID) as any;
    expect(summary.total_spend).toBe(100);
  });
});

describe('Anomaly queries', () => {
  it('inserts and retrieves anomalies', () => {
    insertAnomaly(UID, { date: today, service: 'EC2', region: 'us-east-1', expected: 100, actual: 500, z_score: 4.5, severity: 'high' });
    const anomalies = getAnomalies(UID) as any[];
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0].severity).toBe('high');
  });

  it('filters by status', () => {
    insertAnomaly(UID, { date: today, service: 'EC2', region: 'us-east-1', expected: 100, actual: 500, z_score: 4.5, severity: 'high' });
    insertAnomaly(UID, { date: today, service: 'S3', region: 'us-east-1', expected: 50, actual: 200, z_score: 3.0, severity: 'medium' });
    const all = getAnomalies(UID) as any[];
    updateAnomalyStatus(UID, all[0].id, 'acknowledged');
    expect((getAnomalies(UID, 'acknowledged') as any[]).length).toBeGreaterThanOrEqual(1);
    expect((getAnomalies(UID, 'open') as any[])).toHaveLength(1);
  });

  it('counts open anomalies', () => {
    insertAnomaly(UID, { date: today, service: 'EC2', region: 'us-east-1', expected: 100, actual: 500, z_score: 4.5, severity: 'high' });
    expect(getOpenAnomalyCount(UID)).toBe(1);
    const all = getAnomalies(UID) as any[];
    updateAnomalyStatus(UID, all[0].id, 'resolved');
    expect(getOpenAnomalyCount(UID)).toBe(0);
  });
});

describe('Config', () => {
  it('sets and gets config', () => {
    setConfig(UID, 'slack_webhook', 'https://hooks.slack.com/test');
    expect(getConfig(UID, 'slack_webhook')).toBe('https://hooks.slack.com/test');
  });

  it('overwrites existing config', () => {
    setConfig(UID, 'key', 'value1');
    setConfig(UID, 'key', 'value2');
    expect(getConfig(UID, 'key')).toBe('value2');
  });
});

describe('Cloud accounts', () => {
  it('adds and retrieves accounts', () => {
    addCloudAccount(UID, { provider: 'aws', label: 'Prod', account_id: '123456789012', role_arn: 'arn:test' });
    const accounts = getCloudAccounts(UID) as any[];
    expect(accounts).toHaveLength(1);
    expect(accounts[0].provider).toBe('aws');
  });

  it('removes accounts', () => {
    addCloudAccount(UID, { provider: 'gcp', label: 'Dev', account_id: 'proj-123', project_id: 'proj-123' });
    const accounts = getCloudAccounts(UID) as any[];
    removeCloudAccount(UID, accounts[0].id);
    expect(getCloudAccounts(UID)).toHaveLength(0);
  });
});

describe('Alert log', () => {
  it('logs and retrieves alerts', () => {
    mockDb.prepare(`INSERT INTO anomalies (user_id, date, service, region, dimension_type, expected, actual, z_score, severity, root_cause) VALUES (?, ?, ?, ?, 'service', ?, ?, ?, ?, ?)`).run(UID, today, 'EC2', 'us-east-1', 100, 500, 4.5, 'high', null);
    const anomalyId = (mockDb.prepare('SELECT last_insert_rowid() as id').get() as any).id;
    logAlert(UID, anomalyId, '#cost-alerts');
    const history = getAlertHistory(UID) as any[];
    expect(history).toHaveLength(1);
    expect(history[0].channel).toBe('#cost-alerts');
  });
});
