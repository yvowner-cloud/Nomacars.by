"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function QuickFind({ makes }: { makes: string[] }) {
  const router = useRouter();
  const [make, setMake] = useState("");
  const [body, setBody] = useState("");
  const [fuel, setFuel] = useState("");
  return (
    <form className="box" onSubmit={(e) => {
      e.preventDefault();
      const p = new URLSearchParams();
      if (make) p.set("make", make);
      if (body) p.set("body", body);
      if (fuel) p.set("fuel", fuel);
      router.push(`/catalog${p.size ? `?${p}` : ""}`);
    }}>
      <label>Марка
        <select className="field" id="qf-make" value={make} onChange={(e) => setMake(e.target.value)}>
          <option value="">Все марки</option>
          {makes.map((m) => <option key={m}>{m}</option>)}
        </select>
      </label>
      <div className="two" style={{ gap: 10 }}>
        <label>Кузов
          <select className="field" id="qf-body" value={body} onChange={(e) => setBody(e.target.value)}>
            <option value="">Любой</option><option value="suv">Кроссовер / SUV</option><option value="sedan">Седан</option><option value="coupe">Купе</option><option value="convertible">Кабриолет</option>
          </select>
        </label>
        <label>Топливо
          <select className="field" id="qf-fuel" value={fuel} onChange={(e) => setFuel(e.target.value)}>
            <option value="">Любое</option><option>Бензин</option><option>Гибрид</option><option>Электро</option>
          </select>
        </label>
      </div>
      <button className="btn btn-red" type="submit">Показать лоты</button>
      <span className="note">Только проходные авто 3–5 лет, без утопленников и пожаров.</span>
    </form>
  );
}
