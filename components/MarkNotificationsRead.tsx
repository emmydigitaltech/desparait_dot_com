"use client";

import { useEffect } from "react";
import { markAllNotificationsRead } from "@/lib/notification-actions";

export default function MarkNotificationsRead() {
  useEffect(() => {
    markAllNotificationsRead().then((r) => {
      if (r?.ok) window.dispatchEvent(new Event("dp:notifications-read"));
    });
  }, []);
  return null;
}