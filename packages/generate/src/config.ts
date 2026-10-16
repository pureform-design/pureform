// Loading `pureform.config.ts` the way build tools do: with jiti, fresh on every call so a watcher
// sees edits, after checking the import rules.

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import type { CoreConfig } from "@pureform/core/types";
import { createJiti } from "jiti";

import { GenerateError } from "./errors";
import { formatImportViolations, scanConfigImports } from "./imports";
import type { ImportRuleOptions } from "./imports";

export interface LoadConfigOptions {
    /** The directory a relative path is resolved against. Default: the working directory. */
    readonly root?: string;
    /** Check the import rules first (default), with these options, or not at all (`false`). */
    readonly imports?: boolean | ImportRuleOptions;
}

export interface LoadedConfig {
    readonly config: CoreConfig;
    /** The config file, absolute. */
    readonly file: string;
    /** The config and every file it imports through relative paths: what to watch. */
    readonly dependencies: readonly string[];
}

const isConfig = (value: unknown): value is CoreConfig =>
    typeof value === "object" &&
    value !== null &&
    typeof (value as { components?: unknown }).components === "object" &&
    (value as { components?: unknown }).components !== null;

/** Loads a config file's default export, checking the import rules first. */
export const loadConfig = async (
    path: string,
    options: LoadConfigOptions = {},
): Promise<LoadedConfig> => {
    const file = resolve(options.root ?? process.cwd(), path);
    if (!existsSync(file)) {
        throw new GenerateError(
            "config-not-found",
            `pureform: no config at ${file}. Create it with \`export default defineConfig(…)\` from @pureform/core, or point the \`config\` option at it.`,
        );
    }
    const imports = scanConfigImports(
        file,
        typeof options.imports === "object" ? options.imports : {},
    );
    if (options.imports !== false && imports.violations.length > 0) {
        throw new GenerateError(
            "config-imports",
            formatImportViolations(imports.violations, options.root),
        );
    }
    // jiti transforms the config itself under every runtime (it imports natively under Bun by
    // default): the hash reads functions' source, which must not depend on who ran the build.
    const jiti = createJiti(pathToFileURL(file).href, {
        moduleCache: false,
        fsCache: false,
        interopDefault: false,
        tryNative: false,
    });
    let loaded: unknown;
    try {
        loaded = (await jiti.import<{ default?: unknown }>(file)).default;
    } catch (error) {
        throw new GenerateError(
            "config-load",
            `pureform: loading the config at ${file} failed: ${error instanceof Error ? error.message : String(error)}`,
            { cause: error },
        );
    }
    if (!isConfig(loaded)) {
        const exported =
            loaded === undefined
                ? "nothing"
                : typeof loaded === "object" && loaded !== null
                  ? "an object without `components`"
                  : loaded === null
                    ? "null"
                    : `a ${typeof loaded}`;
        throw new GenerateError(
            "config-export",
            `pureform: the config at ${file} should default-export a config (\`export default defineConfig(…)\`), and exported ${exported}.`,
        );
    }
    return { config: loaded, file, dependencies: imports.files };
};
