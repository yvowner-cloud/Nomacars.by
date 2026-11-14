import Link from "next/link";

export default function NotFound() {
  return (
    <section className="sec">
      <div className="wrap">
        <div className="panel empty">
          <b>Лот снят с публикации или страница не найдена</b>
          <span>Возможно, торги отменены. Посмотрите другие машины из подборки.</span>
          <Link className="btn btn-red" href="/catalog">Открыть каталог</Link>
        </div>
      </div>
    </section>
  );
}
