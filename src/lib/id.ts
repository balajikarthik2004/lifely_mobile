let counter = 0;

/** Small, dependency-free unique id — good enough for a local-first store. */
export function createId(prefix = 'id'): string {
  counter = (counter + 1) % 100000;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}
