// The `.gitignore` hint: `pureform generate` doesn't edit `.gitignore`, but names the line to add
// when git neither ignores the generated folder nor tracks any of it (tracking it means the app
// commits its glue on purpose).

import { spawnSync } from "node:child_process";
import { join, relative, sep } from "node:path";

const toPosix = (path: string): string => path.split(sep).join("/");

/** The hint for `outDir` (absolute) under `root`, or `undefined` when git ignores the folder,
 *  tracks files in it, or isn't there (no git, or not a repository). `display` turns the
 *  `.gitignore` path into how the message shows it. */
export const gitignoreHint = (
    root: string,
    outDir: string,
    display: (file: string) => string = (file) => file,
): string | undefined => {
    const folder = toPosix(relative(root, outDir));
    if (folder === "" || folder.startsWith("../")) return undefined;
    const git = (...args: string[]) =>
        spawnSync("git", args, { cwd: root, encoding: "utf8" });

    const ignored = git("check-ignore", "-q", "--", `${folder}/`);
    if (ignored.error || ignored.status !== 1) return undefined;
    const tracked = git("ls-files", "--", folder);
    if (tracked.error || tracked.status !== 0 || tracked.stdout.trim() !== "")
        return undefined;

    return `pureform: git doesn't ignore ${folder}/, which is generated. Unless the app commits it on purpose, add this line to ${display(join(root, ".gitignore"))}:\n  ${folder}/`;
};
