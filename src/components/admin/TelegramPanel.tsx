"use client";

import { useState } from "react";
import { useApp } from "../Providers";

interface Chat { id: number; title: string }

export function TelegramPanel({ configured, chats: initialChats, readOnly }: { configured: boolean; chats: Chat[]; readOnly: boolean }) {
  const { toast } = useApp();
  const [chats, setChats] = useState(initialChats);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const act = async (action: string, chatId?: number) => {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/admin/telegram", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, chatId }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      if (j.chats) setChats(j.chats);
      toast(action === "test" ? "Тестовое сообщение отправлено" : action === "link" ? "Telegram подключён" : "Чат отвязан");
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  };

  return (
    <div className="panel">
      <div className="panel-h">Уведомления в Telegram</div>
      <div className="box">
        {!configured ? (
          <>
            <p style={{ margin: 0 }}>Бот ещё не создан. Это займёт 2 минуты:</p>
            <ol className="steps-list">
              <li>В Telegram откройте <b>@BotFather</b>, отправьте <span className="mono">/newbot</span>, придумайте имя (например, «Ncars заявки») и адрес бота, оканчивающийся на <span className="mono">bot</span>.</li>
              <li>BotFather пришлёт <b>токен</b> — длинную строку вида <span className="mono">123456789:AA…</span>. Никому её не пересылайте.</li>
              <li>На сервере выполните (вместо ТОКЕН — ваш токен):<br /><code className="mono">echo &apos;TELEGRAM_BOT_TOKEN=ТОКЕН&apos; &gt;&gt; /srv/nomacars/.env &amp;&amp; systemctl restart nomacars</code></li>
              <li>Откройте своего бота в Telegram, нажмите <b>«Старт»</b> и вернитесь сюда — появится кнопка «Подключить».</li>
            </ol>
          </>
        ) : (
          <>
            {chats.length === 0
              ? <p style={{ margin: 0 }}>Бот создан. Откройте его в Telegram, нажмите <b>«Старт»</b> (или отправьте <span className="mono">/start</span>), затем нажмите «Подключить». Можно добавить бота в рабочую группу и написать /start там — тогда уведомления увидят все менеджеры.</p>
              : <div style={{ display: "grid", gap: 6 }}>
                  <span>Уведомления о новых заявках приходят в:</span>
                  {chats.map((c) => (
                    <div key={c.id} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <b>{c.title}</b>
                      {!readOnly && <button className="lock-cta" disabled={busy} onClick={() => act("unlink", c.id)}>Отвязать</button>}
                    </div>
                  ))}
                </div>}
            {!readOnly && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn btn-red btn-sm" disabled={busy} onClick={() => act("link")}>{chats.length ? "Подключить ещё чат" : "Подключить"}</button>
                {chats.length > 0 && <button className="btn btn-line btn-sm" disabled={busy} onClick={() => act("test")}>Отправить тестовое сообщение</button>}
              </div>
            )}
          </>
        )}
        {err && <div className="err" role="alert">{err}</div>}
      </div>
    </div>
  );
}
