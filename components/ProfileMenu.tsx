"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import SignOutButton from "@/app/components/SignOutButton";

export default function ProfileMenu({ isAdmin = false }: { isAdmin?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="dp-menu" ref={ref}>
      <button
        type="button"
        className="dp-btn-o"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        Profile ▾
      </button>

      {open && (
        <div className="dp-menu-list" role="menu" onClick={() => setOpen(false)}>
          <Link href="/listings" className="dp-menu-item" role="menuitem">My listings</Link>
          <Link href="/onboarding" className="dp-menu-item" role="menuitem">Edit profile</Link>
          <Link href="/listings/new" className="dp-menu-item" role="menuitem">Sell something</Link>
          {isAdmin && (
            <Link href="/admin" className="dp-menu-item" role="menuitem">Admin</Link>
          )}
          <SignOutButton className="dp-menu-item" />
        </div>
      )}
    </div>
  );
}