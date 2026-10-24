import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
    codegenSource,
    configSource,
    outputFile,
    run,
    tempApp,
} from "./__fixtures__/app";
import { main } from "./program";

describe("pureform generate", () => {
    it("writes .pureform/ from the config and the codegen file, and says what it wrote", async () => {
        const root = tempApp(["chip", "divider"], {
            options: { prefix: "x-" },
        });

        const first = await run(root, ["generate"]);
        expect(first.code).toBe(0);
        expect(first.stdout).toContain(
            "pureform: updated .pureform/ (5 written)",
        );
        expect(first.stdout).toContain("  written fake/full/web/chip.ts");
        expect(outputFile(root, "fake/full/web/chip.ts")).toContain(
            'class: "x-chip"',
        );
        expect(outputFile(root, "fake/full/index.ts")).toContain("divider");

        const second = await run(root, ["generate"]);
        expect(second.code).toBe(0);
        expect(second.stdout).toBe("pureform: .pureform/ is up to date");
    });

    it("takes the flags over the codegen file", async () => {
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
            "generated",
        ]);
        expect(result.code).toBe(0);
        const index = readFileSync(
            join(root, "generated/fake/full/index.ts"),
            "utf8",
        );
        expect(index).toContain("badge");
        expect(index).not.toContain("chip");
        expect(
            readFileSync(
                join(root, "generated/fake/full/web/badge.ts"),
                "utf8",
            ),
        ).toContain('class: "y-badge"');
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

    describe("several targets", () => {
        // A codegen file with web and native targets of the fake adapter.
        const multi = (root: string) =>
            writeFileSync(
                join(root, "pureform.codegen.ts"),
                codegenSource().replace(
                    /export const codegen = .*$/m,
                    'const native = { ...fake, platform: "native" };\nexport const codegen = { targets: { web: { target: fake }, native: { target: native, components: ["chip"] } } };',
                ),
            );

        it("writes every target's full output, and an entry per target", async () => {
            const root = tempApp(["chip", "divider"]);
            multi(root);
            const result = await run(root, ["generate"]);
            expect(result.code).toBe(0);
            expect(outputFile(root, "web/full/index.ts")).toContain("divider");
            expect(outputFile(root, "native/full/index.ts")).not.toContain(
                "divider",
            );
            expect(outputFile(root, "native.ts")).toContain(
                'export * from "./native/full/index";',
            );
            expect(outputFile(root, "index.ts")).toContain(
                'export * from "./web/full/index";',
            );
            expect((await run(root, ["generate", "--check"])).stdout).toBe(
                "pureform: .pureform/ is up to date",
            );
        });

        it("takes --target over the targets, and refuses a single target's flags without it", async () => {
            const root = tempApp(["chip", "divider"]);
            multi(root);
            const refused = await run(root, [
                "generate",
                "--components",
                "chip",
            ]);
            expect(refused.code).toBe(1);
            expect(refused.stderr).toContain("names several `targets`");
            const single = await run(root, [
                "generate",
                "--target",
                "css",
                "--root",
                root,
                "--check",
            ]);
            expect(single.stderr).not.toContain("names several `targets`");
        });
    });

    describe("--prune", () => {
        it("writes the pruned output beside the full one", async () => {
            const root = tempApp(["chip", "divider"]);
            writeFileSync(
                join(root, "app.tsx"),
                'import { Chip } from "@pureform/solid/chip";\nexport const ui = <Chip variant="assist" />;\n',
            );
            const result = await run(root, ["generate", "--prune"]);
            expect(result.code).toBe(0);
            expect(outputFile(root, "fake/pruned/index.ts")).not.toContain(
                "divider",
            );
            expect(outputFile(root, "fake/full/index.ts")).toContain("divider");
            // A plain run keeps the pruned output a build wrote.
            await run(root, ["generate"]);
            expect(outputFile(root, "fake/pruned/index.ts")).toContain("chip");
        });
    });

    describe("--check", () => {
        it("fails on missing output and writes nothing", async () => {
            const root = tempApp();
            const result = await run(root, ["generate", "--check"]);
            expect(result.code).toBe(1);
            expect(result.stderr).toContain(
                "pureform: .pureform/ is out of date (2 missing",
            );
            expect(result.stderr).toContain(
                "Run `pureform generate` to update it.",
            );
            expect(result.stderr).toContain("  missing fake/full/index.ts");
            expect(() => outputFile(root, "fake/full/index.ts")).toThrow();
        });

        it("passes on fresh output", async () => {
            const root = tempApp();
            await run(root, ["generate"]);
            const result = await run(root, ["generate", "--check"]);
            expect(result.code).toBe(0);
            expect(result.stdout).toBe("pureform: .pureform/ is up to date");
            expect(result.stderr).toBe("");
        });

        it("fails on stale output after the config changes, and leaves it as it was", async () => {
            const root = tempApp(["chip"]);
            await run(root, ["generate"]);
            const before = outputFile(root, "fake/full/index.ts");
            writeFileSync(
                join(root, "pureform.config.ts"),
                configSource("chip", "badge"),
            );

            const result = await run(root, ["generate", "--check"]);
            expect(result.code).toBe(1);
            expect(result.stderr).toMatch(/is out of date \(.*stale/);
            expect(result.stderr).toContain("  stale fake/full/index.ts");
            expect(outputFile(root, "fake/full/index.ts")).toBe(before);

            await run(root, ["generate"]);
            expect((await run(root, ["generate", "--check"])).code).toBe(0);
        });

        it("fails on stale output after the adapter's options change", async () => {
            const root = tempApp();
            await run(root, ["generate"]);
            const result = await run(root, [
                "generate",
                "--check",
                "--options",
                '{"prefix":"z-"}',
            ]);
            expect(result.code).toBe(1);
            expect(result.stderr).toContain("stale fake/full/web/chip.ts");
        });

        it("fails on a hand-edited file", async () => {
            const root = tempApp();
            await run(root, ["generate"]);
            const file = join(root, ".pureform/fake/full/web/chip.ts");
            writeFileSync(file, `${readFileSync(file, "utf8")}// edited\n`);

            const result = await run(root, ["generate", "--check"]);
            expect(result.code).toBe(1);
            expect(result.stderr).toContain("  modified fake/full/web/chip.ts");
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

        it("asks for a target when there's no codegen file", async () => {
            const root = tempApp(["chip"], false);
            const result = await run(root, ["generate"]);
            expect(result.code).toBe(1);
            expect(result.stderr).toContain(
                "pureform: no target to generate for",
            );
        });

        it("names a codegen file without the options", async () => {
            const root = tempApp();
            writeFileSync(
                join(root, "pureform.codegen.ts"),
                "export const other = 1;\n",
            );
            const result = await run(root, ["generate"]);
            expect(result.code).toBe(1);
            expect(result.stderr).toContain(
                "should export the generate options as `codegen`",
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

        it("generates again when the config, a file it imports, or the codegen file changes", async () => {
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
                "pureform: watching pureform.config.ts and the files it imports, and pureform.codegen.ts (Ctrl+C to stop)",
            );

            writeFileSync(
                join(root, "pureform.config.ts"),
                configSource("chip", "badge"),
            );
            await until(() => {
                try {
                    return outputFile(root, "fake/full/index.ts").includes(
                        "badge",
                    );
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
            await until(
                () => !outputFile(root, "fake/full/index.ts").includes("badge"),
            );

            writeFileSync(
                join(root, "pureform.codegen.ts"),
                codegenSource({ options: { prefix: "w-" } }),
            );
            await until(() =>
                outputFile(root, "fake/full/web/chip.ts").includes('"w-chip"'),
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
