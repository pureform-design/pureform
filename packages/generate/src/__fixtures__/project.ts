// Test fixtures: a temporary app root, a small config, and a fake adapter.

import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import type { CoreConfig } from "@pureform/core/types";

import { defineCodegen } from "../adapter";
import type { CodegenAdapter, CodegenContext } from "../adapter";

/** A fresh, empty directory to act as an app's root. */
export const tempRoot = (): string =>
    mkdtempSync(join(tmpdir(), "pureform-generate-"));

/** Writes files under a root: path → contents, or an object written as JSON. */
export const writeTree = (
    root: string,
    files: Record<string, string | object>,
): void => {
    for (const [path, contents] of Object.entries(files)) {
        const file = join(root, path);
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(
            file,
            typeof contents === "string"
                ? contents
                : JSON.stringify(contents, null, 4),
        );
    }
};

/** An installed package's files for `writeTree`. */
export const installed = (
    name: string,
    version: string,
    extra: object = {},
): Record<string, object> => ({
    [`node_modules/${name}/package.json`]: { name, version, ...extra },
});

/** A config with a slotted button, a single-slot chip, and two themes. */
export const fixtureConfig = (): CoreConfig =>
    ({
        tokens: {},
        semanticTokens: {},
        themes: { teal: {}, dense: {} },
        components: {
            button: {
                kind: "slotComponent",
                name: "button",
                slots: ["root", "label"],
                tokens: {
                    radius: { kind: "raw", value: "4px" },
                    gap: { kind: "raw", value: "8px" },
                },
                recipe: {
                    base: { root: {}, label: {} },
                    variants: {
                        variant: { filled: {}, text: {} },
                        toggle: { true: {}, false: {} },
                    },
                    defaultVariants: { variant: "filled", toggle: "false" },
                },
            },
            chip: {
                kind: "component",
                name: "chip",
                recipe: { base: {} },
            },
        },
    }) as unknown as CoreConfig;

export interface FakeOptions {
    prefix?: string;
}

/** A web adapter writing one module per component and a stylesheet, counting its calls. */
export const fakeAdapter = (
    platform: "web" | "native" = "web",
): CodegenAdapter<FakeOptions> & {
    calls: CodegenContext<FakeOptions>[];
} => {
    const calls: CodegenContext<FakeOptions>[] = [];
    const adapter = defineCodegen<FakeOptions>({
        name: "fake",
        platform,
        codegen: (context) => {
            calls.push(context);
            const prefix = context.options.prefix ?? "";
            return {
                components: context.components.map((name) => ({
                    name,
                    path: `${platform}/${name}.ts`,
                    contents: `export const ${name} = () => ({ root: { class: "${prefix}${name}" } });\n`,
                })),
                files: [
                    {
                        path: "fake.css",
                        contents: context.components
                            .map((name) => `.${prefix}${name} {}`)
                            .join("\n"),
                    },
                ],
            };
        },
    });
    return Object.assign(adapter, { calls });
};
