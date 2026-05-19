const prefetched = new Set<string>();

export function markPrefetched(path: string) {
  prefetched.add(path);
}

export function isPrefetched(path: string) {
  return prefetched.has(path);
}
