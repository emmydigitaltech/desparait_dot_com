"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

// shared across instances so a splash that follows another one appears instantly (no re-fade blink)
let active = 0;
let lastEnd = 0;

export default function Splash({ overlay = false, size = 72 }: { overlay?: boolean; size?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (active > 0 || Date.now() - lastEnd < 400) {
      ref.current?.classList.add("dp-splash--warm");
    }
  }, []);

  useEffect(() => {
    active += 1;
    return () => {
      active -= 1;
      lastEnd = Date.now();
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`dp-splash${overlay ? " dp-splash--overlay" : ""}`}
      role="status"
      aria-label="Loading"
    >
      <span className="dp-splash-logo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" style={{ height: size, width: "auto" }} />
      </span>
    </div>
  );
}