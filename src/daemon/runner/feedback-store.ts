/**
 * feedback-store.ts — One-shot retry feedback handoff.
 *
 * Holds the findings (review gate) that the next retry of a task should hand
 * to the implementing agent. When backed by DaemonState the feedback lives on
 * the agent record (`retryFeedback`), so the atomic daemon-state persistence
 * keeps it across daemon restarts. Without a backing state (or for an agent
 * the state does not know) it falls back to an in-memory map.
 *
 * `take` is get-and-clear. A relaunch should `get` the feedback and `delete`
 * it only after the launch succeeded, so a failed launch keeps it.
 */

/** The slice of DaemonState the store needs. */
export interface FeedbackBacking {
  getAgent(featureId: string): { retryFeedback?: string } | undefined;
  updateAgent(featureId: string, updates: { retryFeedback?: string }): void;
}

export class FeedbackStore {
  private entries = new Map<string, string>();

  constructor(private readonly backing?: FeedbackBacking) {}

  get(featureId: string): string | undefined {
    return this.backing?.getAgent(featureId)?.retryFeedback ?? this.entries.get(featureId);
  }

  has(featureId: string): boolean {
    return this.get(featureId) !== undefined;
  }

  set(featureId: string, feedback: string): void {
    if (this.backing?.getAgent(featureId)) {
      this.backing.updateAgent(featureId, { retryFeedback: feedback });
      this.entries.delete(featureId);
    } else {
      this.entries.set(featureId, feedback);
    }
  }

  delete(featureId: string): boolean {
    const existed = this.has(featureId);
    if (this.backing?.getAgent(featureId)?.retryFeedback !== undefined) {
      this.backing.updateAgent(featureId, { retryFeedback: undefined });
    }
    this.entries.delete(featureId);
    return existed;
  }

  /** Get-and-clear: the feedback is consumed by the retry that reads it. */
  take(featureId: string): string | undefined {
    const feedback = this.get(featureId);
    this.delete(featureId);
    return feedback;
  }
}
