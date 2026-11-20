/**
 * The feed's one work queue (framework-free, tested in `scripts/test-feed.mjs`).
 *
 * Feed work runs one task at a time so two writers never race. Two things keep that from ever wedging
 * the feed for the rest of the session:
 *   - a task that takes longer than `timeoutMs` is let go of (the queue moves on; the task, if it is
 *     only slow, still finishes). A task that waits on the queue itself would otherwise block it forever;
 *   - a failure is logged and the caller gets `undefined`; it never rejects.
 *
 * A task must never `await` another queued call (`enqueue` from inside a task waits behind itself); share
 * the work through a plain function instead.
 */

export interface FeedQueueOptions {
  /** How long one task may hold the queue before it is let go of. */
  timeoutMs?: number;
  /** Called with what was running and why it was dropped or failed. */
  warn?: (what: string, error: unknown) => void;
}

export const FEED_TASK_TIMEOUT_MS = 30_000;

export interface FeedQueue {
  /** Run `task` after everything queued before it. Never rejects: a failure is logged and gives `undefined`. */
  enqueue<T>(what: string, task: () => Promise<T>): Promise<T | undefined>;
  /** `enqueue` without waiting for it. Never throws. */
  defer(what: string, task: () => Promise<unknown>): void;
}

export function createFeedQueue(options: FeedQueueOptions = {}): FeedQueue {
  const timeoutMs = options.timeoutMs ?? FEED_TASK_TIMEOUT_MS;
  const warn = options.warn ?? (() => {});
  let chain: Promise<unknown> = Promise.resolve();

  /** Resolves when `task` does, or after `timeoutMs`, whichever is first (the timeout is a failure). */
  const guarded = <T>(what: string, task: () => Promise<T>): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`feed task "${what}" took over ${timeoutMs} ms and was let go of`)), timeoutMs);
      let running: Promise<T>;
      try {
        running = task();
      } catch (error) {
        clearTimeout(timer);
        reject(error);
        return;
      }
      running.then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (error) => {
          clearTimeout(timer);
          reject(error);
        },
      );
    });

  function enqueue<T>(what: string, task: () => Promise<T>): Promise<T | undefined> {
    const next = chain.then(() => guarded(what, task));
    chain = next.catch(() => undefined);
    return next.catch((error) => {
      warn(what, error);
      return undefined;
    });
  }

  function defer(what: string, task: () => Promise<unknown>): void {
    try {
      void enqueue(what, task);
    } catch (error) {
      warn(what, error);
    }
  }

  return { enqueue, defer };
}
