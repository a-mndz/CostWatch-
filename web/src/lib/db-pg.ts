import postgres from 'postgres';

let sql: postgres.Sql;

export function getPG(): postgres.Sql {
  if (!sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL not set');
    sql = postgres(url);
  }
  return sql;
}

export async function initPGSchema() {
  const sql = getPG();
  await sql`
    CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, name TEXT, created_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS costs (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), date TEXT NOT NULL, service TEXT NOT NULL, region TEXT NOT NULL DEFAULT 'unknown', account TEXT NOT NULL DEFAULT 'default', amount REAL NOT NULL, usage_quantity REAL DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(user_id, date, service, region, account));
    CREATE TABLE IF NOT EXISTS anomalies (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), date TEXT NOT NULL, service TEXT NOT NULL, region TEXT NOT NULL, dimension_type TEXT NOT NULL DEFAULT 'service', expected REAL NOT NULL, actual REAL NOT NULL, z_score REAL NOT NULL, severity TEXT NOT NULL CHECK(severity IN ('low', 'medium', 'high')), status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'acknowledged', 'resolved')), root_cause TEXT, created_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS config (user_id INTEGER REFERENCES users(id), key TEXT NOT NULL, value TEXT NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW(), PRIMARY KEY(user_id, key));
    CREATE TABLE IF NOT EXISTS alerts_log (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), anomaly_id INTEGER REFERENCES anomalies(id), channel TEXT, status TEXT NOT NULL DEFAULT 'sent', sent_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS cloud_accounts (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), provider TEXT NOT NULL CHECK(provider IN ('aws', 'gcp')), label TEXT NOT NULL, account_id TEXT NOT NULL, role_arn TEXT, external_id TEXT, project_id TEXT, service_account_key TEXT, status TEXT NOT NULL DEFAULT 'connected' CHECK(status IN ('connected', 'error', 'disconnected')), last_sync TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW());
    CREATE INDEX IF NOT EXISTS idx_costs_date ON costs(date);
    CREATE INDEX IF NOT EXISTS idx_costs_user ON costs(user_id);
    CREATE INDEX IF NOT EXISTS idx_anomalies_date ON anomalies(date);
    CREATE INDEX IF NOT EXISTS idx_anomalies_status ON anomalies(status);
    CREATE INDEX IF NOT EXISTS idx_anomalies_user ON anomalies(user_id);
    CREATE INDEX IF NOT EXISTS idx_cloud_accounts_user ON cloud_accounts(user_id);
  `;
}

export function pgInsertCosts(userId: number, rows: Array<{date: string; service: string; region: string; account: string; amount: number; usage_quantity: number}>) {
  const sql = getPG();
  return sql`INSERT INTO costs (user_id, date, service, region, account, amount, usage_quantity) VALUES ${sql(rows.map(r => [userId, r.date, r.service, r.region, r.account, r.amount, r.usage_quantity]))} ON CONFLICT (user_id, date, service, region, account) DO UPDATE SET amount = EXCLUDED.amount, usage_quantity = EXCLUDED.usage_quantity`;
}

export function pgGetCostsByDay(userId: number, days: number) {
  const sql = getPG();
  return sql`SELECT date, SUM(amount) as total FROM costs WHERE user_id = ${userId} AND date >= CURRENT_DATE - ${days} || ' days'::interval GROUP BY date ORDER BY date`;
}

export function pgGetCostsByService(userId: number) {
  const sql = getPG();
  return sql`SELECT service, SUM(amount) as total FROM costs WHERE user_id = ${userId} AND date >= CURRENT_DATE - INTERVAL '30 days' GROUP BY service ORDER BY total DESC`;
}

export function pgGetCostSummary(userId: number) {
  const sql = getPG();
  return sql`SELECT SUM(amount) as total_spend, COUNT(DISTINCT date) as days, MIN(date) as first_date, MAX(date) as last_date FROM costs WHERE user_id = ${userId} AND date >= CURRENT_DATE - INTERVAL '30 days'`;
}

export function pgInsertAnomaly(userId: number, a: {date: string; service: string; region: string; expected: number; actual: number; z_score: number; severity: string; root_cause?: string}) {
  const sql = getPG();
  return sql`INSERT INTO anomalies (user_id, date, service, region, dimension_type, expected, actual, z_score, severity, root_cause) VALUES (${userId}, ${a.date}, ${a.service}, ${a.region}, 'service', ${a.expected}, ${a.actual}, ${a.z_score}, ${a.severity}, ${a.root_cause ?? null}) RETURNING id`;
}

export function pgGetAnomalies(userId: number, status?: string) {
  const sql = getPG();
  if (status) return sql`SELECT * FROM anomalies WHERE user_id = ${userId} AND status = ${status} ORDER BY date DESC`;
  return sql`SELECT * FROM anomalies WHERE user_id = ${userId} ORDER BY date DESC`;
}

export function pgGetOpenAnomalyCount(userId: number) {
  const sql = getPG();
  return sql`SELECT COUNT(*) as count FROM anomalies WHERE user_id = ${userId} AND status = 'open'`;
}

export function pgUpdateAnomalyStatus(userId: number, id: number, status: string) {
  const sql = getPG();
  return sql`UPDATE anomalies SET status = ${status} WHERE id = ${id} AND user_id = ${userId}`;
}

export function pgGetConfig(userId: number, key: string) {
  const sql = getPG();
  return sql`SELECT value FROM config WHERE user_id = ${userId} AND key = ${key}`;
}

export function pgSetConfig(userId: number, key: string, value: string) {
  const sql = getPG();
  return sql`INSERT INTO config (user_id, key, value, updated_at) VALUES (${userId}, ${key}, ${value}, NOW()) ON CONFLICT (user_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`;
}

export function pgLogAlert(userId: number, anomalyId: number, channel: string) {
  const sql = getPG();
  return sql`INSERT INTO alerts_log (user_id, anomaly_id, channel) VALUES (${userId}, ${anomalyId}, ${channel})`;
}

export function pgGetAlertHistory(userId: number) {
  const sql = getPG();
  return sql`SELECT a.*, al.channel, al.sent_at, al.status as delivery_status FROM alerts_log al JOIN anomalies a ON a.id = al.anomaly_id WHERE al.user_id = ${userId} ORDER BY al.sent_at DESC`;
}

export function pgCreateUser(email: string, passwordHash: string, name?: string) {
  const sql = getPG();
  return sql`INSERT INTO users (email, password_hash, name) VALUES (${email}, ${passwordHash}, ${name ?? null}) RETURNING id`;
}

export function pgGetUserByEmail(email: string) {
  const sql = getPG();
  return sql`SELECT id, email, password_hash, name FROM users WHERE email = ${email}`;
}

export function pgGetCloudAccounts(userId: number) {
  const sql = getPG();
  return sql`SELECT * FROM cloud_accounts WHERE user_id = ${userId} ORDER BY created_at DESC`;
}

export function pgAddCloudAccount(userId: number, a: {provider: string; label: string; account_id: string; role_arn?: string; external_id?: string; project_id?: string; service_account_key?: string}) {
  const sql = getPG();
  return sql`INSERT INTO cloud_accounts (user_id, provider, label, account_id, role_arn, external_id, project_id, service_account_key) VALUES (${userId}, ${a.provider}, ${a.label}, ${a.account_id}, ${a.role_arn ?? null}, ${a.external_id ?? null}, ${a.project_id ?? null}, ${a.service_account_key ?? null})`;
}

export function pgRemoveCloudAccount(userId: number, id: number) {
  const sql = getPG();
  return sql`DELETE FROM cloud_accounts WHERE id = ${id} AND user_id = ${userId}`;
}

export function pgUpdateCloudAccountSync(userId: number, id: number) {
  const sql = getPG();
  return sql`UPDATE cloud_accounts SET last_sync = NOW() WHERE id = ${id} AND user_id = ${userId}`;
}
