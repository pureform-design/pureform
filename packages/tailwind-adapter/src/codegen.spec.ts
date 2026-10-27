import {
    mkdirSync,
    mkdtempSync,
    readFileSync,
    readdirSync,
    rmSync,
    symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { px } from "@pureform/core/ast";
import type { AnyComponentSpec, CoreConfig } from "@pureform/core/types";
import {
    compileCss,
    componentClasses,
    manifestOf,
} from "@pureform/css-adapter";
import { codegen as cssCodegen } from "@pureform/css-adapter/codegen";
import { componentShape, generate } from "@pureform/generate";
import type { CodegenContext, ComponentShape } from "@pureform/generate";
import { pureform } from "@pureform/preset";
import { compile } from "@tailwindcss/node";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { STYLESHEET_FILE, codegen } from "./codegen";
import type { TailwindCodegenOptions } from "./codegen";
import { compileTailwind } from "./tailwind";

// A slotted button with tokens, a boolean group, and a group with no default; a single-slot
// icon; and a divider with no groups.
const config = (): CoreConfig =>
    ({
        tokens: {},
        semanticTokens: {},
        themes: { teal: {} },
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
                    },
                    defaultVariants: { variant: "filled", toggle: "false" },
                },
            },
            icon: {
                kind: "component",
                name: "icon",
                recipe: {
                    base: { width: px(24) },
                    variants: { filled: { true: {}, false: {} } },
                },
            },
            divider: {
                kind: "component",
                name: "divider",
                recipe: { base: { height: px(1) } },
            },
        },
    }) as unknown as CoreConfig;

const context = <Options>(
    options: Options,
    components: readonly string[] = ["iconButton", "icon", "divider"],
    loaded: CoreConfig = config(),
): CodegenContext<Options> => ({
    config: loaded,
    components,
    options,
    root: "/app",
    outDir: "/app/.pureform",
    shape: (name: string): ComponentShape =>
        componentShape(loaded.components[name]!),
    importPath: (from, to) => `${"../".repeat(from.split("/").length)}${to}`,
});

const filesOf = async (
    options: TailwindCodegenOptions = {},
    components?: readonly string[],
) => {
    const output = await codegen.codegen(context(options, components));
    return Object.fromEntries(
        [...output.components, ...(output.files ?? [])].map((file) => [
            file.path,
            file.contents,
        ]),
    );
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
const roots: string[] = [];

const appRoot = (): string => {
    const root = mkdtempSync(join(tmpdir(), "pureform-tailwind-"));
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

// The classes the runtime's `componentClasses` gives, as slots.
const runtimeSlots = (
    spec: AnyComponentSpec,
    options: TailwindCodegenOptions,
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

// The stylesheet run through Tailwind's compiler, generating utilities for the candidates.
const build = async (css: string, candidates: string[] = []) => {
    const compiler = await compile(`@import "tailwindcss";\n${css}`, {
        base: import.meta.dirname,
        onDependency: () => {},
    });
    return compiler.build(candidates);
};

const styledClasses = (css: string): Set<string> =>
    new Set([...css.matchAll(/\.(pf-[\w-]+)/g)].map(([, name]) => name!));

// A generated file without the header `generate` adds.
const body = (contents: string): string =>
    contents.split("\n\n").slice(1).join("\n\n");

describe("the Tailwind codegen", () => {
    it("is a web adapter named tailwind", () => {
        expect(codegen.name).toBe("tailwind");
        expect(codegen.platform).toBe("web");
    });

    it("writes the CSS adapter's factory modules, and styles.css", async () => {
        const options = { classPrefix: "pf", prefix: "pf" };
        const files = await filesOf(options);
        const css = await cssCodegen.codegen(context(options));
        expect(Object.keys(files)).toEqual([
            "web/iconButton.ts",
            "web/icon.ts",
            "web/divider.ts",
            STYLESHEET_FILE,
        ]);
        for (const module of css.components) {
            expect(files[module.path]).toBe(module.contents);
        }
    });

    it("gives the registry the var prefixes", async () => {
        const output = await codegen.codegen(
            context({ prefix: "pf", tokenPrefix: "x" }),
        );
        expect(output.vars).toEqual({
            prefix: "pf",
            tokenPrefix: "x",
        });
    });

    it("scopes named themes with the attribute its theme variants match", async () => {
        const base = await codegen.codegen(context({}));
        expect(base.themeAttribute).toBe("data-theme");
        const custom = await codegen.codegen(
            context({ themeAttribute: "data-pf-theme" }),
        );
        expect(custom.themeAttribute).toBe("data-pf-theme");
    });

    it("compiles the Tailwind stylesheet for the given components only, with the options", async () => {
        const options = { classPrefix: "pf", layer: "ui", replace: true };
        const files = await filesOf(options, ["icon"]);
        expect(Object.keys(files)).toEqual(["web/icon.ts", STYLESHEET_FILE]);
        expect(files[STYLESHEET_FILE]).toBe(
            compileTailwind(
                {
                    ...config(),
                    components: { icon: config().components.icon! },
                },
                options,
            ),
        );
        expect(files[STYLESHEET_FILE]).toContain("@layer components {");
        expect(files[STYLESHEET_FILE]).toContain(".pf-icon {");
        expect(files[STYLESHEET_FILE]).not.toContain("iconButton");
    });

    it("gives the same output for the same input", async () => {
        expect(await filesOf({ prefix: "pf" })).toEqual(
            await filesOf({ prefix: "pf" }),
        );
    });
});

describe("generate with the Tailwind target", () => {
    const generateInto = async (
        root: string,
        loaded: CoreConfig,
        options: TailwindCodegenOptions,
        components?: readonly string[],
        check = false,
    ) =>
        generate<TailwindCodegenOptions>({
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
        expect(
            readFileSync(join(root, ".pureform", STYLESHEET_FILE), "utf8"),
        ).toMatch(
            /^\/\* Generated by pureform: do not edit\. .* \*\/\n\/\* pureform-hash: [0-9a-f]{16} \*\/\n\n@custom-variant motion-reduce/,
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
        const read = (path: string) =>
            readFileSync(join(root, ".pureform", path), "utf8");

        it(
            "registers every component, with the CSS adapter's modules",
            { timeout: 60_000 },
            async () => {
                expect(generated.registry.names).toEqual(
                    Object.keys(preset.components),
                );
                const css = await cssCodegen.codegen(
                    context(options, Object.keys(preset.components), preset),
                );
                for (const module of css.components) {
                    expect(body(read(module.path))).toBe(module.contents);
                }
            },
        );

        it(
            "gives the plugin's classes for every combination of every group's values (or an even spread through them)",
            { timeout: 60_000 },
            async () => {
                let count = 0;
                const mismatches: unknown[] = [];
                for (const [name, spec] of Object.entries(preset.components)) {
                    const factory = factoryOf(generated, name);
                    const old = runtimeSlots(spec, options);
                    for (const selection of selections(
                        componentShape(spec).variants,
                    )) {
                        const result = slotClasses(factory(selection));
                        const expected = old(selection);
                        // Comparing serialized forms first keeps this hot loop fast; only differences are kept.
                        if (
                            JSON.stringify(result) !== JSON.stringify(expected)
                        ) {
                            mismatches.push({
                                name,
                                selection,
                                actual: result,
                                expected,
                            });
                        }
                        count++;
                    }
                }
                expect(mismatches).toEqual([]);
                expect(count).toBeGreaterThan(20_000);
            },
        );

        it(
            "writes compileTailwind's stylesheet for the config",
            { timeout: 60_000 },
            async () => {
                expect(body(read(STYLESHEET_FILE))).toBe(
                    compileTailwind(preset, options),
                );
            },
        );

        it(
            "keeps every component rule through Tailwind's compiler, which never sees the classes",
            { timeout: 60_000 },
            async () => {
                const built = styledClasses(await build(read(STYLESHEET_FILE)));
                expect(built).toEqual(
                    styledClasses(compileCss(preset, options)),
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
                expect([...built].filter((c) => !returned.has(c))).toEqual([]);
            },
        );

        it(
            "gives Tailwind's scanner nothing to make utilities of in the generated modules",
            { timeout: 60_000 },
            async () => {
                const modules = [
                    "index.ts",
                    ...readdirSync(join(root, ".pureform", "web")).map(
                        (file) => `web/${file}`,
                    ),
                ];
                const candidates = [
                    ...new Set(
                        modules.flatMap((path) =>
                            read(path).split(/[^\w:./[\]#%-]+/),
                        ),
                    ),
                ].filter(Boolean);
                const css = read(STYLESHEET_FILE);
                expect(await build(css, candidates)).toBe(await build(css));
            },
        );
    });
});
