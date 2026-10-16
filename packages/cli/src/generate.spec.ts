import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
    configSource,
    glueFile,
    glueSource,
    run,
    tempApp,
} from "./__fixtures__/app";
import { main } from "./program";

describe("pureform generate", () => {
    it("writes .pureform/ from the config and the glue file, and says what it wrote", async () => {
        const root = tempApp(["chip", "divider"], {
            options: { prefix: "x-" },
        });

        const first = await run(root, ["generate"]);
        expect(first.code).toBe(0);
        expect(first.stdout).toContain(
            "pureform: updated .pureform/ (4 written)",
        );
        expect(first.stdout).toContain("  written web/chip.ts");
        expect(glueFile(root, "web/chip.ts")).toContain('class: "x-chip"');
        expect(glueFile(root, "index.ts")).toContain("divider");

        const second = await run(root, ["generate"]);
        expect(second.code).toBe(0);
        expect(second.stdout).toBe("pureform: .pureform/ is up to date");
    });

    it("takes the flags over the glue file", async () => {
        const root = tempApp(["chip", "divider", "badge"], {
            options: { prefix: "x-" },
            components: ["chip"],
        });

        const result = await run(root, [
            "generate",
            "--components",
            "badge, divider",
            "--options",
            '{"prefix":"y-"}',
            "--out-dir",
            "glue",
        ]);
        expect(result.code).toBe(0);
        const index = readFileSync(join(root, "glue/index.ts"), "utf8");
        expect(index).toContain("badge");
        expect(index).not.toContain("chip");
        expect(readFileSync(join(root, "glue/web/badge.ts"), "utf8")).toContain(
            'class: "y-badge"',
        );
    });

    it("runs from another folder with --root, and prints paths from the working directory", async () => {
        const root = tempApp();
        const result = await run(join(root, ".."), [
            "generate",
            "--root",
            root,
        ]);
        expect(result.code).toBe(0);
        expect(result.stdout).toContain(
            `updated ${root.split("/").at(-1)}/.pureform/`,
        );
    });

    describe("--check", () => {
        it("fails on missing glue and writes nothing", async () => {
            const root = tempApp();
            const result = await run(root, ["generate", "--check"]);
            expect(result.code).toBe(1);
            expect(result.stderr).toContain(
                "pureform: .pureform/ is out of date (1 missing",
            );
            expect(result.stderr).toContain(
                "Run `pureform generate` to update it.",
            );
            expect(result.stderr).toContain("  missing index.ts");
            expect(() => glueFile(root, "index.ts")).toThrow();
        });

        it("passes on fresh glue", async () => {
            const root = tempApp();
            await run(root, ["generate"]);
            const result = await run(root, ["generate", "--check"]);
            expect(result.code).toBe(0);
            expect(result.stdout).toBe("pureform: .pureform/ is up to date");
            expect(result.stderr).toBe("");
        });

        it("fails on stale glue after the config changes, and leaves it as it was", async () => {
            const root = tempApp(["chip"]);
            await run(root, ["generate"]);
            const before = glueFile(root, "index.ts");
            writeFileSync(
                join(root, "pureform.config.ts"),
                configSource("chip", "badge"),
            );

            const result = await run(root, ["generate", "--check"]);
            expect(result.code).toBe(1);
            expect(result.stderr).toMatch(/is out of date \(.*stale/);
            expect(result.stderr).toContain("  stale index.ts");
            expect(glueFile(root, "index.ts")).toBe(before);

            await run(root, ["generate"]);
            expect((await run(root, ["generate", "--check"])).code).toBe(0);
        });

        it("fails on stale glue after the adapter's options change", async () => {
            const root = tempApp();
            await run(root, ["generate"]);
            const result = await run(root, [
                "generate",
                "--check",
                "--options",
                '{"prefix":"z-"}',
            ]);
            expect(result.code).toBe(1);
            expect(result.stderr).toContain("stale web/chip.ts");
        });

        it("fails on a hand-edited file", async () => {
            const root = tempApp();
            await run(root, ["generate"]);
            const file = join(root, ".pureform/web/chip.ts");
            writeFileSync(file, `${readFileSync(file, "utf8")}// edited\n`);

            const result = await run(root, ["generate", "--check"]);
            expect(result.code).toBe(1);
            expect(result.stderr).toContain("  modified web/chip.ts");
        });
    });

    describe("errors", () => {
        it("prints generate's errors and exits 1", async () => {
            const root = tempApp();
            rmSync(join(root, "pureform.config.ts"));
            const result = await run(root, ["generate"]);
            expect(result.code).toBe(1);
            expect(result.stderr).toMatch(
                /^pureform: no config at .*pureform\.config\.ts/,
            );
        });

        it("asks for a target when there's no glue file", async () => {
            const root = tempApp(["chip"], false);
            const result = await run(root, ["generate"]);
            expect(result.code).toBe(1);
            expect(result.stderr).toContain(
                "pureform: no target to generate for",
            );
        });

        it("names a glue file without the options", async () => {
            const root = tempApp();
            writeFileSync(
                join(root, "pureform.glue.ts"),
                "export const other = 1;\n",
            );
            const result = await run(root, ["generate"]);
            expect(result.code).toBe(1);
            expect(result.stderr).toContain(
                "should export the generate options as `glue`",
            );
        });
    });

    describe("--watch", () => {
        const until = async (condition: () => boolean, ms = 5000) => {
            const end = Date.now() + ms;
            while (!condition()) {
                if (Date.now() > end) throw new Error("timed out");
                await new Promise((resolve) => setTimeout(resolve, 20));
            }
        };

        it("generates again when the config, a file it imports, or the glue file changes", async () => {
            const root = tempApp(["chip"]);
            const stdout: string[] = [];
            const stderr: string[] = [];
            const controller = new AbortController();
            const done = main(["generate", "--watch"], {
                cwd: root,
                stdout: (text) => stdout.push(text),
                stderr: (text) => stderr.push(text),
                signal: controller.signal,
            });

            await until(() => stdout.some((line) => line.includes("watching")));
            expect(stdout[0]).toContain("updated .pureform/");
            expect(stdout.at(-1)).toBe(
                "pureform: watching pureform.config.ts and the files it imports, and pureform.glue.ts (Ctrl+C to stop)",
            );

            writeFileSync(
                join(root, "pureform.config.ts"),
                configSource("chip", "badge"),
            );
            await until(() => {
                try {
                    return glueFile(root, "index.ts").includes("badge");
                } catch {
                    return false;
                }
            });

            writeFileSync(join(root, "pureform.config.ts"), "export default {");
            await until(() =>
                stderr.some((line) => line.includes("loading the config")),
            );
            writeFileSync(
                join(root, "pureform.config.ts"),
                configSource("chip"),
            );
            await until(() => !glueFile(root, "index.ts").includes("badge"));

            writeFileSync(
                join(root, "pureform.glue.ts"),
                glueSource({ options: { prefix: "w-" } }),
            );
            await until(() =>
                glueFile(root, "web/chip.ts").includes('"w-chip"'),
            );

            controller.abort();
            expect(await done).toBe(0);
        });

        it("doesn't go with --check", async () => {
            const root = tempApp();
            const result = await run(root, ["generate", "--watch", "--check"]);
            expect(result.code).toBe(2);
            expect(result.stderr).toContain(
                "--watch and --check don't go together",
            );
        });
    });
});
