import type { SupervisorEvents } from "./types";

type Listener<P> = (payload: P) => void;

interface Entry<P> {
  listener: Listener<P>;
}

/** Called when a listener throws; must never be relied on to throw itself. */
export type ListenerErrorHandler = (event: string, error: unknown) => void;

/**
 * Tiny dependency-free typed emitter. A throwing listener never affects other
 * listeners or the emitter. emit() iterates over a snapshot, so listeners
 * removed or added during an emit neither skip nor double-call anyone: the
 * snapshot is delivered in full, and changes apply from the next emit.
 * The constraint (rather than Record<string, unknown>) lets interfaces be used.
 */
export class TypedEmitter<M extends { [K in keyof M]: unknown }> {
  private readonly entries = new Map<keyof M, Array<Entry<never>>>();

  constructor(private readonly onListenerError?: ListenerErrorHandler) {}

  on<K extends keyof M>(event: K, listener: Listener<M[K]>): () => void {
    return this.add(event, { listener });
  }

  once<K extends keyof M>(event: K, listener: Listener<M[K]>): () => void {
    let fired = false;
    const remove: () => void = this.add(event, {
      listener: (payload) => {
        if (fired) return;
        fired = true;
        remove();
        listener(payload);
      },
    });
    return remove;
  }

  off<K extends keyof M>(event: K, listener: Listener<M[K]>): void {
    const list = this.entries.get(event) as Array<Entry<M[K]>> | undefined;
    if (!list) return;
    const idx = list.findIndex((e) => e.listener === listener);
    if (idx >= 0) this.removeAt(event, list, idx);
  }

  emit<K extends keyof M>(event: K, payload: M[K]): void {
    const list = this.entries.get(event) as Array<Entry<M[K]>> | undefined;
    if (!list) return;
    for (const entry of [...list]) {
      try {
        entry.listener(payload);
      } catch (error) {
        try {
          this.onListenerError?.(String(event), error);
        } catch {
          // error handlers must not break the emitter
        }
      }
    }
  }

  listenerCount<K extends keyof M>(event: K): number {
    return this.entries.get(event)?.length ?? 0;
  }

  private add<K extends keyof M>(event: K, entry: Entry<M[K]>): () => void {
    let list = this.entries.get(event);
    if (!list) {
      list = [];
      this.entries.set(event, list);
    }
    list.push(entry as Entry<never>);
    return () => {
      const current = this.entries.get(event);
      const idx = current ? current.indexOf(entry as Entry<never>) : -1;
      if (current && idx >= 0) this.removeAt(event, current, idx);
    };
  }

  private removeAt(event: keyof M, list: unknown[], idx: number): void {
    list.splice(idx, 1);
    if (list.length === 0) this.entries.delete(event);
  }
}

export type SupervisorEmitter = TypedEmitter<SupervisorEvents>;
