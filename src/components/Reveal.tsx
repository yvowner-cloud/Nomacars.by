"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Плавное появление блока при прокрутке. Блок прячется, только если после загрузки он ниже экрана,
 * поэтому без JS и на первом экране всё видно сразу.
 */
export function Reveal({ children, className = "", as: Tag = "div" }: { children: React.ReactNode; className?: string; as?: "div" | "section" }) {
  const ref = useRef<HTMLDivElement>(null);
  const [st, setSt] = useState<"" | "rv-wait" | "rv-in">("");
  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;
    setSt("rv-wait");
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) { setSt("rv-in"); io.disconnect(); }
    }, { rootMargin: "0px 0px -10% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <Tag ref={ref} className={`${className} ${st}`.trim()}>{children}</Tag>;
}
