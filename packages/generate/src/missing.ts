// The missing-output error. When `.pureform/` hasn't been generated, importing it would fail with a
// bare module-not-found; whatever notices first (the bundler plugin resolving an import into the
// folder, the CLI, a test setup) raises this instead, naming the two ways to generate it.

import { existsSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { GenerateError } from "./errors";
import { INDEX_FILE } from "./registry-index";

/** The message for a missing generated registry: `outDir` as the app names it, and the importing
 *  file when known. */
export const missingOutputMessage = (
    outDir: string,
    importer?: string,
): string =>
    [
        `pureform: the generated registry in ${outDir} is missing${importer ? ` (imported from ${importer})` : ""}.`,
        "Generate it with `pureform generate` from @pureform/cli (for tsc, lint, and tests, for example in the `prepare` script),",
        "or add the pureform plugin from @pureform/bundler to the bundler's config, which writes it when dev or build starts.",
    ].join("\n");

/** Throws the missing-output error when `outDir` has no registry index. */
export const assertGenerated = (
    outDir: string,
    options: { root?: string; importer?: string } = {},
): void => {
    const root = resolve(options.root ?? process.cwd());
    const dir = resolve(root, outDir);
    if (existsSync(join(dir, INDEX_FILE))) return;
    const shown = relative(root, dir) || ".";
    throw new GenerateError(
        "missing-output",
        missingOutputMessage(`${shown}/`, options.importer),
    );
};
