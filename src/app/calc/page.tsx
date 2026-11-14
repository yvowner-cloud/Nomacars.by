import type { Metadata } from "next";
import { CalcForm } from "@/components/CalcForm";

export const metadata: Metadata = {
  title: "Калькулятор растаможки и доставки авто из США",
  description: "Расчёт стоимости автомобиля с аукциона Copart или IAAI под ключ в Беларусь и Россию: пошлина, утильсбор, доставка, услуги.",
};

export default function CalcPage() {
  return (
    <section className="sec">
      <div className="wrap">
        <div className="sec-h">
          <div><div className="eyebrow">Для любого лота Copart или IAAI</div><h1 style={{ fontSize: "clamp(24px,3.4vw,34px)" }}>Калькулятор под ключ</h1></div>
        </div>
        <CalcForm />
      </div>
    </section>
  );
}
