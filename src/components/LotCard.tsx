import Link from "next/link";
import { BODY_SHORT, type Lot } from "@/lib/types";
import type { PublicLot } from "@/lib/server/public-lots";
import { LotImage } from "./LotImage";
import { TurnkeyPrice, WatchButton } from "./Price";
import { CardTimer } from "./Timer";
import { engineStr, kmStr } from "@/lib/format";

export function LotBadge({ lot }: { lot: Pick<Lot, "status" | "top"> }) {
  if (lot.status === "sold") return <span className="badge b-sold">Продан</span>;
  if (lot.status === "ended") return <span className="badge b-end">Торги завершены</span>;
  if (lot.top) return <span className="badge b-top">Топ недели</span>;
  return null;
}

export function LotCard({ lot }: { lot: PublicLot }) {
  return (
    <Link className="card" href={`/lot/${lot.slug}`}>
      <div className="ph">
        <LotImage lot={lot} />
        <div className="badges"><LotBadge lot={lot} /></div>
        <WatchButton id={lot.id} />
        <span className="lotno mono">{lot.auction} · {lot.lotNo}</span>
      </div>
      <div className="cbody">
        <div className="ctitle">
          {lot.year} {lot.make} {lot.model}
          <small>{[lot.trim, BODY_SHORT[lot.body] ?? null].filter(Boolean).join(" · ")}</small>
        </div>
        <dl className="specs">
          <dt>Пробег</dt><dd className="num">{kmStr(lot.miles)}</dd>
          <dt>Двигатель</dt><dd>{engineStr(lot.cc, lot.hp, lot.hpEstimated)}</dd>
          {lot.conditionGrade != null
            ? <><dt>Состояние</dt><dd className="dmg-light" title={lot.damage}>CR {lot.conditionGrade.toFixed(1)} из 5</dd></>
            : <><dt>Повреждение</dt><dd className={lot.level === "light" ? "dmg-light" : "dmg-mid"} title={lot.damage}>{lot.damage}</dd></>}
        </dl>
        <div className="cfoot">
          <TurnkeyPrice lot={lot} />
          <CardTimer at={lot.saleAt} active={lot.status === "active"} />
        </div>
      </div>
    </Link>
  );
}
