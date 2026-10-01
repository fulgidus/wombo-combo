Quest branches fork from quest.baseBranch; task branches fork from the quest
branch and merge back into it. Baseline source and test-detection base are
different: snapshot quest.baseBranch, but detect task changes against
agent.baseBranch.

AgentRunner is the shared execution seam for CLI and daemon/TUI launches.
runFullVerification runs build, browser verification, then TDD verification.
Existing TDD verification requires raw test-command success regardless of
pre-existing failures; strict mode separately enforces corresponding tests.

Capture one immutable runtime baseline before the first real coding-agent
launch for each TDD-enabled quest. Reuse it across dependent tasks, retries,
resumed sessions, and subsequent launches. Record its source SHA rather than
chasing the moving main branch. Corrupt, incompatible, or missing snapshots
during verification must never silently redefine accepted failures.

Compare identities and outcomes, not just counts. Initially support complete
Bun output; unsupported failing runners retain fail-closed behavior. Build
failures and infrastructure errors are never baseline-exempt.

File ownership is partitioned: runner parsing; baseline model/store;
isolated capture; verifier pipeline; prompts/templates; daemon integration;
final acceptance tests/documentation. Capture and verifier work can proceed
in parallel after the baseline contract merges.
