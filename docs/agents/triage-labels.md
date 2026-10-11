# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those
roles to the label strings used by this repo's tracker (woco + GitHub).

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the
corresponding label string from this table.

## Where the role is recorded

- **GitHub:** the label on the issue (create the five labels once if missing).
- **woco:** a `triage: <label>` line in the task's `notes` (tasks have no label
  field). Replace the line when the role changes; do not stack several.
  `wontfix` additionally means `bun dev tasks set-status <id> cancelled`.
- A role change is applied to both sides in the same step (see
  `issue-tracker.md`).
