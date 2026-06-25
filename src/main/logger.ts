import { appendFileSync } from 'node:fs'
import { join } from 'node:path'
import { paths } from './paths.js'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const RING_MAX = 500
const ring: string[] = []

function write(level: LogLevel, args: unknown[]): void {
  const ts = new Date().toISOString()
  const msg = args
    .map((a) => (typeof a === 'string' ? a : safeStringify(a)))
    .join(' ')
  const line = `[${ts}] [${level.toUpperCase()}] ${msg}`
  ring.push(line)
  if (ring.length > RING_MAX) ring.shift()
  // eslint-disable-next-line no-console
  const sink = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
  sink(line)
  try {
    appendFileSync(join(paths.logs(), 'pettato.log'), line + '\n')
  } catch {
    /* logging must never crash the app */
  }
}

function safeStringify(v: unknown): string {
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}

export const log = {
  debug: (...a: unknown[]) => write('debug', a),
  info: (...a: unknown[]) => write('info', a),
  warn: (...a: unknown[]) => write('warn', a),
  error: (...a: unknown[]) => write('error', a),
  /** Return the most recent log lines (used by the dev-tools panel). */
  tail: (n = 200): string[] => ring.slice(-n)
}
