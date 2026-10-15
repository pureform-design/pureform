// Ahead-of-time output: the stylesheet, and each component's class name function as a module
// holding only its manifest and the runtime import, with declarations typed from the manifest's
// literal values.

import type { CoreConfig } from "@pureform/core/types";

import { manifestOf } from "./classes";
import type { CssOptions } from "./options";
import type { ComponentManifest } from "./runtime";
import { compileCss } from "./stylesheet";

export interface GenerateOptions extends CssOptions {
    /** Pass the stylesheet through a post-process, such as Lightning CSS, before it's
     *  written. */
    transform?: (css: string) => string | Promise<string>;
    /** Where the generated modules import the runtime from. Default
     *  `@pureform/css-adapter/runtime`. */
    runtime?: string;
    /** Compile the stylesheet another way, as other adapters do. Default `compileCss`. */
    compile?: (config: CoreConfig) => string;
}

/** The generated files' contents. */
export interface Generated {
    css: string;
    js: string;
    dts: string;
}

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

const union = (values: readonly string[]): string =>
    values.length > 0
        ? values.map((v) => JSON.stringify(v)).join(" | ")
        : "never";

const variantsType = (manifest: ComponentManifest): string => {
    const groups = Object.entries(manifest.variants);
    if (groups.length === 0) return "{}";
    return `{ ${groups.map(([group, values]) => `${JSON.stringify(group)}: ${union(values)}`).join("; ")} }`;
};

/** Generate the stylesheet and the class name modules for a config. */
export const generate = async (
    config: CoreConfig,
    options: GenerateOptions = {},
): Promise<Generated> => {
    const runtime = options.runtime ?? "@pureform/css-adapter/runtime";
    const css = (options.compile ?? ((c) => compileCss(c, options)))(config);
    const manifests = Object.entries(config.components).map(([name, spec]) => {
        if (!IDENTIFIER.test(name)) {
            throw new Error(`component "${name}" is not a valid export name`);
        }
        return [name, manifestOf(spec, options)] as const;
    });
    const js = [
        `import { componentClasses } from ${JSON.stringify(runtime)};`,
        "",
        ...manifests.map(
            ([name, manifest]) =>
                `export const ${name} = /* @__PURE__ */ componentClasses(${JSON.stringify(manifest)});`,
        ),
        "",
    ].join("\n");
    const dts = [
        `import type { ComponentClasses } from ${JSON.stringify(runtime)};`,
        "",
        ...manifests.map(
            ([name, manifest]) =>
                `export declare const ${name}: ComponentClasses<${variantsType(manifest)}, ${union(manifest.slots ?? [])}>;`,
        ),
        "",
    ].join("\n");
    return {
        css: options.transform ? await options.transform(css) : css,
        js,
        dts,
    };
};
