/// <reference types="node" />
// pureform's Metro transformer. A `*.pureform.*` file runs in Node, and the styles it exports
// replace it; every other file goes through the Babel transformer `withPureform` wrapped. Set
// up by `withPureform` from `@pureform/rn-adapter/metro`.

import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";

import { createJiti } from "jiti";

import { OPTIONS_ENV } from "./metro-options";
import type { TransformerOptions } from "./metro-options";

const require_ = createRequire(import.meta.url);

/** The files whose styles are precomputed while bundling. */
export const PUREFORM_FILE = /\.pureform\.(?:[cm]?[jt]sx?)$/;

interface Upstream {
    transform: (props: TransformProps) => unknown;
    getCacheKey?: () => string;
}

export interface TransformProps {
    /** Relative to the project root. */
    filename: string;
    src: string;
    options: { projectRoot?: string };
    [key: string]: unknown;
}

const options = (): TransformerOptions => {
    const raw = process.env[OPTIONS_ENV];
    if (!raw) {
        throw new Error(
            "pureform's Metro transformer runs through withPureform from @pureform/rn-adapter/metro",
        );
    }
    return JSON.parse(raw) as TransformerOptions;
};

let upstream: Upstream | undefined;
const babel = (): Upstream =>
    (upstream ??= require_(options().upstream) as Upstream);

/** The styles a pureform file exports, as module source: it runs in Node, with TypeScript
 *  and its imports loaded by jiti, fresh each time. */
export const precomputedSource = async (filename: string): Promise<string> => {
    const jiti = createJiti(import.meta.url, {
        moduleCache: false,
        fsCache: false,
    });
    const styles = await jiti.import(filename, { default: true });
    if (typeof styles !== "object" || styles === null) {
        throw new Error(
            `${filename} should default-export precompute(config, options), and exported ${typeof styles}`,
        );
    }
    return `// Precomputed by pureform from ${filename.split(/[\\\\/]/).at(-1)}.\nexport default ${JSON.stringify(styles)};\n`;
};

/** Metro's transform: a pureform file's precomputed styles, then whatever Babel makes of
 *  them, or the file as Babel makes it. */
export const transform = async (props: TransformProps) =>
    babel().transform(
        PUREFORM_FILE.test(props.filename)
            ? {
                  ...props,
                  src: await precomputedSource(
                      resolve(props.options.projectRoot ?? "", props.filename),
                  ),
              }
            : props,
    );

// Every file under a path, in a stable order.
const filesUnder = (path: string): string[] => {
    const stat = statSync(path, { throwIfNoEntry: false });
    if (!stat) return [];
    if (!stat.isDirectory()) return [path];
    return readdirSync(path)
        .filter((name) => name !== "node_modules" && !name.startsWith("."))
        .sort()
        .flatMap((name) => filesUnder(join(path, name)));
};

/** Metro's cache key: Babel's, and the contents of what `withPureform` was told to watch, so a
 *  config change precomputes again on Metro's next start. */
export const getCacheKey = (): string => {
    const hash = createHash("sha1");
    hash.update(babel().getCacheKey?.() ?? "");
    hash.update(readFileSync(new URL(import.meta.url)));
    for (const file of options().watch.flatMap(filesUnder)) {
        hash.update(file);
        hash.update(readFileSync(file));
    }
    return hash.digest("hex");
};
