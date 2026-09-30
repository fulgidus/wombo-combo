/**
 * Shared agent status type.
 *
 * Lives in src/daemon/ so the daemon owns the canonical lifecycle while
 * TUI modules can still import the type without depending on the legacy
 * wave-state module.
 */
export type AgentStatus =
  | "queued"
  | "installing"
  | "running"
  | "completed"
  | "verified"
  | "failed"
  | "merged"
  | "retry"
  | "resolving_conflict";
