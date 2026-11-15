import { Pool, type QueryResultRow } from "pg";

/**
 * Подключение к PostgreSQL на сервере. Адрес — DATABASE_URL из /srv/nomacars/.env.
 * Один пул на процесс (переживает горячую перезагрузку в разработке).
 */
const g = globalThis as unknown as { __ncPool?: Pool };

export const dbConfigured = () => Boolean(process.env.DATABASE_URL);

export function pool(): Pool {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL не задан");
  if (!g.__ncPool) {
    g.__ncPool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10, idleTimeoutMillis: 30_000 });
    g.__ncPool.on("error", (e) => console.error("[db] ошибка пула:", e.message));
  }
  return g.__ncPool;
}

export async function q<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []): Promise<T[]> {
  const r = await pool().query<T>(sql, params);
  return r.rows;
}

export async function q1<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []): Promise<T | null> {
  const rows = await q<T>(sql, params);
  return rows[0] ?? null;
}
