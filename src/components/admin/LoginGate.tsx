"use client";

import { useApp } from "../Providers";

export function LoginGate({ text }: { text: string }) {
  const { openLogin } = useApp();
  return (
    <div className="panel empty">
      <b>Кабинет владельца</b>
      <span>{text}</span>
      <button className="btn btn-red" onClick={() => openLogin()}>Войти</button>
    </div>
  );
}
