"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type NavContextValue = {
  pendingHref: string | null;
  setPendingHref: (href: string) => void;
};

const NavContext = createContext<NavContextValue>({
  pendingHref: null,
  setPendingHref: () => {},
});

export function NavigationProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const pendingRef = useRef(pendingHref);
  pendingRef.current = pendingHref;

  // Save last app path for PWA resume
  useEffect(() => {
    if (pathname.startsWith("/client/") || pathname.startsWith("/coach/")) {
      localStorage.setItem("gainly_last_path", pathname);
    }
  }, [pathname]);

  // Clear when pathname changes (normal nav completion)
  useEffect(() => {
    if (pendingRef.current !== null) {
      setPendingHref(null);
    }
  }, [pathname]);

  // Clear when pendingHref already matches current pathname (clicking active tab)
  useEffect(() => {
    if (pendingHref !== null && pendingHref === pathname) {
      setPendingHref(null);
    }
  }, [pendingHref, pathname]);

  // Safety fallback: always clear after 3s (handles cancelled/failed navigations
  // and double-clicks where React dedupes the setState call)
  useEffect(() => {
    if (pendingHref === null) return;
    const t = setTimeout(() => setPendingHref(null), 3000);
    return () => clearTimeout(t);
  }, [pendingHref]);

  return (
    <NavContext.Provider value={{ pendingHref, setPendingHref }}>
      {children}
    </NavContext.Provider>
  );
}

export function usePendingNav() {
  return useContext(NavContext);
}
