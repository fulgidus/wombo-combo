/**
 * feedback-store.ts — One-shot retry feedback handoff.
 *
 * Holds the findings (review gate) that the next retry of a task should hand
 * to the implementing agent. Semantics match the Map it replaces: `take`
 * is get-and-clear, so feedback is delivered to exactly one retry.
 */

export class FeedbackStore {
  private entries = new Map<string, string>();

  get(featureId: string): string | undefined {
    return this.entries.get(featureId);
  }

  has(featureId: string): boolean {
    return this.entries.has(featureId);
  }

  set(featureId: string, feedback: string): void {
    this.entries.set(featureId, feedback);
  }

  delete(featureId: string): boolean {
    return this.entries.delete(featureId);
  }

  /** Get-and-clear: the feedback is consumed by the retry that reads it. */
  take(featureId: string): string | undefined {
    const feedback = this.entries.get(featureId);
    this.entries.delete(featureId);
    return feedback;
  }
}
