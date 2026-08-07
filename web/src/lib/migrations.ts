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
