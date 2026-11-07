/** Memory-only, identity-scoped cache. In-flight reads cannot resurrect invalidated data. */
export class ResourceCache {
  private values = new Map<string, { value: unknown; at: number }>();
  private pending = new Map<string, Promise<unknown>>();
  private cancellations = new Map<string, number>();
  private versions = new Map<string, number>();
  constructor(private ttl = 15_000, private capacity = 200) {}
  peek(key: string) { return this.values.get(key); }
  stale(key: string) { const entry = this.peek(key); return !entry || Date.now() - entry.at >= this.ttl; }
  async read<T>(key: string, loader: () => Promise<T>, force = false): Promise<T> {
    const entry = this.values.get(key);
    if (!force && entry && !this.stale(key)) return entry.value as T;
    const active = this.pending.get(key);
    if (active) return active as Promise<T>;
    const version = this.versions.get(key) ?? 0;
    const cancellation = this.cancellations.get(key) ?? 0;
    const task: Promise<T> = loader().then(value => {
      if ((this.cancellations.get(key) ?? 0) !== cancellation) throw new Error("Data changed while loading. Refresh to get current information.");
      if ((this.versions.get(key) ?? 0) !== version) return this.read(key,loader);
      if ((this.versions.get(key) ?? 0) === version) {
        this.values.delete(key);
        this.values.set(key, { value, at: Date.now() });
        if (this.values.size > this.capacity) this.values.delete(this.values.keys().next().value!);
      }
      return value;
    }).finally(() => { if (this.pending.get(key) === task) this.pending.delete(key); });
    this.pending.set(key, task);
    return task;
  }
  invalidate(matches: (key: string) => boolean, cancel = false) {
    for (const key of new Set([...this.values.keys(), ...this.pending.keys()])) if (matches(key)) {
      if(cancel)this.cancellations.set(key,(this.cancellations.get(key)??0)+1);
      this.values.delete(key); this.pending.delete(key);
      this.versions.set(key, (this.versions.get(key) ?? 0) + 1);
    }
  }
}
