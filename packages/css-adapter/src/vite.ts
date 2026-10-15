// A Vite plugin serving the generated output as virtual modules:
//
//   import "virtual:pureform.css";
//   import { button } from "virtual:pureform/recipes";
//
// Vite processes the stylesheet like any other, so its Lightning CSS transformer applies.

import { writeFile } from "node:fs/promises";

import type { CoreConfig } from "@pureform/core/types";
import type { Plugin } from "vite";

import { generate } from "./generate";
import type { GenerateOptions } from "./generate";

export interface PureformPluginOptions extends GenerateOptions {
    /** The config, or a function returning it. */
    config: CoreConfig | (() => CoreConfig | Promise<CoreConfig>);
    /** Write the recipes module's declarations here, so TypeScript knows
     *  `virtual:pureform/recipes`. */
    dts?: string;
}

const CSS_ID = "virtual:pureform.css";
const RECIPES_ID = "virtual:pureform/recipes";
// Vite's convention for virtual ids, so other plugins leave them alone. The stylesheet's id
// keeps its extension, so Vite treats it as CSS.
const resolved = (id: string) => `\0${id}`;

/** Serve a config's stylesheet and class name functions as virtual modules. */
export const pureformCss = (options: PureformPluginOptions): Plugin => {
    let output: ReturnType<typeof generate> | undefined;
    const generated = () => {
        output ??= (async () => {
            const config =
                typeof options.config === "function"
                    ? await options.config()
                    : options.config;
            const result = await generate(config, options);
            if (options.dts) {
                await writeFile(
                    options.dts,
                    `declare module "${RECIPES_ID}" {\n${result.dts
                        .split("\n")
                        .filter(Boolean)
                        .map(
                            (line) =>
                                `    ${line.replace("export declare", "export")}`,
                        )
                        .join("\n")}\n}\n`,
                );
            }
            return result;
        })();
        return output;
    };
    return {
        name: "pureform-css",
        resolveId: (id) =>
            id === CSS_ID || id === RECIPES_ID ? resolved(id) : undefined,
        load: async (id) => {
            if (id === resolved(CSS_ID)) return (await generated()).css;
            if (id === resolved(RECIPES_ID)) return (await generated()).js;
            return undefined;
        },
    };
};
