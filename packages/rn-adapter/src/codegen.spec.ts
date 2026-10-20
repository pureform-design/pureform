import { spawnSync } from "node:child_process";
import {
    mkdirSync,
    mkdtempSync,
    readFileSync,
    rmSync,
    symlinkSync,
    writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { defineComponent, defineSlotComponent } from "@pureform/core";
import {
    alias,
    dynamic,
    px,
    rgb,
    slot,
    unitless,
    when,
} from "@pureform/core/ast";
import type { CoreConfig } from "@pureform/core/types";
import {
    componentShape,
    generate,
    normalizeVariants,
} from "@pureform/generate";
import type { CodegenContext, ComponentShape } from "@pureform/generate";
import { pureform } from "@pureform/preset";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { precompute, splitPrecomputed } from "./build";
import { THEMES_FILE, codegen, instanceTokenKeys } from "./codegen";
import type { RnCodegenOptions } from "./codegen";
import { nativeFactory, selectionOrder } from "./factory";
import type { NativeFactory } from "./factory";

// A button with a hover state, a dynamic token, and a component token with a theme value
// only; a single-slot icon with a pressed state; and a divider with no groups.
const config = (): CoreConfig =>
    ({
        tokens: { colors: { violet: rgb(100, 50, 150) } },
        semanticTokens: {
            colors: { primary: alias("tokens", "colors", "violet") },
        },
        themes: { dense: {} },
        components: {
            button: defineSlotComponent({
                name: "button",
                slots: ["root", "label"],
                tokens: {
                    container: dynamic(
                        ["components", "button", "container"],
                        alias("semanticTokens", "colors", "primary"),
                    ),
                    gap: px(8),
                },
                recipe: {
                    base: {
                        root: {
                            backgroundColor: dynamic(
                                ["components", "button", "container"],
                                alias("semanticTokens", "colors", "primary"),
                            ),
                            opacity: when(
                                slot("root", "hover"),
                                unitless(0.9),
                                unitless(1),
                            ),
                        },
                        label: { fontSize: px(14) },
                    },
                    variants: {
                        size: {
                            small: { root: { height: px(32) } },
                            large: { root: { height: px(48) } },
                        },
                    },
                    defaultVariants: { size: "small" },
                },
            }),
            icon: defineComponent({
                name: "icon",
                recipe: {
                    base: { width: when("pressed", px(20), px(24)) },
                    variants: { filled: { true: {}, false: {} } },
                    defaultVariants: { filled: "false" },
                },
            }),
            divider: defineComponent({
                name: "divider",
                recipe: { base: { height: px(1) } },
            }),
        },
    }) as unknown as CoreConfig;

const context = (
    options: RnCodegenOptions = {},
    components: readonly string[] = ["button", "icon", "divider"],
    loaded: CoreConfig = config(),
): CodegenContext<RnCodegenOptions> => ({
    config: loaded,
    components,
    options,
    root: "/app",
    outDir: "/app/.pureform",
    shape: (name: string): ComponentShape =>
        componentShape(loaded.components[name]!),
    importPath: (from, to) => `${"../".repeat(from.split("/").length)}${to}`,
});

const run = async (
    options: RnCodegenOptions = {},
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

// Temp app roots that can import what they generate: `@pureform/styling` and this package
// link to the workspace's.
const PACKAGE = fileURLToPath(new URL("..", import.meta.url));
const STYLING = fileURLToPath(new URL("../../styling", import.meta.url));
const TSCONFIG = fileURLToPath(
    new URL("../../tsconfig/base.json", import.meta.url),
);
const TSC = join(
    createRequire(import.meta.url).resolve("typescript/package.json"),
    "..",
    "bin",
    "tsc",
);
const roots: string[] = [];

const appRoot = (): string => {
    const root = mkdtempSync(join(tmpdir(), "pureform-native-"));
    roots.push(root);
    mkdirSync(join(root, "node_modules", "@pureform"), { recursive: true });
    symlinkSync(
        STYLING,
        join(root, "node_modules", "@pureform", "styling"),
        "dir",
    );
    symlinkSync(
        PACKAGE,
        join(root, "node_modules", "@pureform", "rn-adapter"),
        "dir",
    );
    return root;
};

afterAll(() => {
    for (const root of roots) rmSync(root, { recursive: true, force: true });
});

interface Generated {
    registry: {
        names: readonly string[];
        entry(name: string): {
            kind: "static" | "lazy";
            factory?: NativeFactory;
            load(): Promise<NativeFactory>;
        };
    };
}

const factoryOf = (generated: Generated, name: string): NativeFactory =>
    generated.registry.entry(name).factory!;

const json = (value: unknown) => JSON.stringify(value);

const generateInto = async (
    root: string,
    loaded: CoreConfig,
    options: RnCodegenOptions = {},
    extra: { components?: readonly string[]; lazy?: readonly string[] } = {},
    check = false,
) =>
    generate<RnCodegenOptions>({
        root,
        config: loaded,
        target: codegen,
        options,
        ...extra,
        check,
        trainCheck: false,
    });

const importGenerated = async (root: string): Promise<Generated> =>
    (await import(
        /* @vite-ignore */ join(root, ".pureform", "index.ts")
    )) as Generated;

// The JSON a module parses, read back.
const parsed = (source: string): unknown =>
    JSON.parse(
        JSON.parse(/JSON\.parse\(("(?:[^"\\]|\\.)*")\)/.exec(source)![1]!),
    );

describe("the native codegen", () => {
    it("is a native adapter named native", () => {
        expect(codegen.name).toBe("native");
        expect(codegen.platform).toBe("native");
    });

    it("writes a factory module per component, and the themes they share", async () => {
        const { output } = await run();
        expect(output.components.map(({ name, path }) => [name, path])).toEqual(
            [
                ["button", "native/button.ts"],
                ["icon", "native/icon.ts"],
                ["divider", "native/divider.ts"],
            ],
        );
        expect(output.files?.map((file) => file.path)).toEqual([THEMES_FILE]);
    });

    it("declares the states each component reads", async () => {
        const { output } = await run();
        expect(
            output.components.map(({ name, shape }) => [name, shape?.states]),
        ).toEqual([
            ["button", ["hover"]],
            ["icon", ["pressed"]],
            ["divider", []],
        ]);
        expect(output.components[0]!.shape).toMatchObject({
            variants: { size: ["small", "large"] },
            slots: ["root", "label"],
            tokens: ["container", "gap"],
        });
    });

    it("writes each component's own precomputed styles, and names its instance tokens", async () => {
        const { files } = await run();
        const split = splitPrecomputed(precompute(config()));
        const button = files["native/button.ts"]!;
        expect(parsed(button)).toEqual({
            templates: split.button!.templates,
            values: split.button!.values,
            dependents: split.button!.dependents,
        });
        expect(button.replace(/JSON\.parse\(.*\)/, "JSON.parse(…)")).toBe(
            [
                'import { nativeFactory } from "@pureform/rn-adapter/factory";',
                "import type {",
                "    NativeFactory,",
                "    PrecomputedStyles,",
                '} from "@pureform/rn-adapter/factory";',
                "",
                'import { formulas, themes } from "./theme-values";',
                "",
                'const data: Pick<PrecomputedStyles, "templates" | "values" | "dependents"> =',
                "    JSON.parse(…);",
                "",
                "const tokens = {",
                '    container: "components.button.container",',
                '    gap: "components.button.gap",',
                "} as const;",
                "",
                'export const button: NativeFactory<"button"> = nativeFactory(',
                '    "button",',
                '    { mode: "precomputed", themes, formulas, ...data },',
                "    tokens,",
                ");",
                "",
            ].join("\n"),
        );
        expect(files["native/divider.ts"]).not.toContain("tokens");
        expect(files[THEMES_FILE]).toContain(
            "export const themes: Record<string, ThemeValues> = JSON.parse(",
        );
    });

    it("names each instance token by its dynamic path, else the component's key", () => {
        expect(
            instanceTokenKeys("button", config().components.button!),
        ).toEqual({
            container: "components.button.container",
            gap: "components.button.gap",
        });
    });

    it("takes precompute's options, and only the given components", async () => {
        const { files } = await run(
            { remBase: 10, themes: [], schemes: ["dark"] },
            ["icon"],
        );
        expect(Object.keys(files)).toEqual(["native/icon.ts", THEMES_FILE]);
        const icon = parsed(files["native/icon.ts"]!) as {
            values: Record<string, unknown>;
        };
        expect(Object.keys(icon.values)).toEqual(["base:dark"]);
    });

    it("gives the same output for the same input", async () => {
        expect((await run()).files).toEqual((await run()).files);
    });
});

describe("generate with the native target", () => {
    it("writes the factories, the themes, the index, and the declarations", async () => {
        const root = appRoot();
        const result = await generateInto(
            root,
            config(),
            {},
            {
                components: ["button", "icon"],
            },
        );
        expect(result.files.map(({ path, status }) => [path, status])).toEqual([
            ["native/button.ts", "written"],
            ["native/icon.ts", "written"],
            [THEMES_FILE, "written"],
            ["index.ts", "written"],
            ["registry.d.ts", "written"],
        ]);
        const read = (path: string) =>
            readFileSync(join(root, ".pureform", path), "utf8");
        expect(read("index.ts")).toContain(
            'import { button } from "./native/button";',
        );
        expect(read("registry.d.ts")).toContain('states: "hover";');
        expect(read("registry.d.ts")).toContain('states: "pressed";');
        const check = await generateInto(
            root,
            config(),
            {},
            { components: ["button", "icon"] },
            true,
        );
        expect(check.ok).toBe(true);
    });

    it("loads a lazy entry's factory", async () => {
        const root = appRoot();
        await generateInto(root, config(), {}, { lazy: ["icon"] });
        const generated = await importGenerated(root);
        const entry = generated.registry.entry("icon");
        expect(entry.kind).toBe("lazy");
        const icon = await entry.load();
        expect(icon({ pressed: true }).root!.style).toEqual({ width: 20 });
    });

    describe("over the preset", () => {
        const preset = pureform();
        const whole = precompute(preset);
        let root: string;
        let generated: Generated;
        beforeAll(async () => {
            root = appRoot();
            await generateInto(root, preset);
            generated = await importGenerated(root);
        }, 60_000);

        // Every combination of every group's values.
        // Every combination of every group's values, up to `limit` of them: past it, an even
        // spread through them (a stride through the mixed-radix count), and each value of each
        // group on its own over the first value of the others, so none goes untried.
        const combinations = (
            variants: Readonly<Record<string, readonly string[]>>,
            limit = 40_000,
        ): Record<string, string>[] => {
            const groups = Object.entries(variants);
            const total = groups.reduce(
                (n, [, values]) => n * values.length,
                1,
            );
            const at = (index: number) => {
                const selection: Record<string, string> = {};
                let rest = index;
                for (const [group, values] of groups) {
                    selection[group] = values[rest % values.length]!;
                    rest = Math.floor(rest / values.length);
                }
                return selection;
            };
            if (total <= limit) {
                return Array.from({ length: total }, (_, index) => at(index));
            }
            // An odd stride, so it doesn't keep landing on the same value of an even group.
            const stride = Math.floor(total / limit) | 1;
            const spread = Array.from({ length: limit }, (_, index) =>
                at((index * stride) % total),
            );
            const each = groups.flatMap(([group, values]) =>
                values.map((value) => ({ ...at(0), [group]: value })),
            );
            return [...spread, ...each];
        };

        it("registers every component", { timeout: 60_000 }, () => {
            expect(generated.registry.names).toEqual(
                Object.keys(preset.components),
            );
        });

        it(
            "precomputes only the values a pruned build uses, and selects them as the whole config does",
            { timeout: 120_000 },
            async () => {
                // Every component keeps the first two values of each group, and its default.
                const names = Object.keys(preset.components);
                const shape = (name: string) =>
                    componentShape(preset.components[name]!);
                const variants = normalizeVariants(
                    Object.fromEntries(
                        names.map((name) => [
                            name,
                            Object.fromEntries(
                                Object.entries(shape(name).variants).map(
                                    ([group, values]) => [
                                        group,
                                        values.slice(0, 2),
                                    ],
                                ),
                            ),
                        ]),
                    ),
                    names,
                    shape,
                );
                const prunedRoot = appRoot();
                await generate<RnCodegenOptions>({
                    root: prunedRoot,
                    config: preset,
                    target: codegen,
                    usage: { components: names, variants },
                    trainCheck: false,
                });
                const pruned = await importGenerated(prunedRoot);
                let count = 0;
                let smaller = 0;
                for (const name of names) {
                    const kept = Object.fromEntries(
                        Object.entries(whole.templates[name]!.variants).map(
                            ([group, values]) => [
                                group,
                                variants[name]?.[group] ?? values,
                            ],
                        ),
                    );
                    const factory = factoryOf(pruned, name);
                    const over = nativeFactory(name, whole);
                    for (const selection of combinations(kept)) {
                        if (
                            json(factory(selection)) !== json(over(selection))
                        ) {
                            expect(factory(selection)).toEqual(over(selection));
                        }
                        count++;
                    }
                    const size = (root: string) =>
                        readFileSync(
                            join(root, ".pureform", "native", `${name}.ts`),
                            "utf8",
                        ).length;
                    if (size(prunedRoot) < size(root)) smaller++;
                }
                expect(count).toBeGreaterThan(300);
                expect(smaller).toBeGreaterThan(names.length / 2);
            },
        );

        it(
            "gives what selecting from the whole config's precomputed styles gives, for every combination of every group's values (or an even spread through them)",
            // About two minutes on its own since the list item's leading type and position.
            { timeout: 300_000 },
            () => {
                let count = 0;
                for (const name of Object.keys(preset.components)) {
                    const factory = factoryOf(generated, name);
                    const over = nativeFactory(name, whole);
                    for (const selection of combinations(
                        whole.templates[name]!.variants,
                    )) {
                        const result = json(factory(selection));
                        if (result !== json(over(selection))) {
                            expect(factory(selection)).toEqual(over(selection));
                        }
                        count++;
                    }
                }
                expect(count).toBeGreaterThan(40_000);
            },
        );

        it(
            "gives the same for each state, in both schemes, with SVG, and with each instance token",
            { timeout: 60_000 },
            () => {
                for (const [name, spec] of Object.entries(preset.components)) {
                    const factory = factoryOf(generated, name);
                    const over = nativeFactory(
                        name,
                        whole,
                        instanceTokenKeys(name, spec),
                    );
                    const states = selectionOrder(
                        whole.templates[name]!,
                    ).states;
                    for (const environment of [
                        {},
                        { scheme: "dark" as const },
                        { svg: true },
                    ]) {
                        for (const state of [
                            {},
                            ...states.map((state) => ({ [state]: true })),
                        ]) {
                            expect(json(factory.for(environment)(state))).toBe(
                                json(over.for(environment)(state)),
                            );
                        }
                    }
                    // Each token moved off its theme value: a number by 3, a color to another.
                    const theme = whole.themes["base:light"]!;
                    for (const [token, key] of Object.entries(
                        instanceTokenKeys(name, spec),
                    )) {
                        const now = theme[key];
                        if (now === undefined) continue;
                        const tokens = {
                            [token]:
                                typeof now === "number"
                                    ? now + 3
                                    : now.startsWith("rgba")
                                      ? "rgba(10, 20, 30, 0.5)"
                                      : now,
                        };
                        expect(json(factory({ tokens }))).toBe(
                            json(over({ tokens })),
                        );
                    }
                }
            },
        );

        it(
            "type-checks, with the registry typed from the config",
            { timeout: 120_000 },
            () => {
                writeFileSync(
                    join(root, "app.ts"),
                    [
                        'import { registry } from "./.pureform";',
                        "",
                        'const button = registry.entry("button").factory;',
                        'export const label: object = button.for({ scheme: "dark" })({ variant: "filled", pressed: true }).label.style;',
                        'export const progress = registry.entry("linearProgress").factory({ tokens: { value: 40 } }).indicator.transitions;',
                        "// @ts-expect-error: not a button variant",
                        'button({ variant: "nope" });',
                        "// @ts-expect-error: a state the icon doesn't read",
                        'registry.entry("icon").factory({ hover: true });',
                        "// @ts-expect-error: not a checkbox slot",
                        'void registry.entry("checkbox").factory({}).label;',
                        "",
                    ].join("\n"),
                );
                writeFileSync(
                    join(root, "tsconfig.json"),
                    JSON.stringify({
                        extends: TSCONFIG,
                        compilerOptions: {
                            noEmit: true,
                            types: [],
                            // This package's source, rather than a build the test may not have.
                            paths: {
                                "@pureform/rn-adapter/factory": [
                                    join(PACKAGE, "src", "factory.ts"),
                                ],
                            },
                        },
                        include: ["app.ts", ".pureform/**/*.*"],
                    }),
                );
                // TypeScript 7 has no compiler API, so this runs its `tsc`.
                const checked = spawnSync(
                    process.execPath,
                    [TSC, "-p", root, "--pretty", "false"],
                    { encoding: "utf8" },
                );
                const messages = checked.stdout.split("\n").filter(Boolean);
                expect(messages).toEqual([]);
            },
        );
    });
});
