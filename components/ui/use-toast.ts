"use client";

// Minimal toast store inspired by shadcn/ui.
import * as React from "react";
import type { ToastProps } from "./toast";

type ToastEntry = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
};

type State = { toasts: ToastEntry[] };

const listeners: Array<(s: State) => void> = [];
let state: State = { toasts: [] };

function setState(next: State) {
  state = next;
  listeners.forEach((l) => l(state));
}

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

export function toast(t: Omit<ToastEntry, "id">) {
  const id = genId();
  const entry: ToastEntry = { ...t, id };
  setState({ toasts: [entry, ...state.toasts].slice(0, 5) });
  // auto-dismiss
  setTimeout(() => {
    setState({ toasts: state.toasts.filter((x) => x.id !== id) });
  }, 4000);
  return id;
}

export function useToast() {
  const [s, setLocal] = React.useState(state);
  React.useEffect(() => {
    listeners.push(setLocal);
    return () => {
      const i = listeners.indexOf(setLocal);
      if (i >= 0) listeners.splice(i, 1);
    };
  }, []);
  return {
    toasts: s.toasts,
    toast,
    dismiss: (id: string) => setState({ toasts: state.toasts.filter((x) => x.id !== id) }),
  };
}
