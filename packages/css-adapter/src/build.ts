// Write the ahead-of-time output to a directory: `styles.css`, and `recipes.js` with its
// declarations in `recipes.d.ts`.

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { CoreConfig } from "@pureform/core/types";

import { generate } from "./generate";
import type { GenerateOptions } from "./generate";

export interface BuildOptions extends GenerateOptions {
    /** The directory to write to, created if missing. */
    outDir: string;
}

/** Write a config's stylesheet and class name modules to `outDir`. Returns the paths
 *  written. */
export const buildCss = async (
    config: CoreConfig,
    options: BuildOptions,
): Promise<string[]> => {
    const { css, js, dts } = await generate(config, options);
    await mkdir(options.outDir, { recursive: true });
    const files: [string, string][] = [
        ["styles.css", css],
        ["recipes.js", js],
        ["recipes.d.ts", dts],
    ];
    return Promise.all(
        files.map(async ([name, content]) => {
            const path = join(options.outDir, name);
            await writeFile(path, content);
            return path;
        }),
    );
};

export { generate };
export type { GenerateOptions, Generated } from "./generate";
