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

import { px } from "@pureform/core/ast";
import type { AnyComponentSpec, CoreConfig } from "@pureform/core/types";
import { generate } from "@pureform/generate";
import type { CodegenContext, ComponentShape } from "@pureform/generate";
import { componentShape, normalizeVariants } from "@pureform/generate";
import { pureform } from "@pureform/preset";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { manifestOf } from "./classes";
import { STYLESHEET_FILE, codegen, subsetConfig, tokenVars } from "./codegen";
import type { CssCodegenOptions } from "./codegen";
import { componentClasses } from "./runtime";
import { compileCss } from "./stylesheet";

const escapeRegExp = (text: string) =>
    text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// A stylesheet as one line per rule: its at-rules, selector, and declarations, so two
// stylesheets compare rule by rule whatever their order.
const flattenCss = (css: string): string[] => {
    const rules: string[] = [];
    const stack: { header: string; body: string }[] = [];
    let text = "";
    for (const char of css.replace(/\/\*[\s\S]*?\*\//g, "")) {
        if (char === "{") {
            const end = text.lastIndexOf(";") + 1;
            if (stack.length > 0) stack.at(-1)!.body += text.slice(0, end);
            stack.push({ header: text.slice(end).trim(), body: "" });
            text = "";
        } else if (char === "}") {
            const frame = stack.pop()!;
            const body = (frame.body + text).trim();
            if (body) {
                const path = [
                    ...stack.map((parent) => parent.header),
                    frame.header,
                ];
                rules.push(`${path.join(" / ")} { ${body} }`);
            }
            text = "";
        } else if (char === ";" && stack.length === 0) {
            text = "";
        } else {
            text += char;
        }
    }
    return rules.map((rule) => rule.replace(/\s+/g, " "));
};

// A slotted button with a boolean group, a group with no default, a group whose name isn't an
// identifier, and tokens (one with a theme var only); a single-slot icon with a value that
// needs escaping in a template; and a divider with no groups.
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
                    base: { root: { width: px(40) }, icon: {} },
                    variants: {
                        variant: {
                            filled: { root: { width: px(48) } },
                            text: {},
                        },
                        toggle: { true: {}, false: {} },
                        size: { small: {}, large: {} },
                        "icon-side": { start: {}, end: {} },
                    },
                    defaultVariants: {
                        variant: "filled",
                        toggle: "false",
                        "icon-side": "start",
                    },
                },
            },
            icon: {
                kind: "component",
                name: "icon",
                recipe: {
                    base: { width: px(24) },
                    variants: {
                        filled: { true: {}, false: {}, "a`${b}": {} },
                    },
                },
            },
            divider: {
                kind: "component",
                name: "divider",
                recipe: { base: { height: px(1) } },
            },
        },
    }) as unknown as CoreConfig;

const context = (
    options: CssCodegenOptions = {},
    components: readonly string[] = ["iconButton", "icon", "divider"],
    loaded: CoreConfig = config(),
): CodegenContext<CssCodegenOptions> => ({
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
    options: CssCodegenOptions = {},
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

// Temp app roots that can import what they generate: `@pureform/styling` and
// `@pureform/styling-web` link to this workspace's packages.
const RUNTIMES = ["styling", "styling-web"].map(
    (name) =>
        [
            name,
            fileURLToPath(new URL(`../../${name}`, import.meta.url)),
        ] as const,
);
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
    const root = mkdtempSync(join(tmpdir(), "pureform-css-"));
    roots.push(root);
    mkdirSync(join(root, "node_modules", "@pureform"), { recursive: true });
    for (const [name, path] of RUNTIMES) {
        symlinkSync(path, join(root, "node_modules", "@pureform", name), "dir");
    }
    return root;
};

afterAll(() => {
    for (const root of roots) rmSync(root, { recursive: true, force: true });
});

type Factory = (
    selection: object,
) => Record<string, { class: string; style?: Record<string, string> }>;

interface Generated {
    registry: { names: readonly string[]; entry(name: string): unknown };
}

const factoryOf = (generated: Generated, name: string): Factory =>
    (generated.registry.entry(name) as { factory: Factory }).factory;

// Every combination of every group's values, up to `limit` of them: past it, an even spread
// through them (a stride through the mixed-radix count), and every pair of values from every two
// groups over the first values of the rest, so each compound (which matches two groups) is
// covered. The cap keeps the sweep's time flat
// as components gain groups.
const selections = (
    variants: Readonly<Record<string, readonly string[]>>,
    limit = 4_000,
): Record<string, string>[] => {
    const groups = Object.entries(variants);
    const total = groups.reduce((n, [, values]) => n * values.length, 1);
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
    const pairs = groups.flatMap(([a, aValues], i) =>
        groups
            .slice(i + 1)
            .flatMap(([b, bValues]) =>
                aValues.flatMap((x) =>
                    bValues.map((y) => ({ ...at(0), [a]: x, [b]: y })),
                ),
            ),
    );
    return [...spread, ...pairs];
};

// The classes the old runtime gives, as slots.
const runtimeSlots = (
    spec: AnyComponentSpec,
    options: CssCodegenOptions,
): ((selection: object) => Record<string, string>) => {
    const classes = componentClasses(manifestOf(spec, options)) as (
        choice: object,
    ) => string | Record<string, string>;
    return (selection) => {
        const result = classes(selection);
        return typeof result === "string" ? { root: result } : result;
    };
};

const slotClasses = (slots: ReturnType<Factory>): Record<string, string> =>
    Object.fromEntries(
        Object.entries(slots).map(([slot, value]) => [slot, value.class]),
    );

describe("the CSS codegen", () => {
    it("is a web adapter named css", () => {
        expect(codegen.name).toBe("css");
        expect(codegen.platform).toBe("web");
    });

    it("writes a factory module per component, and styles.css", async () => {
        const { output } = await run();
        expect(output.components.map(({ name, path }) => [name, path])).toEqual(
            [
                ["iconButton", "web/iconButton.ts"],
                ["icon", "web/icon.ts"],
                ["divider", "web/divider.ts"],
            ],
        );
        expect(output.files?.map((file) => file.path)).toEqual([
            STYLESHEET_FILE,
        ]);
    });

    it("gives the registry the var prefixes", async () => {
        expect(
            (await run({ prefix: "pf", tokenPrefix: "x" })).output.vars,
        ).toEqual({
            prefix: "pf",
            tokenPrefix: "x",
        });
    });

    it("scopes named themes with the stylesheet's theme attribute", async () => {
        expect((await run()).output.themeAttribute).toBe("data-theme");
        const custom = await run({ themeAttribute: "data-pf-theme" });
        expect(custom.output.themeAttribute).toBe("data-pf-theme");
    });

    it("writes each slot's classes over the selection, and adds instance tokens", async () => {
        const { files } = await run({ classPrefix: "pf", prefix: "pf" });
        expect(files["web/iconButton.ts"]).toMatchSnapshot();
    });

    it("gives a single-slot component's class to the root", async () => {
        const { files } = await run();
        expect(files["web/icon.ts"]).toMatchSnapshot("icon");
        expect(files["web/divider.ts"]).toMatchSnapshot("divider");
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

    it("compiles the stylesheet for the given components only, with the options", async () => {
        const options = { classPrefix: "pf", layer: false } as const;
        const { files } = await run(options, ["icon"]);
        expect(Object.keys(files)).toEqual(["web/icon.ts", STYLESHEET_FILE]);
        expect(files[STYLESHEET_FILE]).toBe(
            compileCss(subsetConfig(config(), ["icon"]), options),
        );
        expect(files[STYLESHEET_FILE]).toContain(".pf-icon {");
        expect(files[STYLESHEET_FILE]).not.toContain("iconButton");
    });

    it("gives the same output for the same input", async () => {
        expect((await run({ prefix: "pf" })).files).toEqual(
            (await run({ prefix: "pf" })).files,
        );
    });
});

describe("subsetConfig", () => {
    it("keeps the given components, in that order", () => {
        const subset = subsetConfig(config(), ["divider", "icon"]);
        expect(Object.keys(subset.components)).toEqual(["divider", "icon"]);
        expect(subset.themes).toEqual(config().themes);
    });
});

describe("generate with the CSS target", () => {
    const generateInto = async (
        root: string,
        loaded: CoreConfig,
        options: CssCodegenOptions,
        components?: readonly string[],
        check = false,
    ) =>
        generate<CssCodegenOptions>({
            root,
            config: loaded,
            target: codegen,
            options,
            ...(components ? { components } : {}),
            check,
            versionCheck: false,
        });

    it("writes the factories, the stylesheet, the index, and the declarations", async () => {
        const root = appRoot();
        const result = await generateInto(root, config(), { prefix: "pf" }, [
            "iconButton",
        ]);
        expect(result.files.map(({ path, status }) => [path, status])).toEqual([
            ["web/iconButton.ts", "written"],
            [STYLESHEET_FILE, "written"],
            ["index.ts", "written"],
            ["registry.d.ts", "written"],
        ]);
        const read = (path: string) =>
            readFileSync(join(root, ".pureform", path), "utf8");
        expect(read(STYLESHEET_FILE)).toMatch(
            /^\/\* Generated by pureform: do not edit\. .* \*\/\n\/\* pureform-hash: [0-9a-f]{16} \*\/\n\n@layer pureform\.reset/,
        );
        expect(read("index.ts")).toContain(
            'import { iconButton } from "./web/iconButton";',
        );
        const check = await generateInto(
            root,
            config(),
            { prefix: "pf" },
            ["iconButton"],
            true,
        );
        expect(check.ok).toBe(true);
    });

    it("gives the old runtime's classes for every selection of a small config", async () => {
        const root = appRoot();
        const loaded = config();
        await generateInto(root, loaded, { classPrefix: "pf" });
        const generated = (await import(
            /* @vite-ignore */ join(root, ".pureform", "index.ts")
        )) as Generated;
        for (const name of ["iconButton", "icon", "divider"]) {
            const spec = loaded.components[name]!;
            const factory = factoryOf(generated, name);
            const old = runtimeSlots(spec, { classPrefix: "pf" });
            const groups = componentShape(spec).variants;
            for (const selection of [{}, ...selections(groups)]) {
                expect(slotClasses(factory(selection))).toEqual(old(selection));
            }
        }
        // A group with no default is left out until it's chosen.
        expect(
            factoryOf(generated, "iconButton")({}).root!.class,
        ).not.toContain("size_");
        expect(
            factoryOf(generated, "icon")({ filled: "a`${b}" }).root!.class,
        ).toBe("pf-icon pf-icon--filled_a`${b}");
    });

    describe("over the preset", () => {
        const options = { classPrefix: "pf", prefix: "pf" } as const;
        const preset = pureform();
        let root: string;
        let generated: Generated;
        beforeAll(async () => {
            root = appRoot();
            await generateInto(root, preset, options);
            generated = (await import(
                /* @vite-ignore */ join(root, ".pureform", "index.ts")
            )) as Generated;
        }, 60_000);
        const stylesheet = () =>
            readFileSync(join(root, ".pureform", STYLESHEET_FILE), "utf8");

        it("registers every component", { timeout: 60_000 }, async () => {
            expect(generated.registry.names).toEqual(
                Object.keys(preset.components),
            );
        });

        it(
            "gives the old runtime's classes for every combination of every group's values (or an even spread through them)",
            { timeout: 60_000 },
            async () => {
                let count = 0;
                const mismatches: unknown[] = [];
                for (const [name, spec] of Object.entries(preset.components)) {
                    const factory = factoryOf(generated, name);
                    const old = runtimeSlots(spec, options);
                    const groups = componentShape(spec).variants;
                    // Booleans share the cached result of their strings.
                    const flags = Object.entries(groups).filter(([, values]) =>
                        values.includes("true"),
                    );
                    for (const selection of selections(groups)) {
                        const result = factory(selection);
                        const expected = old(selection);
                        // Comparing serialized forms first keeps this hot loop fast; only differences are kept.
                        if (
                            JSON.stringify(slotClasses(result)) !==
                            JSON.stringify(expected)
                        ) {
                            mismatches.push({
                                name,
                                selection,
                                actual: slotClasses(result),
                                expected,
                            });
                        }
                        const typed = Object.fromEntries(
                            Object.entries(selection).map(([group, value]) => [
                                group,
                                flags.some(([flag]) => flag === group)
                                    ? value === "true"
                                        ? true
                                        : value === "false"
                                          ? false
                                          : value
                                    : value,
                            ]),
                        );
                        expect(factory(typed)).toBe(result);
                        count++;
                    }
                    // The defaults share the `{}` result, frozen.
                    expect(factory(componentShape(spec).defaults)).toBe(
                        factory({}),
                    );
                    expect(Object.isFrozen(factory({}).root)).toBe(true);
                }
                expect(mismatches).toEqual([]);
                expect(count).toBeGreaterThan(20_000);
            },
        );

        it(
            "writes the stylesheet compileCss writes for the config",
            { timeout: 60_000 },
            async () => {
                expect(stylesheet().split("\n\n").slice(1).join("\n\n")).toBe(
                    compileCss(preset, options),
                );
            },
        );

        it(
            "drops only the rules of variant values a pruned build leaves out",
            { timeout: 60_000 },
            async () => {
                // Every component keeps the first value of each group, and its default.
                const names = Object.keys(preset.components);
                const variants = normalizeVariants(
                    Object.fromEntries(
                        names.map((name) => [
                            name,
                            Object.fromEntries(
                                Object.entries(
                                    componentShape(preset.components[name]!)
                                        .variants,
                                ).map(([group, values]) => [
                                    group,
                                    values.slice(0, 1),
                                ]),
                            ),
                        ]),
                    ),
                    names,
                    (name) => componentShape(preset.components[name]!),
                );
                const full = flattenCss(compileCss(preset, options));
                const pruned = flattenCss(
                    compileCss(subsetConfig(preset, names, variants), options),
                );
                // The classes of the values left out: `<base>(__<slot>)?--<group>_<value>`.
                const removed = Object.entries(variants).flatMap(
                    ([name, groups]) => {
                        const base = manifestOf(
                            preset.components[name]!,
                            options,
                        ).className;
                        const shape = componentShape(preset.components[name]!);
                        return Object.entries(groups).flatMap(([group, kept]) =>
                            shape.variants[group]!.filter(
                                (value) => !kept.includes(value),
                            ).map(
                                (value) =>
                                    new RegExp(
                                        `\\.${escapeRegExp(base)}(?:__[\\w-]+)?--${escapeRegExp(group)}_${escapeRegExp(value)}(?![\\w-])`,
                                    ),
                            ),
                        );
                    },
                );
                expect(removed.length).toBeGreaterThan(100);
                const fullSet = new Set(full);
                const extra = pruned.filter((rule) => !fullSet.has(rule));
                expect(extra).toEqual([]);
                const prunedSet = new Set(pruned);
                const lost = full.filter(
                    (rule) =>
                        !prunedSet.has(rule) &&
                        !removed.some((pattern) => pattern.test(rule)),
                );
                expect(lost).toEqual([]);
                expect(pruned.length).toBeLessThan(full.length);
            },
        );

        it(
            "sets each instance token's var on the root, which the stylesheet reads",
            { timeout: 60_000 },
            async () => {
                const css = stylesheet();
                // Tokens the preset declares but no style reads yet.
                const unread = new Set(
                    // A state layer that follows another slot has no drag state.
                    [
                        "iconButton",
                        "fab",
                        "checkbox",
                        "radio",
                        "switchControl",
                        "slider",
                        "navigationBar",
                        "navigationRail",
                        "nativeSelect",
                    ].map(
                        (name) => `--pf-components-${name}-stateDraggedOpacity`,
                    ),
                );
                for (const [name, spec] of Object.entries(preset.components)) {
                    const factory = factoryOf(generated, name);
                    expect(factory({ tokens: {} })).toBe(factory({}));
                    const springs = new Set(componentShape(spec).springs);
                    const vars = Object.entries(
                        tokenVars(name, spec, options.prefix),
                    );
                    for (const [token, cssVar] of vars.filter(([token]) =>
                        springs.has(token),
                    )) {
                        // A spring token takes a role's name, as the role's vars: its curve and its exact parameters.
                        expect(
                            factory({ tokens: { [token]: "spatialSlow" } })
                                .root!.style,
                        ).toEqual({
                            [`${cssVar}-duration`]:
                                "var(--springs-spatial-slow-duration)",
                            [`${cssVar}-easing`]:
                                "var(--springs-spatial-slow-easing)",
                            [`${cssVar}-stiffness`]:
                                "var(--springs-spatial-slow-stiffness)",
                            [`${cssVar}-damping`]:
                                "var(--springs-spatial-slow-damping)",
                            [`${cssVar}-mass`]:
                                "var(--springs-spatial-slow-mass)",
                        });
                        expect(css).toContain(
                            "--springs-spatial-slow-duration:",
                        );
                        expect(css.includes(`var(${cssVar}-duration`)).toBe(
                            true,
                        );
                    }
                    for (const [token, cssVar] of vars.filter(
                        ([token]) => !springs.has(token),
                    )) {
                        expect(
                            factory({ tokens: { [token]: "3px" } }).root!.style,
                        ).toEqual({ [cssVar]: "3px" });
                        expect(
                            css.includes(`var(${cssVar}`),
                            `${name}.${token} (${cssVar})`,
                        ).toBe(!unread.has(cssVar));
                    }
                }
            },
        );

        it(
            "returns every class the stylesheet styles",
            { timeout: 60_000 },
            async () => {
                const styled = new Set(
                    [...stylesheet().matchAll(/\.(pf-[\w-]+)/g)].map(
                        ([, name]) => name!,
                    ),
                );
                const returned = new Set<string>();
                for (const [name, spec] of Object.entries(preset.components)) {
                    const factory = factoryOf(generated, name);
                    for (const selection of selections(
                        componentShape(spec).variants,
                    )) {
                        for (const slot of Object.values(factory(selection))) {
                            for (const c of slot.class.split(" "))
                                returned.add(c);
                        }
                    }
                }
                expect([...styled].filter((c) => !returned.has(c))).toEqual([]);
            },
        );

        it(
            "type-checks, with the registry typed from the config",
            { timeout: 120_000 },
            async () => {
                writeFileSync(
                    join(root, "app.ts"),
                    [
                        'import { registry } from "./.pureform";',
                        "",
                        'export const filled: string = registry.entry("button").factory({ variant: "filled", tokens: { radius: 4 } }).label.class;',
                        'export const toggled = registry.entry("iconButton").factory({ toggle: true });',
                        "// @ts-expect-error: not a button variant",
                        'registry.entry("button").factory({ variant: "nope" });',
                        "// @ts-expect-error: not a checkbox slot",
                        'void registry.entry("checkbox").factory({}).label;',
                        "",
                    ].join("\n"),
                );
                writeFileSync(
                    join(root, "tsconfig.json"),
                    JSON.stringify({
                        extends: TSCONFIG,
                        compilerOptions: { noEmit: true, types: [] },
                        include: ["app.ts", ".pureform/**/*.*"],
                    }),
                );
                // TypeScript 7 has no compiler API, so this runs its `tsc`.
                const output = spawnSync(
                    process.execPath,
                    [TSC, "-p", root, "--pretty", "false", "--listFilesOnly"],
                    { encoding: "utf8" },
                );
                expect(
                    output.stdout
                        .split("\n")
                        .filter((file) => file.includes("/.pureform/web/")),
                ).toHaveLength(Object.keys(preset.components).length);
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
