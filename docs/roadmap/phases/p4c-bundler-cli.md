# p4c: @pureform/bundler and @pureform/cli

**Depends on:** p4a, p4b  
**Runs in parallel with:** p4c-bundler and p4c-cli in parallel

Follow the [conventions](../conventions.md), and use the omni MCP as much as possible ([how](../conventions.md#use-the-omni-mcp-first)).

## Read first

- Design doc: §6, §7, §10.
- Output contexts: p4a, p4b-*.

## Goal

Expose generation through the bundler plugin and the `pureform` command.

## Scope

- **p4c-bundler:** Vite plugin (unplugin, so Rollup, esbuild, and Metro follow): generate
  on dev and build start, serve `virtual:pureform/registry`, regenerate in dev. No
  pruning (p7). Migrate `solid-demo` from p2c's hand-written files.
- **p4c-cli:** `pureform generate [--watch] [--check]`, the `.gitignore` hint.
- Retire the CSS and Tailwind adapters' own Vite plugins once the demos use the bundler,
  or record why not yet.

## Done when

- `solid-demo` builds from generated glue; the CLI's `--check` fails on stale glue in a
  test.

## Output context (required)

When done, write `docs/roadmap/context/p4c-bundler.md` and `docs/roadmap/context/p4c-cli.md`, one per subphase, in the format of
[conventions](../conventions.md#finishing-the-output-context-required), commit it with
the work, and tick this phase in the [roadmap](../README.md). It must cover at least:

- Plugin options and CLI usage, and how the demos are wired now.
