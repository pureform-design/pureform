// `generate`: load the config, ask the target's adapter for its factory modules, and write them to
// `.pureform/` with the registry index and its declarations, every file headed by one hash of the
// inputs. The bundler plugin and the CLI both call it, so they can't produce different output.

import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

import type { CoreConfig } from "@pureform/core/types";

import type {
    CodegenAdapter,
    CodegenContext,
    CodegenOutput,
    ComponentShape,
    Target,
} from "./adapter";
import { loadConfig } from "./config";
import { GenerateError } from "./errors";
import { hashOf, withHeader } from "./hash";
import type { ImportRuleOptions } from "./imports";
import { isAdapter, loadAdapter } from "./load-adapter";
import { VERSION } from "./package-version";
import {
    DECLARATIONS_FILE,
    INDEX_FILE,
    isIdentifier,
    registryDeclarations,
    registryIndex,
} from "./registry-index";
import type { GeneratedEntry } from "./registry-index";
import { componentShape } from "./shape";
import { checkTrain, findInstalled } from "./train";
import { normalizeVariants } from "./usage";
import type { Usage } from "./usage";
import { compareFiles, readGenerated, writeFiles } from "./write";
import type { FileResult, PlannedFile } from "./write";

/** Bumped when what `generate` itself writes changes, so older output reads as stale. */
const OUTPUT_FORMAT = 2;

/** The default folder, relative to the root. */
export const DEFAULT_OUT_DIR = ".pureform";

export interface GenerateOptions<Options = Record<string, unknown>> {
    /** The config: a path (loaded with jiti, relative to `root`), or the config itself. */
    readonly config: string | CoreConfig;
    /** The target, whose adapter is loaded from `<adapter package>/codegen`, or an adapter. */
    readonly target: Target | CodegenAdapter<Options>;
    /** The adapter's own build options (`prefix`, …). Part of the hash. */
    readonly options?: Options;
    /** The allow-list: generate only these components, in the config's order. Default: all. */
    readonly components?: readonly string[];
    /** Components whose registry entries load on demand rather than statically. Names that
     *  `usage` leaves out are dropped. */
    readonly lazy?: readonly string[];
    /** What the app uses (the bundler plugin's pruning): the generated registry keeps only the
     *  components it names, within the allow-list, and adapters narrow styles to its variants. */
    readonly usage?: Usage;
    /** The app's root. Default: the working directory. */
    readonly root?: string;
    /** The folder to write, relative to `root`. Default `.pureform`. */
    readonly outDir?: string;
    /** Compare instead of writing: the result lists what's out of date, and `ok` is whether
     *  nothing is. */
    readonly check?: boolean;
    /** Fail when installed core-train packages differ in version, or a binding's peer range
     *  excludes the train. Default `true`. */
    readonly trainCheck?: boolean;
    /** Check the config's import rules when loading it from a path: `true` (default), with
     *  these options, or `false`. */
    readonly imports?: boolean | ImportRuleOptions;
}

export interface GenerateResult {
    /** The root and the folder written, absolute. */
    readonly root: string;
    readonly outDir: string;
    /** The hash in every generated file's header. */
    readonly hash: string;
    /** The core train's version recorded in the generated registry. */
    readonly trainVersion: string;
    /** Every file's status. In check mode without a matching hash, only the stale files: the
     *  adapter isn't run. */
    readonly files: readonly FileResult[];
    /** Write mode: whether anything was written or removed. Check mode: whether anything is
     *  out of date. */
    readonly changed: boolean;
    /** Check mode: whether the folder is up to date. Write mode: always `true`. */
    readonly ok: boolean;
    /** Advice for the app's setup, such as adding the folder to the tsconfig. */
    readonly hints: readonly string[];
    /** The config file and the files it imports, absolute, for watching. Empty for a config
     *  passed as an object. */
    readonly dependencies: readonly string[];
    /** The components generated, in the config's order. */
    readonly components: readonly string[];
}

const toPosix = (path: string): string => path.split(sep).join("/");

const SAFE_PATH = /^(?!\/)(?!.*(?:^|\/)\.\.?(?:\/|$))[\w@$.+\-/]+$/;

const adapterError = (adapter: CodegenAdapter, message: string) =>
    new GenerateError(
        "adapter-output",
        `pureform: the ${adapter.name} adapter's codegen ${message}`,
    );

const checkPath = (adapter: CodegenAdapter, path: string): void => {
    if (!SAFE_PATH.test(path)) {
        throw adapterError(
            adapter,
            `returned the path "${path}"; paths are relative to the output folder, with "/" and no "." or ".." segments.`,
        );
    }
    if (path === INDEX_FILE || path === DECLARATIONS_FILE) {
        throw adapterError(
            adapter,
            `returned "${path}", which generate writes itself.`,
        );
    }
};

// An HTML attribute name the index can write in a string and the stylesheet can match.
const ATTRIBUTE_NAME = /^[a-z][a-z0-9-]*$/;

const checkThemeAttribute = (
    adapter: CodegenAdapter,
    attribute: string | undefined,
): void => {
    if (attribute !== undefined && !ATTRIBUTE_NAME.test(attribute)) {
        throw adapterError(
            adapter,
            `returned the theme attribute ${JSON.stringify(attribute)}; it must be a lowercase attribute name, such as "data-theme".`,
        );
    }
};

const selectComponents = (
    config: CoreConfig,
    option: readonly string[] | undefined,
    label: string,
): string[] => {
    const all = Object.keys(config.components);
    if (option === undefined) return all;
    const unknown = option.filter((name) => !all.includes(name));
    if (unknown.length > 0) {
        throw new GenerateError(
            "components",
            `pureform: the ${label} option names ${unknown.map((name) => `"${name}"`).join(", ")}, which the config doesn't have (it has ${all.map((name) => `"${name}"`).join(", ") || "none"}).`,
        );
    }
    return all.filter((name) => option.includes(name));
};

// The entries the adapter's modules give, checked against what was asked for.
const generatedEntries = (
    adapter: CodegenAdapter,
    output: CodegenOutput,
    components: readonly string[],
    lazy: ReadonlySet<string>,
    shape: (name: string) => ComponentShape,
): GeneratedEntry[] => {
    const byName = new Map(
        output.components.map((module) => [module.name, module]),
    );
    if (byName.size !== output.components.length) {
        throw adapterError(adapter, "returned a component more than once.");
    }
    const extra = [...byName.keys()].filter(
        (name) => !components.includes(name),
    );
    if (extra.length > 0) {
        throw adapterError(
            adapter,
            `returned ${extra.map((name) => `"${name}"`).join(", ")}, which weren't asked for.`,
        );
    }
    return components.map((name) => {
        const module = byName.get(name);
        if (!module) {
            throw adapterError(adapter, `returned no module for "${name}".`);
        }
        checkPath(adapter, module.path);
        if (!/\.(?:tsx?|m?js)$/.test(module.path)) {
            throw adapterError(
                adapter,
                `returned "${module.path}" for "${name}"; a component module is a .ts, .tsx, .js, or .mjs file.`,
            );
        }
        const exportName = module.exportName ?? name;
        if (!isIdentifier(name) || !isIdentifier(exportName)) {
            throw adapterError(
                adapter,
                `returned "${name}" exported as "${exportName}"; both must be valid JavaScript names.`,
            );
        }
        return {
            name,
            path: module.path,
            exportName,
            lazy: lazy.has(name),
            shape: module.shape ?? shape(name),
        };
    });
};

const importPath = (
    root: string,
    outDir: string,
    from: string,
    to: string,
): string => {
    const target = isAbsolute(to) ? to : join(root, to);
    const path = toPosix(relative(dirname(join(outDir, from)), target));
    return path.startsWith("../") ? path : `./${path}`;
};

// The tsconfig hint: TypeScript's globs skip dot folders, so the declarations are invisible
// unless the folder is included by name.
const tsconfigHint = (root: string, outDir: string): string | undefined => {
    const file = join(root, "tsconfig.json");
    if (!existsSync(file)) return undefined;
    const folder = toPosix(relative(root, outDir));
    if (folder.startsWith("../")) return undefined;
    if (tsconfigMentions(file, folder, new Set())) return undefined;
    return `Add "${folder}/**/*" to "include" in tsconfig.json: TypeScript skips folders whose names start with a dot, so it won't see the generated declarations otherwise.`;
};

// Whether a tsconfig, or one it extends by a relative path, names the folder.
const tsconfigMentions = (
    file: string,
    folder: string,
    seen: Set<string>,
): boolean => {
    if (seen.has(file) || !existsSync(file)) return false;
    seen.add(file);
    const text = readFileSync(file, "utf8");
    if (text.includes(folder)) return true;
    const extended = /"extends"\s*:\s*(\[[^\]]*\]|"[^"]*")/.exec(text)?.[1];
    if (!extended) return false;
    return [...extended.matchAll(/"([^"]+)"/g)]
        .map((match) => match[1]!)
        .filter((path) => path.startsWith("."))
        .some((path) =>
            tsconfigMentions(
                resolve(
                    dirname(file),
                    path.endsWith(".json") ? path : `${path}.json`,
                ),
                folder,
                seen,
            ),
        );
};

/** Generates `.pureform/` for a config and a target, or checks it (`check: true`). */
export const generate = async <Options = Record<string, unknown>>(
    options: GenerateOptions<Options>,
): Promise<GenerateResult> => {
    const root = resolve(options.root ?? process.cwd());
    const outDir = resolve(root, options.outDir ?? DEFAULT_OUT_DIR);

    const installed = findInstalled(root);
    const train = checkTrain(installed);
    if (options.trainCheck !== false && train.message) {
        throw new GenerateError("train-mismatch", train.message);
    }
    const trainVersion = train.version ?? VERSION;

    const loaded =
        typeof options.config === "string"
            ? await loadConfig(options.config, {
                  root,
                  imports: options.imports ?? true,
              })
            : undefined;
    const config = loaded?.config ?? (options.config as CoreConfig);

    const adapter = (
        typeof options.target === "string"
            ? await loadAdapter(options.target, root)
            : options.target
    ) as CodegenAdapter<Options>;
    if (!isAdapter(adapter)) {
        throw new GenerateError(
            "adapter-invalid",
            "pureform: the target should be a target name or a CodegenAdapter with a name, a platform, and a codegen function.",
        );
    }

    const usage = options.usage;
    const components = selectComponents(
        config,
        options.components,
        "components",
    ).filter((name) => !usage || usage.components.includes(name));
    const lazy = new Set(
        selectComponents(config, options.lazy ?? [], "lazy").filter(
            (name) => !usage || components.includes(name),
        ),
    );
    const notGenerated = [...lazy].filter((name) => !components.includes(name));
    if (notGenerated.length > 0) {
        throw new GenerateError(
            "components",
            `pureform: the lazy option names ${notGenerated.map((name) => `"${name}"`).join(", ")}, which the components option leaves out.`,
        );
    }
    const adapterOptions = (options.options ?? {}) as Options;

    const shapes = new Map<string, ComponentShape>();
    const shape = (name: string): ComponentShape => {
        const spec = config.components[name];
        if (!spec) {
            throw new GenerateError(
                "components",
                `pureform: the config has no component "${name}".`,
            );
        }
        let found = shapes.get(name);
        if (!found) {
            found = componentShape(spec, config);
            shapes.set(name, found);
        }
        return found;
    };
    const variants = normalizeVariants(usage?.variants, components, shape);

    const hash = hashOf({
        format: OUTPUT_FORMAT,
        config,
        adapter: { name: adapter.name, platform: adapter.platform },
        options: adapterOptions,
        components,
        lazy: [...lazy],
        // Only when it narrows anything, so an unpruned registry keeps its hash.
        ...(Object.keys(variants).length > 0 && { variants }),
        versions: Object.fromEntries(
            installed.map((entry) => [entry.name, entry.version]),
        ),
        generate: VERSION,
    });

    const result = (
        files: FileResult[],
        hints: string[] = [],
    ): GenerateResult => {
        const changed = files.some((file) => file.status !== "unchanged");
        return {
            root,
            outDir,
            hash,
            trainVersion,
            files,
            changed,
            ok: options.check ? !changed : true,
            hints,
            dependencies: loaded?.dependencies ?? [],
            components,
        };
    };

    // Hashes before contents: a missing index or a header made from other inputs is stale
    // without running the adapter.
    if (options.check) {
        const generated = await readGenerated(outDir);
        const stale = generated.filter((file) => file.hash !== hash);
        if (!generated.some((file) => file.path === INDEX_FILE)) {
            return result([
                { path: INDEX_FILE, status: "missing" },
                ...stale.map((file) => ({
                    path: file.path,
                    status: "stale" as const,
                })),
            ]);
        }
        if (stale.length > 0) {
            return result(
                stale.map((file) => ({ path: file.path, status: "stale" })),
            );
        }
    }

    const context: CodegenContext<Options> = {
        config,
        components,
        variants,
        options: adapterOptions,
        root,
        outDir,
        shape,
        importPath: (from, to) => importPath(root, outDir, from, to),
    };
    const output = await adapter.codegen(context);
    const entries = generatedEntries(adapter, output, components, lazy, shape);
    checkThemeAttribute(adapter, output.themeAttribute);

    const planned: PlannedFile[] = [];
    const add = (path: string, contents: string, header = true) => {
        if (planned.some((file) => file.path === path)) {
            throw adapterError(adapter, `returned "${path}" more than once.`);
        }
        planned.push({
            path,
            contents: header ? withHeader(path, contents, hash) : contents,
            header,
        });
    };
    for (const module of output.components) {
        add(module.path, module.contents);
    }
    for (const file of output.files ?? []) {
        checkPath(adapter, file.path);
        add(file.path, file.contents, file.header ?? true);
    }
    add(
        INDEX_FILE,
        registryIndex(
            entries,
            Object.keys(config.themes ?? {}),
            trainVersion,
            output.themeAttribute,
            output.vars,
        ),
    );
    add(
        DECLARATIONS_FILE,
        registryDeclarations(entries, Object.keys(config.springs ?? {})),
    );

    const hint = tsconfigHint(root, outDir);
    const files = options.check
        ? await compareFiles(outDir, planned, hash)
        : await writeFiles(outDir, planned);
    return result(files, hint ? [hint] : []);
};
