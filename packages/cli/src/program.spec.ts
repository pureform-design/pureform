import { describe, expect, it } from "vitest";

import { run, tempApp } from "./__fixtures__/app";
import { VERSION } from "./package-version";
import { GENERATE_USAGE, parseGenerateFlags, USAGE } from "./program";

describe("parseGenerateFlags", () => {
    it("reads every flag", () => {
        expect(
            parseGenerateFlags([
                "--check",
                "--root",
                "app",
                "--config",
                "my.config.ts",
                "--codegen",
                "codegen.ts",
                "--target",
                "css",
                "--options",
                "{}",
                "--components",
                "button,chip",
                "--lazy",
                "chip",
                "--out-dir",
                "out",
                "--no-train-check",
            ]),
        ).toEqual({
            check: true,
            root: "app",
            config: "my.config.ts",
            codegen: "codegen.ts",
            target: "css",
            options: "{}",
            components: "button,chip",
            lazy: "chip",
            outDir: "out",
            trainCheck: false,
        });
        expect(parseGenerateFlags([])).toEqual({});
    });

    it("rejects unknown flags, unknown targets, and --watch with --check", () => {
        expect(() => parseGenerateFlags(["--nope"])).toThrow(
            /Unknown option '--nope'/,
        );
        expect(() => parseGenerateFlags(["--target", "vue"])).toThrow(
            "pureform: --target vue isn't a target. Use one of panda, css, tailwind, native.",
        );
        expect(() => parseGenerateFlags(["--watch", "--check"])).toThrow(
            "don't go together",
        );
        expect(() => parseGenerateFlags(["extra"])).toThrow();
    });
});

describe("main", () => {
    it("prints the usage, the version, and each command's help", async () => {
        const root = tempApp();
        expect(await run(root, [])).toEqual({
            code: 2,
            stdout: "",
            stderr: USAGE,
        });
        expect(await run(root, ["--help"])).toEqual({
            code: 0,
            stdout: USAGE,
            stderr: "",
        });
        expect(await run(root, ["--version"])).toEqual({
            code: 0,
            stdout: VERSION,
            stderr: "",
        });
        expect(await run(root, ["generate", "--help"])).toEqual({
            code: 0,
            stdout: GENERATE_USAGE,
            stderr: "",
        });
    });

    it("exits 2 on a wrong call", async () => {
        const root = tempApp();
        const unknown = await run(root, ["build"]);
        expect(unknown.code).toBe(2);
        expect(unknown.stderr).toBe(
            "pureform: unknown command build. Run `pureform --help` for the commands.",
        );
        const flag = await run(root, ["generate", "--target"]);
        expect(flag.code).toBe(2);
        expect(flag.stderr).toContain(
            "Run `pureform generate --help` for the options.",
        );
    });
});
