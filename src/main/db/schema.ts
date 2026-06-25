/**
 * SQLite schema for petTaTo. Idempotent (IF NOT EXISTS) so it doubles as the
 * migration applied on every open. Times are stored as Unix-ms integers.
 */
export const SCHEMA_SQL = /* sql */ `
CREATE TABLE IF NOT EXISTS pets (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT    NOT NULL DEFAULT 'Tato',
  personality_id   TEXT    NOT NULL DEFAULT 'friendly',
  personality_json TEXT    NOT NULL DEFAULT '{}',
  stats_json       TEXT    NOT NULL DEFAULT '{}',
  state            TEXT    NOT NULL DEFAULT 'idle',
  facing           INTEGER NOT NULL DEFAULT 1,
  pos_x            REAL    NOT NULL DEFAULT 200,
  pos_y            REAL    NOT NULL DEFAULT 200,
  home_x           REAL    NOT NULL DEFAULT 120,
  home_y           REAL    NOT NULL DEFAULT 600,
  home_appearance  TEXT    NOT NULL DEFAULT 'cottage',
  asleep           INTEGER NOT NULL DEFAULT 0,
  born_at          INTEGER NOT NULL,
  time_together_ms INTEGER NOT NULL DEFAULT 0,
  last_seen        INTEGER NOT NULL,
  created_at       INTEGER NOT NULL,
  updated_at       INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS memories (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  pet_id     INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  kind       TEXT    NOT NULL,
  detail     TEXT    NOT NULL DEFAULT '',
  weight     REAL    NOT NULL DEFAULT 1.0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_memories_pet ON memories(pet_id, kind);

CREATE TABLE IF NOT EXISTS interactions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  pet_id     INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  type       TEXT    NOT NULL,
  created_at INTEGER NOT NULL,
  hour       INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_interactions_pet ON interactions(pet_id, type);

CREATE TABLE IF NOT EXISTS conversations (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  pet_id     INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  role       TEXT    NOT NULL,
  text       TEXT    NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_conv_pet ON conversations(pet_id);

CREATE TABLE IF NOT EXISTS history (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  pet_id     INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  type       TEXT    NOT NULL,
  payload    TEXT    NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_history_pet ON history(pet_id, type);

CREATE TABLE IF NOT EXISTS kv (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`
