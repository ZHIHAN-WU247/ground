---
name: gstack-plan-eng-review
description: |
  Review a plan from engineering architecture perspective.
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - AskUserQuestion
---

# gstack-plan-eng-review

Use this project-level slash skill as a top-level entrypoint for the official gstack workflow named $name.

If the full upstream gstack runtime is available, follow that runtime as the source of truth. Otherwise, apply the gstack engineering workflow from the project and global AGENTS rules with this command's stated focus.
