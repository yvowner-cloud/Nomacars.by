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
  {
    version: 3,
    name: "заявки и история заявок",
    sql: `
      create table leads (
        id          bigserial primary key,
        user_id     bigint references users(id) on delete set null,
        kind        text not null check (kind in ('lot','pick','calc')),
        lot_id      int,
        status      text not null default 'new',
        country     text not null default 'by',
        name        text not null default '',
        phone       text not null,
        max_bid     numeric,
        budget      numeric,
        comment     text not null default '',
        calc        jsonb,
        notes       text not null default '',
        tg_notified boolean not null default false,
        created_at  timestamptz not null default now(),
        updated_at  timestamptz not null default now()
      );
      create index leads_status_idx on leads (status, created_at desc);
      create index leads_user_idx on leads (user_id, created_at desc);
      create unique index leads_active_lot_idx on leads (user_id, lot_id)
        where kind = 'lot' and status not in ('delivered','rejected');
      create table lead_events (
        id          bigserial primary key,
        lead_id     bigint not null references leads(id) on delete cascade,
        user_id     bigint references users(id) on delete set null,
        type        text not null,
        from_status text,
        to_status   text,
        text        text,
        created_at  timestamptz not null default now()
      );
      create index lead_events_lead_idx on lead_events (lead_id, created_at);
    `,
  },
  {
    version: 4,
    name: "счета, документы, отметка просмотра кабинета клиентом",
    sql: `
      create table invoices (
        id         bigserial primary key,
        lead_id    bigint not null references leads(id) on delete cascade,
        title      text not null,
        amount     numeric(12,2) not null check (amount > 0),
        currency   text not null default 'USD',
        paid_at    timestamptz,
        created_at timestamptz not null default now(),
        created_by bigint references users(id) on delete set null
      );
      create index invoices_lead_idx on invoices (lead_id, created_at);
      create table documents (
        id         bigserial primary key,
        lead_id    bigint not null references leads(id) on delete cascade,
        name       text not null,
        stored     text not null,
        mime       text not null,
        size       int not null,
        stage      text,
        created_at timestamptz not null default now(),
        created_by bigint references users(id) on delete set null
      );
      create index documents_lead_idx on documents (lead_id, created_at);
      create table client_seen (
        user_id bigint primary key references users(id) on delete cascade,
        seen_at timestamptz not null default now()
      );
    `,
  },
  {
    version: 5,
    name: "загруженные подборки лотов",
    sql: `
      create table lot_imports (
        id           bigserial primary key,
        source       text not null default '',
        notes        text not null default '',
        collected_at text,
        total        int not null,
        valid        int not null,
        payload      jsonb not null,
        checked      jsonb not null,
        created_by   bigint references users(id) on delete set null,
        created_at   timestamptz not null default now()
      );
    `,
  },
  {
    version: 6,
    name: "опубликованные лоты",
    sql: `
      create table lots (
        id          int generated by default as identity (start with 1001) primary key,
        auction     text not null,
        lot_number  text not null,
        slug        text not null unique,
        data        jsonb not null,
        score       int not null default 0,
        sale_at     timestamptz,
        status      text not null default 'active' check (status in ('active','sold','ended','removed')),
        sold_price  numeric,
        visible     boolean not null default true,
        import_id   bigint references lot_imports(id) on delete set null,
        created_at  timestamptz not null default now(),
        updated_at  timestamptz not null default now(),
        unique (auction, lot_number)
      );
      create index lots_status_idx on lots (status, sale_at);
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
