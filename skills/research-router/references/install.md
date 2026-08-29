# Install the research-router skill globally

The goal is to make research routing automatic in supported agent environments, so the user does not need to say "use ego" on every search.

## Preferred: install the plugin/skill package

If the agent supports repository plugins/skills, install this repository so that `skills/research-router/` and `skills/ego-browser/` are both available globally. The research-router is the entry point; it calls or delegates to ego-browser only when live browser verification is useful.

## Direct global skill links

From a local checkout of this repository, run:

```bash
sh skills/research-router/scripts/install.sh
```

The script links `skills/research-router` into:

- `~/.codex/skills/research-router`
- `~/.claude/skills/research-router`

It does not install the ego lite browser itself. For ego-browser setup, use `skills/ego-browser/references/install.md`.

## Verify

After installation, restart/reload the agent environment and ask a normal research question such as:

> Compare the current official policy with what the live website shows and verify any conflicts.

The agent should automatically select the research-router skill. If the task needs a logged-in or interactive page, it should then route to ego-browser without requiring a separate user instruction.

## Current-environment limitation

A skill file cannot create tools that the host product does not expose. If an environment has no native web search tool, the router can use ego-browser for public browsing when ego-browser is installed. If an environment has neither a search tool nor ego-browser, it must report that limitation rather than pretending to have performed live research.
