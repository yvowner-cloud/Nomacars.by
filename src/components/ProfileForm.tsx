"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "./Providers";
import type { Country } from "@/lib/types";

export function ProfileForm({ name: n0, phone, country: c0 }: { name: string; phone: string; country: Country }) {
  const router = useRouter();
  const { toast, setCountry } = useApp();
  const [name, setName] = useState(n0);
  const [country, setC] = useState<Country>(c0);
  const [busy, setBusy] = useState(false);
  return (
    <form className="panel" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true);
      const r = await fetch("/api/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, country }) });
      setBusy(false);
      if (r.ok) { setCountry(country); toast("Профиль сохранён"); router.refresh(); } else toast("Не удалось сохранить");
    }}>
      <div className="panel-h">Профиль</div>
      <div className="box t-grid" style={{ maxWidth: 720 }}>
        <label className="t-field">Имя<input className="field" id="pf-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} /></label>
        <label className="t-field">Телефон<input className="field" value={phone} disabled /></label>
        <label className="t-field">Страна доставки
          <select className="field" id="pf-cty" value={country} onChange={(e) => setC(e.target.value as Country)}>
            <option value="by">Беларусь</option><option value="ru">Россия</option>
          </select>
        </label>
        <button className="btn btn-red" style={{ alignSelf: "end", justifySelf: "start" }} disabled={busy}>{busy ? "Сохраняем…" : "Сохранить"}</button>
      </div>
    </form>
  );
}
