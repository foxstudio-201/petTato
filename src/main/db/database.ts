import initSqlJs, { type Database as SqlJsDatabase, type SqlValue } from 'sql.js'
import { readFileSync, writeFileSync, existsSync, copyFileSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { paths } from '../paths.js'
import { log } from '../logger.js'
import { SCHEMA_SQL } from './schema.js'

type Params = SqlValue[] | Record<string, SqlValue>

/**
 * Thin synchronous wrapper around sql.js (SQLite compiled to WebAssembly).
 * We keep the whole database in memory and flush the serialized image to disk
 * on a timer / on quit. The data set for a virtual pet is tiny, so this gives
 * us real SQLite semantics with zero native-module / ABI headaches.
 */
export class Database {
  private db!: SqlJsDatabase
  private dbPath = paths.db()

  static async open(): Promise<Database> {
    const inst = new Database()
    await inst.init()
    return inst
  }

  private async init(): Promise<void> {
    const SQL = await initSqlJs({ wasmBinary: locateWasm() as unknown as ArrayBuffer })
    if (existsSync(this.dbPath)) {
      try {
        this.db = new SQL.Database(readFileSync(this.dbPath))
      } catch (e) {
        log.error('DB file corrupt, starting fresh:', e)
        this.db = new SQL.Database()
      }
    } else {
      this.db = new SQL.Database()
    }
    this.db.run('PRAGMA foreign_keys = ON;')
    this.db.run(SCHEMA_SQL)
    log.info('Database ready at', this.dbPath)
  }

  /** Execute a write statement. */
  run(sql: string, params: Params = []): void {
    this.db.run(sql, params as SqlValue[])
  }

  /** Return all rows for a query as plain objects. */
  all<T = Record<string, SqlValue>>(sql: string, params: Params = []): T[] {
    const stmt = this.db.prepare(sql)
    try {
      stmt.bind(params as SqlValue[])
      const rows: T[] = []
      while (stmt.step()) rows.push(stmt.getAsObject() as unknown as T)
      return rows
    } finally {
      stmt.free()
    }
  }

  /** Return the first row, or undefined. */
  get<T = Record<string, SqlValue>>(sql: string, params: Params = []): T | undefined {
    return this.all<T>(sql, params)[0]
  }

  /** Insert and return the new rowid. */
  insert(sql: string, params: Params = []): number {
    this.run(sql, params)
    const row = this.get<{ id: number }>('SELECT last_insert_rowid() AS id')
    return row?.id ?? 0
  }

  /** Serialize the in-memory DB to disk atomically. */
  flush(): void {
    const data = this.db.export()
    const tmp = this.dbPath + '.tmp'
    writeFileSync(tmp, Buffer.from(data))
    writeFileSync(this.dbPath, Buffer.from(data))
    try {
      // best-effort: remove tmp
      writeFileSync(tmp, Buffer.from(data))
    } catch {
      /* ignore */
    }
  }

  /** Copy the on-disk DB to a timestamped backup file; returns its path. */
  backup(tag = 'manual'): string {
    this.flush()
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const dest = join(paths.backups(), `pettato-${tag}-${stamp}.sqlite`)
    copyFileSync(this.dbPath, dest)
    log.info('Backup written:', dest)
    return dest
  }

  /** Replace the live database with an imported image (used by Import Save). */
  async importImage(bytes: Uint8Array): Promise<void> {
    const SQL = await initSqlJs({ wasmBinary: locateWasm() as unknown as ArrayBuffer })
    // validate by opening
    const probe = new SQL.Database(bytes)
    probe.run(SCHEMA_SQL)
    this.db.close()
    this.db = probe
    this.db.run('PRAGMA foreign_keys = ON;')
    this.flush()
  }

  /** Export the current DB image (used by Export Save / backups). */
  exportImage(): Uint8Array {
    return this.db.export()
  }

  sizeBytes(): number {
    try {
      return existsSync(this.dbPath) ? statSync(this.dbPath).size : 0
    } catch {
      return 0
    }
  }

  close(): void {
    this.flush()
    this.db.close()
  }
}

/** Resolve the sql.js wasm binary in both dev and packaged builds. */
function locateWasm(): Uint8Array {
  const here = dirname(fileURLToPath(import.meta.url))
  const candidates = [
    process.resourcesPath ? join(process.resourcesPath, 'sql-wasm.wasm') : '',
    join(here, 'sql-wasm.wasm'),
    join(process.cwd(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
    join(here, '..', '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm')
  ].filter(Boolean)
  for (const c of candidates) {
    if (existsSync(c)) return readFileSync(c)
  }
  throw new Error('Could not locate sql-wasm.wasm in: ' + candidates.join(', '))
}
