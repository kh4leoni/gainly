"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

type Ctx = {
  title: string | null;
  setTitle: (t: string | null) => void;
};

const PageTitleContext = createContext<Ctx>({ title: null, setTitle: () => {} });

export function PageTitleProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState<string | null>(null);
  return (
    <PageTitleContext.Provider value={{ title, setTitle }}>
      {children}
    </PageTitleContext.Provider>
  );
}

export function usePageTitle(title: string | null | undefined) {
  const { setTitle } = useContext(PageTitleContext);
  useEffect(() => {
    setTitle(title ?? null);
    return () => setTitle(null);
  }, [title, setTitle]);
}

export function usePageTitleValue(): string | null {
  return useContext(PageTitleContext).title;
}
