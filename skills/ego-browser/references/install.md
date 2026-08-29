# Install ego lite

Read this file only when ego lite isn't installed yet, or when the user asks to install ego lite. For day-to-day browser work, go back to `SKILL.md`.

The ego-browser skill depends on the ego lite browser: the `ego-browser` command is provided by the ego lite app. Once ego lite is installed and you've gone through onboarding once, the environment is ready and there are no further environment issues.

ego lite website: https://lite.ego.app/

## Security guard for automated installation

Do **not** run the bundled `scripts/install.sh` unattended while upstream security issue `citrolabs/ego-lite#292` remains open. The current upstream installer removes the macOS quarantine attribute before first launch, while the issue documents official DMGs that fail strict code-signature verification. That combination weakens the normal Gatekeeper trust boundary.

Before any automated installation flow is re-enabled, verify that upstream has fixed the distribution and installer behavior. At minimum, confirm all of the following on the exact artifact being installed:

```bash
hdiutil verify /path/to/egolite.dmg
hdiutil attach /path/to/egolite.dmg -nobrowse -readonly
codesign --verify --deep --strict --verbose=4 "/Volumes/ego lite/ego lite.app"
spctl --assess --type execute --verbose=4 "/Volumes/ego lite/ego lite.app"
```

If `codesign` or `spctl` fails, stop. Do not strip quarantine to force the app to launch, and do not tell the user that the installation is verified.

For the current unresolved state, prefer a user-driven install from the official ego lite website and let macOS Gatekeeper surface any trust decision normally. Do not bypass a Gatekeeper warning on the user's behalf.

Upstream tracking issue: https://github.com/citrolabs/ego-lite/issues/292

## Install steps (macOS only)

The repository still contains the upstream `scripts/install.sh`, but treat it as **blocked for unattended use** until the security guard above is satisfied.

For a manual install:

1. Download ego lite from the official website.
2. Keep the downloaded artifact's quarantine metadata intact.
3. Verify the DMG and app signature as described above.
4. If verification succeeds, install `ego lite.app` to `/Applications` (or `~/Applications` if needed).
5. Launch the app normally and complete onboarding.

Do not run this command automatically while `citrolabs/ego-lite#292` is unresolved:

```bash
sh skills/ego-browser/scripts/install.sh
```

After a verified installation, the user completes the first-run onboarding in the app:

- Choose to import data from Chrome or another browser as needed.
- Onboarding registers the `ego-browser` command on the PATH (usually under `~/.local/bin`).

Onboarding is a step the user completes in the GUI. After the user confirms they've finished onboarding, continue with the checks below.

## After installing: confirm `ego-browser` is available

Once the user has finished onboarding, confirm the command is ready:

```bash
command -v ego-browser
```

If it reports that the command isn't found, `~/.local/bin` is most likely not on the current PATH. Fix it temporarily and retry:

```bash
export PATH="$HOME/.local/bin:$PATH"
command -v ego-browser
```

Once the command exists, verify the runtime with a minimal heredoc:

```bash
ego-browser nodejs <<'EOF'
console.log('ego-browser ready')
EOF
```

Printing `ego-browser ready` means the command is callable. It does not, by itself, prove the installed app's distribution integrity; retain the installation verification result separately.

## After that, return to the original task

Once the environment is ready, return to the user's original task and continue with the task space flow in `SKILL.md` — start from `taskSpaces.useOrCreate(name)` and proceed as usual.

## Troubleshooting

- **Not macOS**: the bundled script supports macOS only (`uname -s` is `Darwin`). On other platforms, use the official ego lite distribution instructions and do not assume equivalent verification commands.
- **Download failed**: retry through the official source and verify the final artifact before installing.
- **`codesign` or `spctl` fails**: stop the automated flow. Do not remove quarantine or bypass Gatekeeper. Check the upstream security issue for a fixed release.
- **Gatekeeper blocks first launch**: do not suppress the warning automatically. Treat it as a trust decision that requires a fixed/verified artifact or explicit user handling.
- **Command still unavailable after onboarding**: confirm `~/.local/bin` is on the PATH; or have the user reopen ego lite, finish onboarding, and retry.
