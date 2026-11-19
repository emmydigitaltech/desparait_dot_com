"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function NotificationBellLink({ count }: { count: number }) {
  const [n, setN] = useState(count);

  useEffect(() => setN(count), [count]);

  useEffect(() => {
    const clear = () => setN(0);
    window.addEventListener("dp:notifications-read", clear);
    return () => window.removeEventListener("dp:notifications-read", clear);
  }, []);

  return (
    <Link
      href="/notifications"
      className="dp-btn-o dp-cart-link"
      aria-label={n > 0 ? `Notifications, ${n} unread` : "Notifications"}
      onClick={() => setN(0)} // disappears instantly
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      {n > 0 && <span className="dp-cart-badge">{n > 99 ? "99+" : n}</span>}
    </Link>
  );
}