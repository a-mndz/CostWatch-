import type Database from 'better-sqlite3';

export interface Migration {
  id: number;
  name: string;
  up(db: Database.Database): void;
  down(db: Database.Database): void;
}

export const migrations: Migration[] = [
  {
    id: 1,
    name: 'password_resets',
    up(db) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS password_resets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL REFERENCES users(id),
          token TEXT NOT NULL UNIQUE,
          expires_at TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
      `);
    },
    down(db) {
      db.exec(`DROP TABLE IF EXISTS password_resets`);
    },
  },
  {
    id: 2,
    name: 'add_user_id_columns',
    up(db) {
      const tables = ['costs', 'anomalies', 'alerts_log', 'cloud_accounts'];
      for (const table of tables) {
        const cols = (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map(c => c.name);
        if (!cols.includes('user_id')) {
          db.exec(`ALTER TABLE ${table} ADD COLUMN user_id INTEGER REFERENCES users(id)`);
        }
      }
      // config needs special handling: old PK was just (key), new PK is (user_id, key)
      const configCols = (db.prepare('PRAGMA table_info(config)').all() as { name: string }[]).map(c => c.name);
      if (!configCols.includes('user_id')) {
        db.exec(`ALTER TABLE config ADD COLUMN user_id INTEGER REFERENCES users(id)`);
        // Recreate with correct PK (SQLite can't alter PKs)
        db.exec(`
          CREATE TABLE config_new (user_id INTEGER REFERENCES users(id), key TEXT NOT NULL, value TEXT NOT NULL, updated_at TEXT DEFAULT (datetime('now')), PRIMARY KEY(user_id, key));
          INSERT INTO config_new (key, value, updated_at) SELECT key, value, updated_at FROM config;
          DROP TABLE config;
          ALTER TABLE config_new RENAME TO config;
        `);
      }
    },
    down(db) {
      // SQLite doesn't support DROP COLUMN in older versions; skip
    },
  },
];

export function runMigrations(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT DEFAULT (datetime('now'))
    );
  `);

  const applied = new Set(
    (db.prepare('SELECT id FROM migrations').all() as { id: number }[]).map(r => r.id)
  );

  for (const m of migrations) {
    if (applied.has(m.id)) continue;
    db.transaction(() => {
      m.up(db);
      db.prepare('INSERT INTO migrations (id, name) VALUES (?, ?)').run(m.id, m.name);
    })();
  }
}

export function rollbackMigration(db: Database.Database) {
  const last = db.prepare('SELECT id, name FROM migrations ORDER BY id DESC LIMIT 1').get() as { id: number; name: string } | undefined;
  if (!last) return false;
  const m = migrations.find(x => x.id === last.id);
  if (!m) return false;
  db.transaction(() => {
    m.down(db);
    db.prepare('DELETE FROM migrations WHERE id = ?').run(m.id);
  })();
  return true;
}
