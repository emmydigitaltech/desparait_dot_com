"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import SignOutButton from "@/app/components/SignOutButton";
import Avatar from "@/components/Avatar";

export default function ProfileMenu({
  isAdmin = false,
  avatarUrl = null,
  name = null,
  bell = null,
}: {
  isAdmin?: boolean;
  avatarUrl?: string | null;
  name?: string | null;
  bell?: ReactNode;
}) {
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
        className="dp-avatar-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open profile menu"
        onClick={() => setOpen((o) => !o)}
      >
        <Avatar url={avatarUrl} name={name} size={32} />
        <span aria-hidden="true">▾</span>
      </button>

      {bell}

      {open && (
        <div
          className="dp-menu-list"
          role="menu"
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("a")) setOpen(false);
          }}
        >
          {name && <div className="dp-menu-head">{name}</div>}
          <Link href="/dashboard" className="dp-menu-item" role="menuitem">Dashboard</Link>
          <Link href="/listings" className="dp-menu-item" role="menuitem">My listings</Link>
          <Link href="/messages" className="dp-menu-item" role="menuitem">Messages</Link>
          <Link href="/notifications" className="dp-menu-item" role="menuitem">Notifications</Link>
          <Link href="/dashboard/profile" className="dp-menu-item" role="menuitem">Edit profile</Link>
          <Link href="/settings/bank" className="dp-menu-item" role="menuitem">Payout account</Link>
          <Link href="/listings/new" className="dp-menu-item" role="menuitem">Sell something</Link>
          <Link href="/verify" className="dp-menu-item" role="menuitem">Get verified</Link>
          {isAdmin && (
            <Link href="/admin" className="dp-menu-item" role="menuitem">Admin</Link>
          )}
          <SignOutButton className="dp-menu-item dp-logout" />
        </div>
      )}
    </div>
  );
}