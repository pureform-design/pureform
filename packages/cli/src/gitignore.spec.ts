import { spawnSync } from "node:child_process";
import { mkdtempSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { run, tempApp, writeApp, writeTree } from "./__fixtures__/app";
import { gitignoreHint } from "./gitignore";

const git = (cwd: string, ...args: string[]) => {
    const result = spawnSync("git", args, { cwd, encoding: "utf8" });
    if (result.status !== 0) throw new Error(result.stderr);
};

/** A git repository with an app in `app/`. */
const repository = (): { repo: string; app: string } => {
    const repo = realpathSync(mkdtempSync(join(tmpdir(), "pureform-cli-git-")));
    git(repo, "init", "-q");
    const app = join(repo, "app");
    writeTree(app, { ".pureform/index.ts": "" });
    return { repo, app };
};

describe("gitignoreHint", () => {
    it("names the line to add when git doesn't ignore the folder", () => {
        const { app } = repository();
        expect(gitignoreHint(app, join(app, ".pureform"))).toBe(
            `pureform: git doesn't ignore .pureform/, which is generated. Unless the app commits it on purpose, add this line to ${join(app, ".gitignore")}:\n  .pureform/`,
        );
        expect(
            gitignoreHint(app, join(app, "src/.pureform"), () => ".gitignore"),
        ).toContain("add this line to .gitignore:\n  src/.pureform/");
    });

    it("stays quiet when the folder is ignored, anywhere up the repository", () => {
        const { repo, app } = repository();
        writeTree(repo, { ".gitignore": ".pureform/\n" });
        expect(gitignoreHint(app, join(app, ".pureform"))).toBeUndefined();
    });

    it("stays quiet when the app commits the folder", () => {
        const { app } = repository();
        git(app, "add", ".pureform/index.ts");
        expect(gitignoreHint(app, join(app, ".pureform"))).toBeUndefined();
    });

    it("stays quiet outside a repository, and for a folder outside the root", () => {
        const root = tempApp();
        expect(gitignoreHint(root, join(root, ".pureform"))).toBeUndefined();
        const { app } = repository();
        expect(gitignoreHint(app, join(app, "../out"))).toBeUndefined();
    });
});

describe("pureform generate in a repository", () => {
    it("prints the hint once after writing, and not in --check", async () => {
        const { app } = repository();
        writeApp(app);

        const written = await run(app, ["generate"]);
        expect(written.code).toBe(0);
        expect(written.stderr).toBe(
            "pureform: git doesn't ignore .pureform/, which is generated. Unless the app commits it on purpose, add this line to .gitignore:\n  .pureform/",
        );

        const checked = await run(app, ["generate", "--check"]);
        expect(checked.code).toBe(0);
        expect(checked.stderr).toBe("");

        writeTree(app, { ".gitignore": ".pureform/\n" });
        expect((await run(app, ["generate"])).stderr).toBe("");
    });
});
