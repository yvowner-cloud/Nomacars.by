"use client";

import { useEffect, useState } from "react";

export function ToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const f = () => setShow(window.scrollY > 600);
    f();
    window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);
  if (!show) return null;
  return (
    <button className="to-top" aria-label="Наверх" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>▲</button>
  );
}
