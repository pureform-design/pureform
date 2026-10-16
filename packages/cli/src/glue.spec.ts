import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { glueSource, tempApp, writeTree } from "./__fixtures__/app";
import { findGlueFile, loadGlue, resolveGlue } from "./glue";

describe("findGlueFile", () => {
    it("finds the first glue file in the root", () => {
        const root = tempApp(["chip"], false);
        expect(findGlueFile(root)).toBeUndefined();
        writeTree(root, { "pureform.glue.mjs": glueSource() });
        expect(findGlueFile(root)).toBe(join(root, "pureform.glue.mjs"));
        writeTree(root, { "pureform.glue.ts": glueSource() });
        expect(findGlueFile(root)).toBe(join(root, "pureform.glue.ts"));
    });
});

describe("loadGlue", () => {
    it("reads the glue export, or the default export", async () => {
        const root = tempApp(["chip"], false);
        writeTree(root, {
            "named.ts": glueSource({ components: ["chip"] }),
            "default.ts": glueSource({ lazy: ["chip"] }, "default"),
        });
        expect(await loadGlue(join(root, "named.ts"))).toMatchObject({
            components: ["chip"],
            target: { name: "fake" },
        });
        expect(await loadGlue(join(root, "default.ts"))).toMatchObject({
            lazy: ["chip"],
        });
    });

    it("explains a file that doesn't load or export the options", async () => {
        const root = tempApp(["chip"], false);
        writeTree(root, {
            "broken.ts": "export const glue = {",
            "empty.ts": "",
        });
        await expect(loadGlue(join(root, "broken.ts"))).rejects.toThrow(
            /^pureform: loading the glue options at .*broken\.ts failed/,
        );
        await expect(loadGlue(join(root, "empty.ts"))).rejects.toThrow(
            "should export the generate options as `glue`",
        );
    });
});

describe("resolveGlue", () => {
    it("settles the glue file's options with the defaults", async () => {
        const root = tempApp(["chip"], { options: { prefix: "x-" } });
        const { options, glueFile } = await resolveGlue({}, root);
        expect(glueFile).toBe(join(root, "pureform.glue.ts"));
        expect(options).toMatchObject({
            config: "pureform.config.ts",
            root,
            options: { prefix: "x-" },
            target: { name: "fake" },
        });
        expect(options).not.toHaveProperty("check");
        expect(options).not.toHaveProperty("components");
    });

    it("takes the flags over the glue file", async () => {
        const root = tempApp(["chip"], {
            options: { prefix: "x-", size: 1 },
            components: ["chip"],
            trainCheck: true,
        });
        const { options } = await resolveGlue(
            {
                target: "css",
                options: '{"prefix":"y-"}',
                components: "a, b,",
                lazy: "b",
                outDir: "out",
                config: "other.config.ts",
                trainCheck: false,
                check: true,
            },
            root,
        );
        expect(options).toEqual({
            config: "other.config.ts",
            target: "css",
            root,
            options: { prefix: "y-", size: 1 },
            components: ["a", "b"],
            lazy: ["b"],
            outDir: "out",
            trainCheck: false,
            check: true,
        });
    });

    it("finds the glue file and config in --root, and resolves the glue file's root against its folder", async () => {
        const root = tempApp(["chip"], false);
        mkdirSync(join(root, "app"));
        writeFileSync(
            join(root, "app/pureform.glue.ts"),
            glueSource({ root: ".." }),
        );
        writeFileSync(
            join(root, "app/pureform.config.mjs"),
            "export default {}",
        );

        const fromRoot = await resolveGlue({ root: "app" }, root);
        expect(fromRoot.options.root).toBe(join(root, "app"));
        expect(fromRoot.options.config).toBe("pureform.config.mjs");

        const fromGlue = await resolveGlue(
            { glue: "app/pureform.glue.ts" },
            root,
        );
        expect(fromGlue.options.root).toBe(root);
        expect(fromGlue.options.config).toBe("pureform.config.ts");
    });

    it("explains a missing target, a missing glue file, and bad --options", async () => {
        const root = tempApp(["chip"], false);
        await expect(resolveGlue({}, root)).rejects.toThrow(
            /^pureform: no target to generate for\. Pass --target \(panda, css, tailwind, native\)/,
        );
        await expect(resolveGlue({ glue: "nope.ts" }, root)).rejects.toThrow(
            `pureform: no glue options at ${join(root, "nope.ts")}.`,
        );
        await expect(
            resolveGlue({ target: "panda", options: "{" }, root),
        ).rejects.toThrow(/^pureform: --options isn't valid JSON/);
        await expect(
            resolveGlue({ target: "panda", options: "[1]" }, root),
        ).rejects.toThrow("pureform: --options should be a JSON object");
    });
});
