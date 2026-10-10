"""Pre-push hook: refresh the graphify knowledge graph (graphify-out/).

Runs `graphify update .` (AST-only, no API cost). When the graph changes, the
refresh is committed and the push is aborted with instructions to push again,
because a pre-push hook cannot add commits to the push in progress.
"""

import re
import shutil
import subprocess
import sys
from pathlib import Path

OUT = Path("graphify-out")


def git(*args: str) -> str:
    return subprocess.run(["git", *args], check=True, capture_output=True, text=True).stdout


def main() -> int:
    graphify = shutil.which("graphify")
    if graphify is None:
        print("graphify not found in the hook environment", file=sys.stderr)
        return 1

    result = subprocess.run([graphify, "update", "."], capture_output=True, text=True)
    if result.returncode != 0:
        sys.stderr.write(result.stdout + result.stderr)
        print("graphify update failed", file=sys.stderr)
        return result.returncode

    # graphify backs up the previous curated graph into dated folders; those
    # are local-only (gitignored), so drop them to keep the tree clean.
    for entry in OUT.iterdir() if OUT.is_dir() else []:
        if entry.is_dir() and re.fullmatch(r"\d{4}-\d{2}-\d{2}", entry.name):
            shutil.rmtree(entry)

    if not git("status", "--porcelain", "--", str(OUT)).strip():
        return 0  # graph already up to date

    git("add", "-A", "--", str(OUT))
    git("commit", "--no-verify", "-q", "-m", "chore(graphify): refresh knowledge graph")
    print(
        "graphify-out/ was stale: committed a refresh "
        f"({git('rev-parse', '--short', 'HEAD').strip()}). Push again to include it.",
        file=sys.stderr,
    )
    return 1


if __name__ == "__main__":
    sys.exit(main())
