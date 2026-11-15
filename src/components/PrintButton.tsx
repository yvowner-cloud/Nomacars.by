"use client";

export function PrintButton() {
  return <button className="btn btn-red no-print" onClick={() => window.print()}>Распечатать или сохранить в PDF</button>;
}
