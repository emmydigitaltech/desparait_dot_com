"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Splash from "./Splash";

const SHOW_DELAY = 120; // ms: instant actions never flash the splash
const MIN_SHOW = 350; // ms: once shown, keep it long enough to not flicker
const SAFETY = 15000; // ms: never get stuck

type Ctx = {
  start: () => void;
  stop: () => void;
  run: <T>(job: Promise<T> | (() => Promise<T>)) => Promise<T>;
  nav: () => void; // call right before router.push(...)
  routeChanged: () => void;
};

const noop = () => {};
const BusyCtx = createContext<Ctx>({
  start: noop,
  stop: noop,
  nav: noop,
  routeChanged: noop,
  run: async (job) => (typeof job === "function" ? job() : job),
});

export const useBusy = () => useContext(BusyCtx);

export function BusyProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const count = useRef(0);
  const shownAt = useRef(0);
  const navigating = useRef(false);
  const showT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safeT = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAll = () => {
    if (showT.current) clearTimeout(showT.current);
    if (hideT.current) clearTimeout(hideT.current);
    if (safeT.current) clearTimeout(safeT.current);
    showT.current = hideT.current = safeT.current = null;
  };

  const forceStop = useCallback(() => {
    count.current = 0;
    navigating.current = false;
    clearAll();
    shownAt.current = 0;
    setVisible(false);
  }, []);

  const start = useCallback(() => {
    count.current += 1;
    if (hideT.current) { clearTimeout(hideT.current); hideT.current = null; }
    if (count.current === 1) {
      if (!shownAt.current) {
        showT.current = setTimeout(() => {
          shownAt.current = Date.now();
          setVisible(true);
        }, SHOW_DELAY);
      }
      safeT.current = setTimeout(forceStop, SAFETY);
    }
  }, [forceStop]);

  const stop = useCallback(() => {
    count.current = Math.max(0, count.current - 1);
    if (count.current > 0) return;
    if (showT.current) { clearTimeout(showT.current); showT.current = null; }
    if (safeT.current) { clearTimeout(safeT.current); safeT.current = null; }
    if (shownAt.current) {
      const wait = Math.max(0, MIN_SHOW - (Date.now() - shownAt.current));
      hideT.current = setTimeout(() => {
        shownAt.current = 0;
        setVisible(false);
      }, wait);
    }
  }, []);

  const run = useCallback(
    async <T,>(job: Promise<T> | (() => Promise<T>)) => {
      start();
      try {
        return await (typeof job === "function" ? job() : job);
      } finally {
        stop();
      }
    },
    [start, stop]
  );

  const nav = useCallback(() => {
    navigating.current = true;
    start();
  }, [start]);

  const routeChanged = useCallback(() => {
    if (navigating.current) {
      navigating.current = false;
      stop();
    }
  }, [stop]);

  // any click on an internal link to another page shows the splash until the route changes
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest?.("a");
      if (!a || !a.href || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname === location.pathname) return;
      if (navigating.current) return;
      nav();
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [nav]);

  return (
    <BusyCtx.Provider value={{ start, stop, run, nav, routeChanged }}>
      {children}
      {visible && <Splash overlay />}
    </BusyCtx.Provider>
  );
}

// renders nothing; tells the provider the page changed so it can hide the splash
export function RouteWatcher() {
  const path = usePathname();
  const { routeChanged } = useBusy();
  useEffect(() => {
    routeChanged();
  }, [path]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}