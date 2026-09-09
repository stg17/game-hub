# Working instructions

These rules apply to Codex, Claude Code, and other coding assistants in this repository. Follow the user's current instructions when they change the scope or workflow.

## Project context

- Read the relevant sections of `CLAUDE.md` before editing. It contains the project structure, game conventions, and verification guidance.
- Read `PRODUCT.md` for changes to product behavior and `DESIGN.md` for visual changes.
- Keep shared workflow and Git rules in this file. Keep game implementation notes in `CLAUDE.md` and design decisions in `DESIGN.md`. Update the appropriate document when a change makes it inaccurate.
- Keep games independent and runnable directly from disk. Match the conventions of the files being edited; do not introduce tooling or dependencies for routine changes.

## Working alongside another assistant

- Another assistant may be working at the same time. Files are shared when both sessions use the same folder; conversation history is not. Use the user's assignment to determine which files belong to your task.
- At the start, check `git status --short`, the staged diff, the current branch, and `git worktree list`. Note existing changes before making your own.
- Preserve edits you did not make. Do not undo, reformat, stage, or include them in your commit merely to make the working tree clean.
- Unexpected changes outside your task are not a reason to stop. Leave them alone and continue your assigned work.
- Re-read a file if it changes while you are working. If the other edits conflict with yours or ownership is unclear, coordinate with the user before changing that file; continue independent work meanwhile.
- Use one writer per file at a time, including shared documentation. When sharing a folder, use distinct assignments such as one assistant on `games/dc-romp/` and the other on the hub. Do not expand into the other assignment without coordinating.

## Worktrees and branches

- For simultaneous editing, use a separate Git worktree and task branch for each assistant. Open each assistant in its assigned worktree. Branches alone do not separate files in a shared folder.
- Use descriptive task branches, such as `codex/platform-landing` or `claude/hub-layout`, unless the user supplied a branch.
- Create worktrees from an agreed committed starting point. Uncommitted work in another folder is not automatically available; do not copy it over without coordinating.
- Do not switch branches, merge, or rebase in a folder another assistant is using. A new worktree does not move an already-running session into it.
- If the user has assigned separate areas in the current shared folder, work within that assignment and preserve the other changes. Arrange separate worktrees before taking on overlapping work.

## Git and task completion

- Commit your completed task after the relevant checks pass, unless the user asks to leave it uncommitted. This applies to documentation changes too.
- Review the diff before staging. Stage named files or specific hunks belonging to your task. Do not use `git add .`, `git add -A`, or `git commit -a` in a shared working tree.
- Review `git diff --cached` immediately before committing. A plain commit includes everything staged, even files another assistant staged.
- If unrelated changes are staged, preserve that staging. Use a commit limited to named paths only when those files contain exclusively your task's changes; otherwise coordinate or use an isolated worktree. Do not unstage someone else's work.
- Keep commits focused on one task. Use a short message describing the change, such as `D.C. Romp: remove enemy at level 3 spawn`.
- Run `git diff --check` on your changed files. Verify behavior with the checks appropriate to the change; use `CLAUDE.md` for this project's verification methods. Do not add a test framework for a small edit.
- Local commits are part of finishing a task. Push, merge, rewrite history, or delete branches/worktrees only when the user has requested that action. Never discard another person's or assistant's work.
- After committing, confirm the commit contains only the intended changes and check the remaining working-tree status. Unrelated changes may remain.
- In the final reply, state what changed, what was checked, and the commit ID. If your task remains uncommitted or a check could not run, say so and explain why. Do not claim a browser playthrough when only a script or syntax check ran.

## Communication

- Use plain language and concrete descriptions. Keep updates and documentation brief. Skip praise, slogans, canned summaries, and claims the checks do not support.
- Ask for clarification only when missing information or conflicting work prevents a sound decision. Make routine choices within the assigned task.
