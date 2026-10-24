// `generateTargets`: one config, several targets. Each target's registry goes to
// `.pureform/<target>/full/` (every allowed component and variant, for dev servers and the
// editor) and, for builds, `.pureform/<target>/pruned/` (what the app uses), so dev and build
// never overwrite each other. The top of `.pureform/` holds stable entries that re-export the
// default target's `full/` (`index.ts`, `panda.ts`, `styles.css`, …), the one `registry.d.ts`,
// and, with several targets, an entry per target (`.pureform/<target>.ts`). Bundlers redirect
// imports of the entries to the folder a build wants (see `entryFile`).

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import type { CoreConfig } from "@pureform/core/types";

import type { CodegenAdapter, Platform, Target } from "./adapter";
import { loadConfig } from "./config";
import { GenerateError } from "./errors";
import { DEFAULT_OUT_DIR, generate, tsconfigHint } from "./generate";
import type { GenerateOptions, GenerateResult } from "./generate";
import { hashOf, withHeader } from "./hash";
import type { ImportRuleOptions } from "./imports";
import { DECLARATIONS_FILE, INDEX_FILE } from "./registry-index";
import { checkTrain, findInstalled } from "./train";
import type { Usage } from "./usage";
import { compareFiles, writeFiles } from "./write";
import type { FileResult, PlannedFile } from "./write";

/** Bumped when the layout or the entries change, so older entries read as stale. */
const LAYOUT_FORMAT = 1;

/** The two outputs a target has: everything, or what the app uses. */
export type OutputKind = "full" | "pruned";

/** The environment variable a pruned build sets, so a top-level `.ts` entry that a tool loads
 *  outside the bundler (Panda's `panda.ts`) gives the pruned output. */
export const OUTPUT_ENV = "PUREFORM_OUTPUT";

/** One target: its adapter, its options, and which components it generates. */
export interface TargetOptions<Options = Record<string, unknown>> {
    /** The target, `"panda"`, `"css"`, `"tailwind"`, or `"native"`, or an adapter. */
    readonly target: Target | CodegenAdapter<Options>;
    /** The adapter's build options, such as the Panda adapter's `prefix`. */
    readonly options?: Options;
    /** The allow-list: generate only these components. Default: every component. */
    readonly components?: readonly string[];
    /** Components whose registry entries load on demand. */
    readonly lazy?: readonly string[];
}

/** The targets to generate: several by name (`targets`), or one (`target` with its
 *  `options`, `components` and `lazy`, named after the target). */
export interface CodegenTargets<Options = Record<string, unknown>> {
    readonly targets?: Readonly<Record<string, TargetOptions<Options>>>;
    readonly target?: Target | CodegenAdapter<Options>;
    readonly options?: Options;
    readonly components?: readonly string[];
    readonly lazy?: readonly string[];
}

export interface GenerateTargetsOptions<Options = Record<string, unknown>>
    extends CodegenTargets<Options> {
    /** The config: a path (loaded with jiti, relative to `root`), or the config itself. */
    readonly config: string | CoreConfig;
    /** The app's root. Default: the working directory. */
    readonly root?: string;
    /** The folder to write, relative to `root`. Default `.pureform`. */
    readonly outDir?: string;
    /** Write `pruned/` too, for this usage (`undefined` keeps every component, as `full/`). */
    readonly pruned?: boolean;
    /** What the app uses, for `pruned/`. One scan serves every target. */
    readonly usage?: Usage;
    /** Compare instead of writing. */
    readonly check?: boolean;
    /** See `GenerateOptions.trainCheck`. Default `true`. */
    readonly trainCheck?: boolean;
    /** See `GenerateOptions.imports`. Default `true`. */
    readonly imports?: boolean | ImportRuleOptions;
}

/** A target's results. */
export interface TargetResult {
    readonly name: string;
    readonly platform: Platform;
    readonly full: GenerateResult;
    readonly pruned?: GenerateResult;
}

export interface GenerateTargetsResult {
    /** The root and the folder written, absolute. */
    readonly root: string;
    readonly outDir: string;
    /** Every target, in the order given; the first web one is the default. */
    readonly targets: readonly TargetResult[];
    /** The default target's name: the one the top-level entries and declarations come from. */
    readonly defaultTarget: string;
    /** The top-level entries, by file (`index.ts`, `panda.ts`, `web.ts`, …): the target and the
     *  file in its folder they stand for. */
    readonly entries: Readonly<Record<string, EntryTarget>>;
    /** Every file's status, relative to `outDir` (`web/full/index.ts`, `index.ts`, …). */
    readonly files: readonly FileResult[];
    readonly changed: boolean;
    /** Check mode: whether everything is up to date. Write mode: always `true`. */
    readonly ok: boolean;
    readonly hints: readonly string[];
    /** The config file and the files it imports, absolute. */
    readonly dependencies: readonly string[];
}

/** What a top-level entry stands for: a target, and a file in its output folders. A per-target
 *  entry (`web.ts`) names its target. */
export interface EntryTarget {
    /** The target, or `undefined` for an entry each import resolves to its own target. */
    readonly target: string | undefined;
    readonly file: string;
}

const NAME = /^[A-Za-z][\w-]*$/;

/** The targets, by name, from the options' `targets` or `target`. */
export const targetsOf = <Options>(
    options: CodegenTargets<Options>,
): [string, TargetOptions<Options>][] => {
    if (options.targets !== undefined) {
        if (options.target !== undefined) {
            throw new GenerateError(
                "components",
                "pureform: pass either `target` or `targets`, not both.",
            );
        }
        const list = Object.entries(options.targets);
        if (list.length === 0) {
            throw new GenerateError(
                "components",
                "pureform: `targets` names no target.",
            );
        }
        return list;
    }
    if (options.target === undefined) {
        throw new GenerateError(
            "adapter-invalid",
            "pureform: no target to generate for: pass `target` or `targets`.",
        );
    }
    const name =
        typeof options.target === "string"
            ? options.target
            : options.target.name;
    return [
        [
            name,
            {
                target: options.target,
                ...(options.options !== undefined && {
                    options: options.options,
                }),
                ...(options.components !== undefined && {
                    components: options.components,
                }),
                ...(options.lazy !== undefined && { lazy: options.lazy }),
            },
        ],
    ];
};

const toSpecifier = (path: string) => path.replace(/\.(?:tsx?|m?js)$/, "");

// The names a module exports: values and types, as generated modules write them.
const exportNames = (source: string) => {
    const values = new Set<string>();
    const types = new Set<string>();
    for (const match of source.matchAll(
        /^export\s+(?:declare\s+)?(?:const|let|var|async\s+function\*?|function\*?|class|enum)\s+([A-Za-z_$][\w$]*)/gm,
    )) {
        values.add(match[1]!);
    }
    for (const match of source.matchAll(
        /^export\s+(?:declare\s+)?(?:type|interface)\s+([A-Za-z_$][\w$]*)/gm,
    )) {
        types.add(match[1]!);
    }
    return { values: [...values], types: [...types] };
};

// A top-level entry's contents: the default target's `full/` file, re-exported. A script other
// than the index, which tools such as Panda load outside the bundler, picks `pruned/` when a
// pruned build says so in `OUTPUT_ENV` and `pruned/` has it.
const entryContents = (
    outDir: string,
    target: string,
    file: string,
    index: boolean,
): string | undefined => {
    const full = `./${target}/full/${file}`;
    if (file.endsWith(".css")) return `@import "${full}";\n`;
    if (!/\.(?:tsx?|m?js)$/.test(file)) return undefined;
    const pruned = join(outDir, target, "pruned", file);
    if (index || !existsSync(pruned)) {
        return `export * from "${toSpecifier(full)}";\n`;
    }
    const source = readFileSync(join(outDir, target, "full", file), "utf8");
    const { values, types } = exportNames(source);
    return [
        `import * as full from "${toSpecifier(full)}";`,
        `import * as pruned from "./${target}/pruned/${toSpecifier(file)}";`,
        "",
        `// A pruned build sets ${OUTPUT_ENV}; dev servers and the editor see the full output.`,
        "const env = (",
        "    globalThis as { process?: { env?: Record<string, string | undefined> } }",
        ").process?.env;",
        `const chosen = (env?.["${OUTPUT_ENV}"] === "pruned" ? pruned : full) as typeof full;`,
        "",
        ...values.map((name) => `export const ${name} = chosen.${name};`),
        ...(types.length > 0
            ? [`export type { ${types.join(", ")} } from "${toSpecifier(full)}";`]
            : []),
        "",
    ].join("\n");
};

/** Generates every target's `full/` (and `pruned/` when asked), then the top-level entries and
 *  declarations, or checks them (`check: true`). */
export const generateTargets = async <Options = Record<string, unknown>>(
    options: GenerateTargetsOptions<Options>,
): Promise<GenerateTargetsResult> => {
    const root = resolve(options.root ?? process.cwd());
    const outDir = resolve(root, options.outDir ?? DEFAULT_OUT_DIR);
    const list = targetsOf(options);
    for (const [name] of list) {
        if (!NAME.test(name) || name === "index" || name === "registry") {
            throw new GenerateError(
                "components",
                `pureform: the target name "${name}" can't name a folder and an entry; use letters, digits, "-" and "_", and not "index" or "registry".`,
            );
        }
    }

    if (options.trainCheck !== false) {
        const train = checkTrain(findInstalled(root));
        if (train.message) {
            throw new GenerateError("train-mismatch", train.message);
        }
    }
    const loaded =
        typeof options.config === "string"
            ? await loadConfig(options.config, {
                  root,
                  imports: options.imports ?? true,
              })
            : undefined;
    const config = loaded?.config ?? (options.config as CoreConfig);

    const targets: TargetResult[] = [];
    const files: FileResult[] = [];
    const run = async (
        name: string,
        target: TargetOptions<Options>,
        kind: OutputKind,
    ) => {
        const result = await generate<Options>({
            ...target,
            config,
            root,
            outDir: join(outDir, name, kind),
            trainCheck: false,
            declarations: false,
            ...(kind === "pruned" &&
                options.usage !== undefined && { usage: options.usage }),
            ...(options.check && { check: true }),
        } as GenerateOptions<Options>);
        for (const file of result.files) {
            files.push({ ...file, path: `${name}/${kind}/${file.path}` });
        }
        return result;
    };
    for (const [name, target] of list) {
        const full = await run(name, target, "full");
        const pruned = options.pruned
            ? await run(name, target, "pruned")
            : undefined;
        targets.push({
            name,
            platform: full.platform,
            full,
            ...(pruned && { pruned }),
        });
    }

    const main =
        targets.find((target) => target.platform !== "native") ?? targets[0]!;
    const entries: Record<string, EntryTarget> = {};
    const planned: PlannedFile[] = [];
    const hash = hashOf({
        format: LAYOUT_FORMAT,
        targets: targets.map((target) => [target.name, target.full.hash]),
    });
    const add = (path: string, contents: string) =>
        planned.push({
            path,
            contents: withHeader(path, contents, hash),
            header: true,
        });

    // Each target's root files (the index, Panda's `panda.ts`, a stylesheet), the default
    // target's first, so an entry another target has too stands for the default one.
    for (const target of [main, ...targets.filter((item) => item !== main)]) {
        for (const file of target.full.files) {
            if (file.path.includes("/") || file.status === "removed") continue;
            if (file.path in entries) continue;
            const contents = entryContents(
                outDir,
                target.name,
                file.path,
                file.path === INDEX_FILE,
            );
            if (contents === undefined) continue;
            entries[file.path] = {
                // The index resolves per import; the others belong to the target that has them.
                target: file.path === INDEX_FILE ? undefined : target.name,
                file: file.path,
            };
            add(file.path, contents);
        }
    }
    if (targets.length > 1) {
        for (const target of targets) {
            const path = `${target.name}.ts`;
            if (path in entries) {
                throw new GenerateError(
                    "components",
                    `pureform: the target name "${target.name}" clashes with the generated entry "${path}"; rename the target.`,
                );
            }
            entries[path] = { target: target.name, file: INDEX_FILE };
            add(path, `export * from "./${target.name}/full/index";\n`);
        }
    }
    // One augmentation for every target, from the default target's full output: the config is
    // shared, so variants, slots and tokens agree, and full is a superset of pruned.
    if (main.full.declarations) add(DECLARATIONS_FILE, main.full.declarations);

    const names = new Set(targets.map((target) => target.name));
    const keep = (path: string) => {
        const [folder, kind] = path.split("/");
        return (
            names.has(folder!) && (kind === "full" || kind === "pruned")
        );
    };
    const top = options.check
        ? await compareFiles(outDir, planned, hash, keep)
        : await writeFiles(outDir, planned, keep);
    files.push(...top);

    const hint = tsconfigHint(root, outDir);
    const changed = files.some((file) => file.status !== "unchanged");
    return {
        root,
        outDir,
        targets,
        defaultTarget: main.name,
        entries,
        files,
        changed,
        ok: options.check ? !changed : true,
        hints: hint ? [hint] : [],
        dependencies: loaded?.dependencies ?? [],
    };
};

/** The file a top-level entry stands for, for a target and an output kind, absolute; or
 *  `undefined` when `path` isn't one of the entries. `path` is absolute, with or without its
 *  extension; `outDir` itself is the index. */
export const entryFile = (
    result: Pick<GenerateTargetsResult, "outDir" | "entries" | "targets">,
    path: string,
    target: string,
    kind: OutputKind,
): string | undefined => {
    const { outDir } = result;
    let name: string | undefined;
    if (path === outDir) name = INDEX_FILE;
    else if (path.startsWith(outDir) && !path.slice(outDir.length + 1).match(/[\\/]/)) {
        const base = path.slice(outDir.length + 1);
        name =
            base in result.entries
                ? base
                : Object.keys(result.entries).find(
                      (entry) => toSpecifier(entry) === base,
                  );
    }
    if (name === undefined) return undefined;
    const entry = result.entries[name];
    if (!entry) return undefined;
    const chosen = entry.target ?? target;
    const owner = result.targets.find((item) => item.name === chosen);
    if (!owner) return undefined;
    const folder = kind === "pruned" && owner.pruned ? "pruned" : "full";
    return join(outDir, chosen, folder, entry.file);
};
