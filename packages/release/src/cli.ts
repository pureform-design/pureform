#!/usr/bin/env bun
// Run from cog.toml's bump hooks and by hand:
//   bun packages/release/src/cli.ts set-version <cog package> <version> [--dry-run]
//   bun packages/release/src/cli.ts check
import { checkRepository, findRoot, setVersion } from "./workspace";

const USAGE = `usage:
  cli.ts set-version <cog package> <version> [--dry-run]
  cli.ts check`;

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const [command, ...rest] = args.filter((arg) => arg !== "--dry-run");
const root = findRoot(process.cwd());

if (command === "set-version" && rest.length === 2) {
    const [name = "", version = ""] = rest;
    const changed = setVersion(root, name, version, { dryRun });
    const verb = dryRun ? "would set" : "set";
    console.log(`${verb} ${name} to ${version} in ${changed.length} files`);
    for (const file of changed) console.log(`  ${file}`);
} else if (command === "check" && rest.length === 0) {
    const issues = checkRepository(root);
    for (const issue of issues) console.error(issue);
    if (issues.length > 0) process.exit(1);
    console.log("cog.toml and the workspace agree");
} else {
    console.error(USAGE);
    process.exit(2);
}
