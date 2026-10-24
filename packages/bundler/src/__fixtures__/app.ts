// Test fixtures: a temporary app with a config and a fake adapter.

import {
    mkdirSync,
    mkdtempSync,
    readFileSync,
    symlinkSync,
    writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

import { defineCodegen } from "@pureform/generate";
import type { CodegenAdapter, CodegenContext } from "@pureform/generate";

/** Writes files under a root. */
export const writeTree = (
    root: string,
    files: Record<string, string>,
): void => {
    for (const [path, contents] of Object.entries(files)) {
        const file = join(root, path);
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, contents);
    }
};

/** A config naming these components, all single-slot. */
export const configSource = (...names: string[]): string =>
    `import { parts } from "./parts";\nexport default { tokens: {}, semanticTokens: {}, themes: { teal: {} }, components: { ${names.map((name) => `${name}: parts.${name}`).join(", ")} } };\n`;

const partsSource = `const part = (name) => ({ kind: "component", name, recipe: { base: {} } });\nexport const parts = { chip: part("chip"), divider: part("divider"), badge: part("badge") };\n`;

/** A fresh app root with a config of `names` and `@pureform/styling` linked in. */
export const tempApp = (...names: string[]): string => {
    const root = mkdtempSync(join(tmpdir(), "pureform-bundler-"));
    writeTree(root, {
        "pureform.config.ts": configSource(...names),
        "parts.ts": partsSource,
        "main.ts": `import { registry, themes } from "virtual:pureform/registry";\nexport const names = registry.names;\nexport const classes = registry.names.map((name) => registry.entry(name).factory({}));\nexport { themes };\n`,
    });
    mkdirSync(join(root, "node_modules/@pureform"), { recursive: true });
    symlinkSync(
        resolve(__dirname, "../../../styling"),
        join(root, "node_modules/@pureform/styling"),
    );
    return root;
};

/** Reads a file under an app's `.pureform/`. */
export const outputFile = (root: string, path: string): string =>
    readFileSync(join(root, ".pureform", path), "utf8");

/** A web adapter writing one module per component, counting its calls. */
export const fakeAdapter = (
    platform: "web" | "native" = "web",
    name = "fake",
): CodegenAdapter<{ prefix?: string }> & {
    calls: CodegenContext<{ prefix?: string }>[];
} => {
    const calls: CodegenContext<{ prefix?: string }>[] = [];
    const adapter = defineCodegen<{ prefix?: string }>({
        name,
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
                        path: "styles.css",
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

/** Waits until a check passes, polling. */
export const eventually = async (
    check: () => boolean,
    timeout = 5000,
): Promise<void> => {
    const start = Date.now();
    while (!check()) {
        if (Date.now() - start > timeout) throw new Error("timed out");
        await new Promise((done) => setTimeout(done, 20));
    }
};
