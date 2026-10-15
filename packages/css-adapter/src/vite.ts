// A Vite plugin serving the generated output as virtual modules:
//
//   import "virtual:pureform.css";
//   import { button } from "virtual:pureform/components";
//
// Vite processes the stylesheet like any other, so its Lightning CSS transformer applies.
// Other adapters build their plugins on `pureformPlugin`, compiling the stylesheet their own
// way (the `compile` option) and writing it to disk for tools that can't read virtual modules.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import type { CoreConfig } from "@pureform/core/types";
import type { Plugin } from "vite";

import { generate } from "./generate";
import type { GenerateOptions, Generated } from "./generate";

export interface PureformPluginOptions extends GenerateOptions {
    /** The config, or a function returning it. */
    config: CoreConfig | (() => CoreConfig | Promise<CoreConfig>);
    /** Write the components module's declarations here, so TypeScript knows
     *  `virtual:pureform/components`. */
    dts?: string;
}

/** How an adapter's plugin differs from the CSS adapter's. */
export interface PluginTarget {
    /** The plugin's name. */
    name: string;
    /** Write the stylesheet to this path instead of serving it as `virtual:pureform.css`. */
    outFile?: string;
}

const CSS_ID = "virtual:pureform.css";
const COMPONENTS_ID = "virtual:pureform/components";
// Vite's convention for virtual ids, so other plugins leave them alone. The stylesheet's id
// keeps its extension, so Vite treats it as CSS.
const resolved = (id: string) => `\0${id}`;

/** Write a file only when its contents change, so watchers don't reload for nothing. */
export const writeIfChanged = async (
    path: string,
    content: string,
): Promise<boolean> => {
    const current = await readFile(path, "utf8").catch(() => undefined);
    if (current === content) return false;
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content);
    return true;
};

/** the components module's declarations, as an ambient module for its virtual id. */
export const componentsModuleDts = (dts: string): string =>
    `declare module "${COMPONENTS_ID}" {\n${dts
        .split("\n")
        .filter(Boolean)
        .map((line) => `    ${line.replace("export declare", "export")}`)
        .join("\n")}\n}\n`;

/** Serve a config's class name functions as a virtual module, and its stylesheet as another
 *  or as a file. */
export const pureformPlugin = (
    options: PureformPluginOptions,
    target: PluginTarget,
): Plugin => {
    let output: Promise<Generated> | undefined;
    const generated = () => {
        output ??= (async () => {
            const config =
                typeof options.config === "function"
                    ? await options.config()
                    : options.config;
            const result = await generate(config, options);
            await Promise.all([
                options.dts &&
                    writeIfChanged(
                        options.dts,
                        componentsModuleDts(result.dts),
                    ),
                target.outFile && writeIfChanged(target.outFile, result.css),
            ]);
            return result;
        })();
        return output;
    };
    return {
        name: target.name,
        // Before other plugins, so a written stylesheet exists when they read it.
        enforce: "pre",
        buildStart: async () => {
            await generated();
        },
        resolveId: (id) =>
            (id === CSS_ID && !target.outFile) || id === COMPONENTS_ID
                ? resolved(id)
                : undefined,
        load: async (id) => {
            if (id === resolved(CSS_ID)) return (await generated()).css;
            if (id === resolved(COMPONENTS_ID)) return (await generated()).js;
            return undefined;
        },
    };
};

/** Serve a config's stylesheet and class name functions as virtual modules. */
export const pureformCss = (options: PureformPluginOptions): Plugin =>
    pureformPlugin(options, { name: "pureform-css" });
