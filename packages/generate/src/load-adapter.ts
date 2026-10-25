// Finding a target's adapter: its package's `/codegen` subpath, resolved from the app's root so
// the app's installed adapter is the one used.

import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { TARGET_PACKAGES } from "./adapter";
import type { CodegenAdapter, Target } from "./adapter";
import { GenerateError } from "./errors";

const isAdapter = (value: unknown): value is CodegenAdapter =>
    typeof value === "object" &&
    value !== null &&
    typeof (value as CodegenAdapter).codegen === "function" &&
    typeof (value as CodegenAdapter).name === "string" &&
    ((value as CodegenAdapter).platform === "web" ||
        (value as CodegenAdapter).platform === "native");

/** Loads a target's adapter from `<package>/codegen`, as installed for `root`: its `codegen`
 *  export, or its default export. */
export const loadAdapter = async (
    target: Target,
    root: string,
): Promise<CodegenAdapter> => {
    const name = TARGET_PACKAGES[target];
    if (name === undefined) {
        throw new GenerateError(
            "adapter-not-found",
            `pureform: there's no target "${target}"; use one of ${Object.keys(TARGET_PACKAGES).join(", ")}.`,
        );
    }
    const specifier = `${name}/codegen`;
    let file: string;
    try {
        file = createRequire(join(root, "package.json")).resolve(specifier);
    } catch (error) {
        throw new GenerateError(
            "adapter-not-found",
            `pureform: the "${target}" target needs ${name} (its /codegen subpath), which isn't installed for ${root}. Install ${name} at the core's version.`,
            { cause: error },
        );
    }
    const module = (await import(pathToFileURL(file).href)) as {
        codegen?: unknown;
        default?: unknown;
    };
    const adapter = module.codegen ?? module.default;
    if (!isAdapter(adapter)) {
        throw new GenerateError(
            "adapter-invalid",
            `pureform: ${specifier} should export \`codegen\`, a CodegenAdapter with a name, a platform, and a codegen function.`,
        );
    }
    return adapter;
};

export { isAdapter };
