import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { CoreConfig } from "@pureform/core/types";
import { generate } from "@pureform/generate";
import type { CodegenContext, ComponentShape } from "@pureform/generate";
import { componentShape } from "@pureform/generate";
import { describe, expect, it } from "vitest";

import { codegen, recipeFile } from "./codegen";
import type { PandaCodegenOptions } from "./codegen";

// A slotted button with a boolean group and tokens (one with a theme var only), a single-slot
// icon with a group that mixes a boolean with a string and no tokens, and two themes.
const config = (): CoreConfig =>
    ({
        tokens: {},
        semanticTokens: {},
        themes: { teal: {}, dense: {} },
        components: {
            iconButton: {
                kind: "slotComponent",
                name: "iconButton",
                slots: ["root", "icon"],
                tokens: {
                    radius: {
                        type: "dynamic",
                        path: ["components", "iconButton", "radius"],
                    },
                    gap: { $value: { type: "raw", value: "8px" } },
                },
                recipe: {
                    base: { root: {}, icon: {} },
                    variants: {
                        variant: { filled: {}, text: {} },
                        toggle: { true: {}, false: {} },
                    },
                    defaultVariants: { variant: "filled", toggle: "false" },
                },
            },
            icon: {
                kind: "component",
                name: "icon",
                recipe: {
                    base: {},
                    variants: { filled: { true: {}, false: {}, inherit: {} } },
                },
            },
            divider: {
                kind: "component",
                name: "divider",
                recipe: { base: {} },
            },
            slide: {
                kind: "component",
                name: "slide",
                tokens: {
                    move: {
                        $value: {
                            type: "alias",
                            path: ["springs", "spatialFast"],
                        },
                    },
                },
                recipe: { base: {} },
            },
        },
    }) as unknown as CoreConfig;

const context = (
    options: PandaCodegenOptions = {},
    components: readonly string[] = ["iconButton", "icon", "divider"],
): CodegenContext<PandaCodegenOptions> => {
    const loaded = config();
    return {
        config: loaded,
        components,
        options,
        root: "/app",
        outDir: "/app/.pureform",
        shape: (name: string): ComponentShape =>
            componentShape(loaded.components[name]!),
        importPath: (from, to) =>
            `${"../".repeat(from.split("/").length)}${to}`,
    };
};

const run = async (
    options: PandaCodegenOptions = {},
    components?: readonly string[],
) => {
    const output = await codegen.codegen(context(options, components));
    const files = Object.fromEntries(
        [...output.components, ...(output.files ?? [])].map((file) => [
            file.path,
            file.contents,
        ]),
    );
    return { output, files };
};

describe("recipeFile", () => {
    it("names a recipe's file as Panda's codegen does", () => {
        expect(
            [
                "button",
                "iconButton",
                "fabXL",
                "clover4Leaf",
                "a1B",
                "x_Y",
                "a__b",
                "_lead",
                "$d",
                "Upper",
            ].map(recipeFile),
        ).toEqual([
            "button",
            "icon-button",
            "fab-x-l",
            "clover4-leaf",
            "a1-b",
            "x-y",
            "a-b",
            "lead",
            "d",
            "upper",
        ]);
    });
});

describe("the Panda codegen", () => {
    it("is a web adapter named panda", () => {
        expect(codegen.name).toBe("panda");
        expect(codegen.platform).toBe("web");
    });

    it("writes a factory module per component, and panda.ts", async () => {
        const { output } = await run();
        expect(output.components.map(({ name, path }) => [name, path])).toEqual(
            [
                ["iconButton", "web/iconButton.ts"],
                ["icon", "web/icon.ts"],
                ["divider", "web/divider.ts"],
            ],
        );
        expect(output.files?.map((file) => file.path)).toEqual(["panda.ts"]);
    });

    it("scopes named themes with Panda's data-panda-theme", async () => {
        const { output } = await run();
        expect(output.themeAttribute).toBe("data-panda-theme");
    });

    it("gives the registry the var prefixes", async () => {
        const { output } = await run({ prefix: "pf", tokenPrefix: "x" });
        expect(output.vars).toEqual({ prefix: "pf", tokenPrefix: "x" });
    });

    it("names token vars with Panda's prefix when no tokenPrefix is set", async () => {
        const { output, files } = await run({ pandaPrefix: "app" }, ["slide"]);
        expect(output.vars).toEqual({ prefix: undefined, tokenPrefix: "app" });
        expect(files["web/slide.ts"]).toContain('move: "--app-springs"');
    });

    it("takes an explicit tokenPrefix over Panda's prefix", async () => {
        const { output, files } = await run(
            { pandaPrefix: "app", tokenPrefix: "x" },
            ["slide"],
        );
        expect(output.vars).toEqual({ prefix: undefined, tokenPrefix: "x" });
        expect(files["web/slide.ts"]).toContain('move: "--x-springs"');
    });

    it("writes the modules it's given, from Panda's outdir", async () => {
        const { files } = await run({ outdir: "src/panda" }, ["icon"]);
        expect(Object.keys(files)).toEqual(["web/icon.ts", "panda.ts"]);
        expect(files["web/icon.ts"]).toContain(
            'import { icon as recipe } from "../../src/panda/recipes/icon";',
        );
        expect(files["panda.ts"]).toContain(
            'recipes: {\n        icon: ["*"],\n    },',
        );
    });

    it("maps slot classes, converts boolean groups, and adds instance tokens", async () => {
        const { files } = await run({ prefix: "pf" });
        expect(files["web/iconButton.ts"]).toMatchSnapshot();
    });

    it("wraps a single-slot recipe's class string as the root's", async () => {
        const { files } = await run();
        expect(files["web/icon.ts"]).toMatchSnapshot();
        expect(files["web/divider.ts"]).toMatchSnapshot();
    });

    it("names each token's var by its dynamic path, else the component's var", async () => {
        const { files } = await run({ prefix: { components: "x" } });
        expect(files["web/iconButton.ts"]).toContain(
            'radius: "--x-components-iconButton-radius",',
        );
        expect(files["web/iconButton.ts"]).toContain(
            'gap: "--x-components-iconButton-gap",',
        );
    });

    it("keeps every variant of each component, and every theme, in staticCss", async () => {
        const { files } = await run();
        expect(files["panda.ts"]).toMatchSnapshot();
    });

    it("gives the same output for the same input", async () => {
        expect((await run({ prefix: "pf" })).files).toEqual(
            (await run({ prefix: "pf" })).files,
        );
    });
});

describe("generate with the Panda target", () => {
    it("writes the factories, staticCss, the index, and the declarations", async () => {
        const root = mkdtempSync(join(tmpdir(), "pureform-panda-"));
        const result = await generate<PandaCodegenOptions>({
            root,
            config: config(),
            target: codegen,
            options: { prefix: "pf" },
            components: ["iconButton"],
        });
        expect(result.files.map(({ path, status }) => [path, status])).toEqual([
            ["web/iconButton.ts", "written"],
            ["panda.ts", "written"],
            ["index.ts", "written"],
            ["registry.d.ts", "written"],
        ]);
        const read = (path: string) =>
            readFileSync(join(root, ".pureform", path), "utf8");
        expect(read("web/iconButton.ts")).toContain(
            'import { iconButton as recipe } from "../../styled-system/recipes/icon-button";',
        );
        expect(read("index.ts")).toContain(
            'import { iconButton } from "./web/iconButton";',
        );
        expect(read("registry.d.ts")).toContain('toggle: "true" | "false";');
        const check = await generate<PandaCodegenOptions>({
            root,
            config: config(),
            target: codegen,
            options: { prefix: "pf" },
            components: ["iconButton"],
            check: true,
        });
        expect(check.ok).toBe(true);
    });

    it("narrows staticCss to the variants a pruned build uses, and leaves the factories alone", async () => {
        const root = mkdtempSync(join(tmpdir(), "pureform-panda-"));
        const full = await run({ prefix: "pf" });
        await generate<PandaCodegenOptions>({
            root,
            config: config(),
            target: codegen,
            options: { prefix: "pf" },
            usage: {
                components: ["iconButton", "icon"],
                variants: {
                    iconButton: { variant: [], toggle: ["true"] },
                    icon: { filled: ["inherit"] },
                },
            },
        });
        const read = (path: string) =>
            readFileSync(join(root, ".pureform", path), "utf8")
                .split("\n")
                .slice(3)
                .join("\n");
        expect(read("panda.ts")).toContain(
            [
                "    recipes: {",
                '        iconButton: [{ variant: ["filled"], toggle: ["*"] }],',
                '        icon: [{ filled: ["inherit"] }],',
                "    },",
            ].join("\n"),
        );
        expect(read("web/iconButton.ts")).toBe(full.files["web/iconButton.ts"]);
        expect(existsSync(join(root, ".pureform/web/divider.ts"))).toBe(false);
    });
});
