---
title: Install
description: Install wombo-combo and check that it runs.
sidebar:
  order: 1
---

wombo-combo runs on [Bun](https://bun.sh). It orchestrates AI coding agents in
separate git worktrees, so you also need `git` and a supported coding-agent CLI
available on your `PATH` (see `agent.bin` in the [configuration reference](../../reference/config/)).

## Install

```sh
bun a -g wombo-combo
```

This installs the `woco` command globally. Check it:

```sh
woco version
woco help
```

`woco upgrade` checks for a newer release and upgrades in place.

## Shell completions

```sh
woco completion --help
```

shows how to install, uninstall or print completion scripts for your shell.

## Working on wombo-combo itself

If you are developing wombo-combo, do not use the global binary. Run the local
source with `bun dev <command>` instead; see `AGENTS.md` in the repository.

## Next

Continue with [Your first task](../first-task/).
