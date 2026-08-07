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
  // Create test user
  testDb.prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)').run('test@test.com', 'hash', 'Test');
  mockDb = testDb;

  const TEST_USER_ID = 1;

  return {
    getDb: () => testDb,
    insertCosts: (userId: number, rows: Array<{date: string; service: string; region: string; account: string; amount: number; usage_quantity: number}>) => {
      const insert = testDb.prepare('INSERT OR REPLACE INTO costs (user_id, date, service, region, account, amount, usage_quantity) VALUES (?, @date, @service, @region, @account, @amount, @usage_quantity)');
      const tx = testDb.transaction((rows: Array<{date: string; service: string; region: string; account: string; amount: number; usage_quantity: number}>) => {
        for (const row of rows) insert.run(userId, row);
      });
      tx(rows);
      return rows.length;
    },
    getCostsByDay: (userId: number, days: number) => testDb.prepare(`SELECT date, SUM(amount) as total FROM costs WHERE user_id = ? AND date >= date('now', '-' || ? || ' days') GROUP BY date ORDER BY date`).all(userId, days),
    getCostsByService: (userId: number) => testDb.prepare(`SELECT service, SUM(amount) as total FROM costs WHERE user_id = ? AND date >= date('now', '-30 days') GROUP BY service ORDER BY total DESC`).all(userId),
    getCostSummary: (userId: number) => testDb.prepare(`SELECT SUM(amount) as total_spend, COUNT(DISTINCT date) as days, MIN(date) as first_date, MAX(date) as last_date FROM costs WHERE user_id = ? AND date >= date('now', '-30 days')`).get(userId),
    getOpenAnomalyCount: (userId: number) => (testDb.prepare("SELECT COUNT(*) as count FROM anomalies WHERE user_id = ? AND status = 'open'").get(userId) as {count: number}).count,
    getAnomalies: (userId: number) => testDb.prepare('SELECT * FROM anomalies WHERE user_id = ? ORDER BY date DESC').all(userId),
    getConfig: (userId: number, key: string) => (testDb.prepare('SELECT value FROM config WHERE user_id = ? AND key = ?').get(userId, key) as {value: string} | undefined)?.value,
  };
});

afterEach(() => {
  if (mockDb) {
    mockDb.exec('DELETE FROM costs');
    mockDb.exec('DELETE FROM anomalies');
    mockDb.exec('DELETE FROM config');
    mockDb.exec('DELETE FROM alerts_log');
  }
});

const today = new Date().toISOString().split('T')[0];

describe('POST /api/costs', () => {
  it('parses CSV and returns counts', async () => {
    const csv = `date,service,region,account,amount,usageQuantity\n${today},EC2,us-east-1,default,100,1000`;
    const { POST } = await import('@/app/api/costs/route');
    const req = new Request('http://localhost/api/costs', { method: 'POST', body: csv });
    const res = await POST(req as any);
    const data = await res.json();
    expect(data.recordsProcessed).toBe(1);
    expect(data.anomalies).toBeDefined();
  });

  it('returns 400 for empty CSV', async () => {
    const { POST } = await import('@/app/api/costs/route');
    const req = new Request('http://localhost/api/costs', { method: 'POST', body: '' });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });
});

describe('GET /api/costs', () => {
  it('returns cost data structure', async () => {
    const { GET } = await import('@/app/api/costs/route');
    const req = new Request('http://localhost/api/costs');
    const res = await GET(req as any);
    const data = await res.json();
    expect(data).toHaveProperty('daily');
    expect(data).toHaveProperty('byService');
    expect(data).toHaveProperty('summary');
  });
});
