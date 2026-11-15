import { pool } from "./db";

/**
 * Миграции базы. Выполняются автоматически при старте сайта (src/instrumentation.ts).
 * Правило: существующие миграции НЕ менять — только добавлять новые в конец.
 */
const MIGRATIONS: { version: number; name: string; sql: string }[] = [
  {
    version: 1,
    name: "пользователи, коды входа, сессии, избранное",
    sql: `
      create table users (
        id            bigserial primary key,
        phone         text not null unique,
        name          text not null default '',
        country       text not null default 'by' check (country in ('by','ru')),
        role          text not null default 'client' check (role in ('client','manager','owner')),
        created_at    timestamptz not null default now(),
        last_login_at timestamptz
      );
      create table otp_codes (
        id          bigserial primary key,
        phone       text not null,
        code_hash   text not null,
        attempts    int not null default 0,
        ip          text,
        created_at  timestamptz not null default now(),
        expires_at  timestamptz not null,
        consumed_at timestamptz
      );
      create index otp_codes_phone_idx on otp_codes (phone, created_at desc);
      create index otp_codes_ip_idx on otp_codes (ip, created_at desc);
      create table sessions (
        id         text primary key,
        user_id    bigint not null references users(id) on delete cascade,
        created_at timestamptz not null default now(),
        expires_at timestamptz not null,
        ip         text,
        user_agent text
      );
      create index sessions_user_idx on sessions (user_id);
      create table favorites (
        user_id    bigint not null references users(id) on delete cascade,
        lot_id     int not null,
        created_at timestamptz not null default now(),
        primary key (user_id, lot_id)
      );
    `,
  },
  {
    version: 2,
    name: "настройки (тарифы, курсы) и история изменений",
    sql: `
      create table settings (
        key        text primary key,
        value      jsonb not null,
        updated_at timestamptz not null default now(),
        updated_by bigint references users(id) on delete set null
      );
      create table settings_history (
        id         bigserial primary key,
        key        text not null,
        before     jsonb,
        after      jsonb not null,
        changed    text[] not null default '{}',
        user_id    bigint references users(id) on delete set null,
        changed_at timestamptz not null default now()
      );
      create index settings_history_key_idx on settings_history (key, changed_at desc);
    `,
  },
];

export async function migrate(): Promise<void> {
  const client = await pool().connect();
  try {
    await client.query("select pg_advisory_lock(727001)");
    await client.query(`create table if not exists schema_migrations (
      version int primary key, name text not null, applied_at timestamptz not null default now())`);
    const done = new Set((await client.query<{ version: number }>("select version from schema_migrations")).rows.map((r) => r.version));
    for (const m of MIGRATIONS) {
      if (done.has(m.version)) continue;
      await client.query("begin");
      try {
        await client.query(m.sql);
        await client.query("insert into schema_migrations (version, name) values ($1, $2)", [m.version, m.name]);
        await client.query("commit");
        console.log(`[db] миграция ${m.version} применена: ${m.name}`);
      } catch (e) {
        await client.query("rollback");
        throw e;
      }
    }
  } finally {
    await client.query("select pg_advisory_unlock(727001)").catch(() => {});
    client.release();
  }
}
