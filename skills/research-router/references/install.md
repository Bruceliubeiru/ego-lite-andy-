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

## Dated upstream platform check (2026-10-26)

Official `citrolabs/ego-lite` now documents **macOS and Windows** runtime support and links a Windows x64 installer; Linux remains on its roadmap. The upstream Windows request `citrolabs/ego-lite#203` was closed on 2026-10-22. Sources: [upstream README](https://github.com/citrolabs/ego-lite/blob/main/README.md), [Windows request](https://github.com/citrolabs/ego-lite/issues/203), [v2.1.0 release](https://github.com/citrolabs/ego-lite/releases/tag/v2.1.0).

This is an **upstream distribution capability**, not proof of this checkout's installed/effective adapter. This repository still carries `skills/ego-browser/SKILL.md` at version `1.2.6`, whereas upstream has released `v2.1.0`; the bundled ego-browser install script is macOS-only. Before using authenticated browser automation on Windows, independently establish the actual installed app, resolved Skill/API generation, and supported runtime commands. Do not infer execution compatibility from a README, a plugin listing, a successful Skill install, or the availability of an installer.

Keep installation and upgrades user-approved; do not automatically execute an unverified installer, bypass operating-system security warnings, or migrate browser profiles to test compatibility. The existing macOS distribution-integrity guard in `skills/ego-browser/references/install.md` remains in force. ChatGPT/Ego is an optional adapter: platform availability does not change Research OS Evidence Engine, provenance, authorization, or its three collaboration gates.
