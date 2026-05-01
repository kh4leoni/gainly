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

  useEffect(() => {
    if (pendingRef.current !== null) {
      setPendingHref(null);
    }
  }, [pathname]);

  return (
    <NavContext.Provider value={{ pendingHref, setPendingHref }}>
      {children}
    </NavContext.Provider>
  );
}

export function usePendingNav() {
  return useContext(NavContext);
}
