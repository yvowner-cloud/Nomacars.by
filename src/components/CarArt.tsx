import type { Lot } from "@/lib/types";

/** Заглушка фото лота. На этапе 6 заменяется реальными фото аукциона из Supabase Storage. */
export function CarArt({ lot, view = 0 }: { lot: Lot; view?: number }) {
  const suv = lot.body === "suv";
  const body = suv
    ? "M28 132 L32 100 Q36 90 60 88 L92 86 L118 58 Q124 52 140 52 L228 52 Q240 52 250 64 L272 88 Q292 92 296 106 L296 134 Q296 142 288 142 L36 142 Q28 142 28 132 Z"
    : "M30 130 L40 106 Q60 98 95 95 L125 72 Q140 64 170 64 L205 64 Q225 66 245 92 L280 100 Q295 104 296 118 L296 132 Q296 140 288 140 L40 140 Q30 140 30 130 Z";
  const win = suv
    ? "M124 62 L170 60 L170 88 L102 88 Z M178 60 L226 60 Q236 60 244 72 L256 88 L178 88 Z"
    : "M132 77 L168 71 L170 94 L112 96 Z M177 71 L204 71 Q218 73 234 93 L178 94 Z";
  const wy = suv ? 142 : 140;
  const dx = { front: 282, rear: 42, side: 160, hail: 180 }[lot.zone];
  const dy = { front: 118, rear: 116, side: 116, hail: suv ? 58 : 70 }[lot.zone];
  let tf: string | undefined;
  if (view === 1) tf = "translate(324 0) scale(-1 1)";
  if (view === 2) tf = `translate(${-dx * 1.7 + 162} ${-dy * 1.7 + 100}) scale(1.7)`;
  return (
    <svg viewBox="0 0 324 200" role="img" aria-label={`${lot.year} ${lot.make} ${lot.model}`}>
      <rect width="324" height="200" fill={view === 3 ? "var(--yard2)" : "var(--yard1)"} />
      <rect y="150" width="324" height="50" fill="var(--yard2)" />
      <line x1="0" y1="168" x2="324" y2="168" stroke="var(--yard1)" strokeWidth="2" strokeDasharray="14 10" />
      <g transform={tf}>
        <ellipse cx="164" cy={wy + 4} rx="140" ry="9" fill="#000" opacity=".18" />
        <path d={body} fill={lot.color} stroke="#000" strokeOpacity=".25" />
        <path d={win} fill="#26313f" opacity=".92" />
        <rect x={suv ? 280 : 282} y={suv ? 100 : 108} width="12" height="6" rx="2" fill="#FFF3C4" />
        <rect x="30" y={suv ? 104 : 110} width="9" height="6" rx="2" fill="#E0463A" />
        {[84, 244].map((x) => (
          <g key={x}>
            <circle cx={x} cy={wy} r="21" fill="#1b1f26" />
            <circle cx={x} cy={wy} r="10" fill="#a3acb8" />
          </g>
        ))}
        {lot.zone === "hail" ? (
          [0, 1, 2, 3, 4, 5, 6].map((k) => <circle key={k} cx={dx - 36 + k * 12} cy={dy + (k % 2) * 5} r="2.4" fill="#c8102e" opacity=".8" />)
        ) : (
          <>
            <path d={`M${dx - 14} ${dy - 12} l8 7 l-6 5 l10 4 l-8 6 l9 5`} stroke="#c8102e" strokeWidth="2.6" fill="none" strokeLinecap="round" />
            <circle cx={dx} cy={dy} r="17" fill="#c8102e" opacity=".16" />
          </>
        )}
      </g>
    </svg>
  );
}
