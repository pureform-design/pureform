// Usage-based pruning's scan: which components an app draws and which variant values it selects,
// read from its source before the build. It follows the app's own files (every script under the
// root, and what they import by relative path), and reads the bindings' component imports, the
// JSX that renders them, the registry hooks, and the provider's `defaults`. Whatever it can't
// read statically keeps every value; whatever might reach a component it can't name stops the
// pruning (`keep: undefined` and a warning), so a pruned build never lacks a style it uses.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

import * as anatomies from "@pureform/anatomy";
import {
    BINDING_PACKAGES,
    COMPONENT_USAGE,
    INDICATION,
    PROVIDER,
    REGISTRY_HOOKS,
    ANATOMY_HOOK,
} from "@pureform/binding-core/usage";
import type { ComponentUsage } from "@pureform/binding-core/usage";
import { resolveRelative } from "@pureform/generate";
import type { Usage, VariantUsage } from "@pureform/generate";
import { parseSync } from "oxc-parser";

import { REGISTRY_ID, toPosix } from "../options";

/** What the scan reads. */
export interface ScanOptions {
    /** The app's root, absolute. */
    readonly root: string;
    /** Files and folders to start from, relative to the root. Default: the root. */
    readonly include?: readonly string[];
    /** Folders and files to skip, relative to the root, besides `node_modules`, dot folders,
     *  `dist`, `build`, `coverage`, `styled-system`, and test files. */
    readonly exclude?: readonly string[];
    /** The generated registry's folder, absolute: imports into it are the registry. */
    readonly outDir: string;
}

/** What the scan found: the usage to generate for, or `undefined` to keep everything. */
export interface ScanResult {
    readonly usage: Usage | undefined;
    /** Why the scan kept everything, or what it couldn't read. */
    readonly warnings: readonly string[];
    /** The files it read, absolute. */
    readonly files: readonly string[];
}

const SCRIPT = /\.(?:[cm]?[jt]sx?)$/;
const TEST =
    /(?:\.(?:spec|test|e2e|stories)\.[cm]?[jt]sx?$)|(?:^|[/\\])__(?:tests|mocks)__[/\\]/;
const SKIPPED = new Set([
    "node_modules",
    "dist",
    "build",
    "coverage",
    "styled-system",
]);

const BINDING = new RegExp(
    `^(${BINDING_PACKAGES.map((name) => name.replace("/", "\\/")).join("|")})(?:\\/(.+))?$`,
);

type Node = { readonly type: string; readonly [key: string]: unknown };

const ALL = "all" as const;
type Values = Set<string> | typeof ALL;

const union = (a: Values, b: Values): Values =>
    a === ALL || b === ALL ? ALL : new Set([...a, ...b]);

// One registry entry's values: the groups listed, and the rest.
interface EntryState {
    readonly listed: Map<string, Values>;
    rest: Values;
}

class Collector {
    readonly entries = new Map<string, EntryState>();
    readonly defaults: [entry: string, group: string, values: Values][] = [];
    allVariants = false;
    readonly bails: string[] = [];
    /** Whether a component that shows indication, or `useIndication`, is used: they draw the
     *  ripple's layer unless every indication has none. */
    indicated = false;
    /** How many providers the scan saw, and whether each, and every component's `indication`
     *  prop, passes an indication it can tell has no layer. */
    providers = 0;
    layerless = true;

    /** A use of an entry: values for some groups, and for the rest. */
    use(entry: string, listed: Map<string, Values>, rest: Values): void {
        const state = this.entries.get(entry);
        if (!state) {
            this.entries.set(entry, { listed: new Map(listed), rest });
            return;
        }
        for (const group of new Set([
            ...state.listed.keys(),
            ...listed.keys(),
        ])) {
            state.listed.set(
                group,
                union(
                    state.listed.get(group) ?? state.rest,
                    listed.get(group) ?? rest,
                ),
            );
        }
        state.rest = union(state.rest, rest);
    }

    /** Values one use adds to a group of an entry already used. */
    add(entry: string, group: string, values: Values): void {
        const state = this.entries.get(entry);
        if (!state) return;
        state.listed.set(
            group,
            union(state.listed.get(group) ?? state.rest, values),
        );
    }

    usage(): Usage {
        // The ripple's layer goes unless every provider passes an indication with no layer.
        if (this.indicated && !(this.providers > 0 && this.layerless)) {
            this.use(INDICATION.entry, new Map(), ALL);
        }
        for (const [entry, group, values] of this.defaults) {
            this.add(entry, group, values);
        }
        const variants: Record<string, Record<string, string[]>> = {};
        if (!this.allVariants) {
            for (const [entry, state] of this.entries) {
                const groups: Record<string, string[]> = {};
                for (const [group, values] of state.listed) {
                    if (values !== ALL) groups[group] = [...values].sort();
                    // Every value, against a rest that narrows.
                    else if (state.rest !== ALL) groups[group] = ["*"];
                }
                if (state.rest !== ALL) groups["*"] = [...state.rest].sort();
                if (Object.keys(groups).length > 0) variants[entry] = groups;
            }
        }
        return {
            components: [...this.entries.keys()].sort(),
            variants: variants as VariantUsage,
        };
    }
}

const unwrap = (node: Node): Node => {
    let current = node;
    while (
        [
            "ParenthesizedExpression",
            "TSAsExpression",
            "TSSatisfiesExpression",
            "TSNonNullExpression",
            "TSTypeAssertion",
        ].includes(current.type)
    ) {
        current = current.expression as Node;
    }
    return current;
};

/** The values an expression can take, when they're written out; `undefined` otherwise. */
const staticValues = (input: Node | null | undefined): Values => {
    if (!input) return new Set();
    const node = unwrap(input);
    switch (node.type) {
        case "Literal": {
            const value = node.value;
            if (value === null) return new Set();
            if (
                typeof value === "string" ||
                typeof value === "number" ||
                typeof value === "boolean"
            ) {
                return new Set([String(value)]);
            }
            return ALL;
        }
        case "Identifier":
            return node.name === "undefined" ? new Set() : ALL;
        case "TemplateLiteral":
            return (node.expressions as Node[]).length === 0
                ? new Set([
                      String(
                          (
                              (node.quasis as Node[])[0]!.value as {
                                  cooked: string;
                              }
                          ).cooked,
                      ),
                  ])
                : ALL;
        case "ConditionalExpression":
            return union(
                staticValues(node.consequent as Node),
                staticValues(node.alternate as Node),
            );
        case "JSXExpressionContainer":
            return (node.expression as Node).type === "JSXEmptyExpression"
                ? new Set()
                : staticValues(node.expression as Node);
        default:
            return ALL;
    }
};

const propertyName = (property: Node): string | undefined => {
    if (property.computed) return undefined;
    const key = property.key as Node;
    if (key.type === "Identifier") return key.name as string;
    if (key.type === "Literal") return String(key.value);
    return undefined;
};

/** A selection (an object, or a function returning one): values by group, and the rest's. */
const selectionOf = (
    input: Node | undefined,
): { listed: Map<string, Values>; rest: Values } => {
    const everything = { listed: new Map<string, Values>(), rest: ALL };
    if (!input) return { listed: new Map(), rest: new Set() };
    let node = unwrap(input);
    if (
        node.type === "ArrowFunctionExpression" ||
        node.type === "FunctionExpression"
    ) {
        const body = node.body as Node;
        if (body.type !== "BlockStatement") {
            node = unwrap(body);
        } else {
            const statements = body.body as Node[];
            const last = statements.at(-1);
            if (statements.length !== 1 || last?.type !== "ReturnStatement") {
                return everything;
            }
            node = unwrap(last.argument as Node);
        }
    }
    if (node.type !== "ObjectExpression") return everything;
    const listed = new Map<string, Values>();
    for (const property of node.properties as Node[]) {
        if (property.type !== "Property") return everything;
        const name = propertyName(property);
        if (name === undefined) return everything;
        if (name === "tokens") continue;
        listed.set(
            name,
            property.shorthand ? ALL : staticValues(property.value as Node),
        );
    }
    return { listed, rest: new Set() };
};

const isTypeNode = (node: Node) =>
    node.type.startsWith("TS") &&
    ![
        "TSAsExpression",
        "TSSatisfiesExpression",
        "TSNonNullExpression",
    ].includes(node.type) &&
    !("expression" in node && node.type !== "TSExternalModuleReference");

const anatomyName = (exported: string): string | undefined => {
    const value = (anatomies as Record<string, unknown>)[exported];
    return value && typeof value === "object" && "partNames" in value
        ? (value as unknown as { name: string }).name
        : undefined;
};

// Whether an anatomy has an indication entry, so its surfaces hold the ripple's layer.
const anatomyShowsIndication = (exported: string): boolean =>
    ((
        (anatomies as Record<string, unknown>)[exported] as
            | { indication?: readonly unknown[] }
            | undefined
    )?.indication?.length ?? 0) > 0;

// A file's bindings: what each local name imported from the bindings, the anatomy, or the generated
// registry is.
interface Bindings {
    readonly components: Map<string, string>; // local → subpath (named import)
    readonly componentNamespaces: Map<string, string>; // local → subpath (namespace import)
    readonly hooks: Map<string, string>; // local → exported name from a binding's root
    readonly rootNamespaces: Set<string>;
    readonly anatomies: Map<string, string>; // local → exported anatomy name
    readonly anatomyNamespaces: Set<string>;
    readonly registries: Set<string>; // locals holding the registry
}

/** Reads one file's usage into the collector; returns the relative imports to follow. */
const scanFile = (
    file: string,
    source: string,
    options: ScanOptions,
    collector: Collector,
): string[] => {
    const shown = toPosix(relative(options.root, file));
    const parsed = parseSync(file, source, { sourceType: "module" });
    if (parsed.errors.length > 0) {
        collector.bails.push(
            `${shown} doesn't parse (${parsed.errors[0]!.message})`,
        );
        return [];
    }
    const follow: string[] = [];
    const bindings: Bindings = {
        components: new Map(),
        componentNamespaces: new Map(),
        hooks: new Map(),
        rootNamespaces: new Set(),
        anatomies: new Map(),
        anatomyNamespaces: new Set(),
        registries: new Set(),
    };

    // The ripple a component draws for its indication's layer, which the usage adds at the end
    // unless every indication has no layer; the ripple component's own subpath draws it always.
    const indicationEntry = (subpath: string, entry: string): boolean => {
        if (entry !== INDICATION.entry || subpath === INDICATION.entry) {
            return false;
        }
        collector.indicated = true;
        return true;
    };

    const usedModule = (subpath: string) => {
        const usage = COMPONENT_USAGE[
            subpath as keyof typeof COMPONENT_USAGE
        ] as ComponentUsage | undefined;
        if (!usage) return;
        for (const [entry, groups] of Object.entries(usage.entries)) {
            if (indicationEntry(subpath, entry)) continue;
            collector.use(
                entry,
                new Map(Object.keys(groups).map((group) => [group, new Set()])),
                ALL,
            );
        }
    };
    // A component referenced other than as a JSX tag: rendered with props the scan can't see.
    const wholeModule = (subpath: string) => {
        const usage = (COMPONENT_USAGE as Record<string, ComponentUsage>)[
            subpath
        ];
        for (const entry of Object.keys(usage?.entries ?? {})) {
            if (indicationEntry(subpath, entry)) continue;
            collector.use(entry, new Map(), ALL);
        }
    };
    const wholeEntry = (entry: string) => collector.use(entry, new Map(), ALL);

    const inOutDir = (specifier: string): string | undefined => {
        if (specifier === REGISTRY_ID) return "";
        if (!specifier.startsWith(".") && !isAbsolute(specifier))
            return undefined;
        const target = resolve(file, "..", specifier.split("?")[0]!);
        if (target === options.outDir) return "";
        if (!target.startsWith(options.outDir + sep)) return undefined;
        return toPosix(relative(options.outDir, target));
    };

    // Imports and re-exports.
    const fromSource = (node: Node, reexport: boolean) => {
        const source = node.source as Node | null;
        if (!source || typeof source.value !== "string") return;
        const specifier = source.value;
        if (node.importKind === "type" || node.exportKind === "type") return;
        const all = (node.specifiers as Node[] | undefined) ?? [];
        const specifiers = all.filter(
            (item) => item.importKind !== "type" && item.exportKind !== "type",
        );
        // `import { type A } from "…"` imports nothing at run time.
        if (all.length > 0 && specifiers.length === 0) return;
        const binding = BINDING.exec(specifier);
        if (binding) {
            const subpath = binding[2];
            if (subpath === undefined) {
                if (node.type === "ImportExpression") {
                    collector.bails.push(
                        `${shown} imports ${specifier} dynamically, whose registry hooks the scan can't follow`,
                    );
                    return;
                }
                if (reexport) {
                    const names = specifiers.map(
                        (item) => (item.local as Node).name as string,
                    );
                    if (
                        node.type === "ExportAllDeclaration" ||
                        names.some((name) => name in REGISTRY_HOOKS)
                    ) {
                        collector.bails.push(
                            `${shown} re-exports ${specifier}'s registry hooks, whose calls elsewhere the scan can't follow`,
                        );
                    }
                    return;
                }
                for (const item of specifiers) {
                    const local = (item.local as Node).name as string;
                    if (item.type === "ImportNamespaceSpecifier") {
                        bindings.rootNamespaces.add(local);
                    } else if (item.type === "ImportSpecifier") {
                        bindings.hooks.set(
                            local,
                            (item.imported as Node).name as string,
                        );
                    }
                }
                return;
            }
            if (subpath.startsWith("internal/")) return;
            if (!(subpath in COMPONENT_USAGE)) {
                collector.bails.push(
                    `${shown} imports ${specifier}, which pruning doesn't know`,
                );
                return;
            }
            usedModule(subpath);
            if (reexport || node.type === "ImportExpression") {
                wholeModule(subpath);
                return;
            }
            for (const item of specifiers) {
                const local = (item.local as Node).name as string;
                if (item.type === "ImportNamespaceSpecifier") {
                    bindings.componentNamespaces.set(local, subpath);
                } else {
                    bindings.components.set(local, subpath);
                }
            }
            return;
        }
        if (specifier === "@pureform/anatomy") {
            for (const item of specifiers) {
                const local = (item.local as Node).name as string;
                if (item.type === "ImportNamespaceSpecifier") {
                    bindings.anatomyNamespaces.add(local);
                } else if (item.type === "ImportSpecifier") {
                    bindings.anatomies.set(
                        local,
                        (item.imported as Node).name as string,
                    );
                }
            }
            return;
        }
        const generated = inOutDir(specifier);
        if (generated !== undefined && node.type === "ImportExpression") {
            collector.bails.push(
                `${shown} imports the generated registry dynamically, which the scan can't follow`,
            );
            return;
        }
        if (generated !== undefined) {
            const module = /^(?:web|native)\/([^/.]+)(?:\.[cm]?[jt]sx?)?$/.exec(
                generated,
            );
            if (module) {
                wholeEntry(module[1]!);
            } else if (
                generated === "" ||
                /^index(?:\.[cm]?[jt]sx?)?$/.test(generated)
            ) {
                for (const item of specifiers) {
                    const imported =
                        item.type === "ImportSpecifier"
                            ? ((item.imported as Node).name as string)
                            : undefined;
                    if (imported === "registry") {
                        bindings.registries.add(
                            (item.local as Node).name as string,
                        );
                    } else if (item.type === "ImportNamespaceSpecifier") {
                        collector.bails.push(
                            `${shown} imports the generated registry as a namespace, which the scan can't follow`,
                        );
                    }
                }
                if (reexport && specifiers.length === 0) {
                    collector.bails.push(
                        `${shown} re-exports the generated registry, which the scan can't follow`,
                    );
                }
            }
            return;
        }
        if (specifier.startsWith(".") || isAbsolute(specifier)) {
            const target = resolveRelative(file, specifier);
            if (target && SCRIPT.test(target)) follow.push(target);
        }
    };

    for (const node of parsed.program.body as unknown as Node[]) {
        if (
            node.type === "ImportDeclaration" ||
            node.type === "ExportAllDeclaration" ||
            (node.type === "ExportNamedDeclaration" && node.source)
        ) {
            fromSource(node, node.type !== "ImportDeclaration");
        }
    }

    const componentOfTag = (name: Node): string | undefined => {
        let root = name;
        const path: string[] = [];
        while (root.type === "JSXMemberExpression") {
            path.unshift((root.property as Node).name as string);
            root = root.object as Node;
        }
        if (root.type !== "JSXIdentifier") return undefined;
        const local = root.name as string;
        return (
            bindings.components.get(local) ??
            (path.length > 0
                ? bindings.componentNamespaces.get(local)
                : undefined)
        );
    };

    const hookOf = (callee: Node): string | undefined => {
        const node = unwrap(callee);
        if (node.type === "Identifier")
            return bindings.hooks.get(node.name as string);
        if (
            node.type === "MemberExpression" &&
            !node.computed &&
            (node.object as Node).type === "Identifier" &&
            bindings.rootNamespaces.has((node.object as Node).name as string)
        ) {
            return (node.property as Node).name as string;
        }
        return undefined;
    };

    const isProvider = (name: Node): boolean => {
        if (name.type === "JSXIdentifier") {
            return bindings.hooks.get(name.name as string) === PROVIDER.name;
        }
        return (
            name.type === "JSXMemberExpression" &&
            (name.object as Node).type === "JSXIdentifier" &&
            bindings.rootNamespaces.has((name.object as Node).name as string) &&
            (name.property as Node).name === PROVIDER.name
        );
    };

    // Whether an indication, as written, has no layer: `noIndication`, `materialIndication({
    // ripple: false })`, or `defineIndication({ … })` (or an object) without `layer: true`.
    const isLayerless = (value: Node | null): boolean => {
        if (value?.type !== "JSXExpressionContainer") return false;
        const node = unwrap(value.expression as Node);
        if (node.type === "Identifier") {
            return bindings.hooks.get(node.name as string) === INDICATION.none;
        }
        const objectLayerless = (object: Node | undefined) => {
            if (object?.type !== "ObjectExpression") return false;
            for (const property of object.properties as Node[]) {
                if (property.type !== "Property") return false;
                if (propertyName(property) !== "layer") continue;
                const layer = unwrap(property.value as Node);
                return layer.type === "Literal" && layer.value === false;
            }
            return true;
        };
        if (node.type === "ObjectExpression") return objectLayerless(node);
        if (node.type !== "CallExpression") return false;
        const hook = hookOf(node.callee as Node);
        const arg = (node.arguments as Node[])[0];
        const options = arg ? unwrap(arg) : undefined;
        if (hook === INDICATION.define) return objectLayerless(options);
        if (hook !== INDICATION.material) return false;
        if (options?.type !== "ObjectExpression") return false;
        return (options.properties as Node[]).some((property) => {
            if (property.type !== "Property") return false;
            if (propertyName(property) !== "ripple") return false;
            const ripple = unwrap(property.value as Node);
            return ripple.type === "Literal" && ripple.value === false;
        });
    };

    const providerDefaults = (attribute: Node) => {
        if (attribute.type !== "JSXAttribute") {
            collector.allVariants = true;
            return;
        }
        if ((attribute.name as Node).name !== PROVIDER.defaults) return;
        const value = attribute.value as Node | null;
        const object =
            value?.type === "JSXExpressionContainer"
                ? unwrap(value.expression as Node)
                : undefined;
        if (object?.type !== "ObjectExpression") {
            collector.allVariants = true;
            return;
        }
        for (const property of object.properties as Node[]) {
            const entry =
                property.type === "Property"
                    ? propertyName(property)
                    : undefined;
            if (entry === undefined) {
                collector.allVariants = true;
                return;
            }
            const { listed, rest } = selectionOf(property.value as Node);
            if (rest === ALL) {
                collector.allVariants = true;
                return;
            }
            for (const [group, values] of listed) {
                collector.defaults.push([entry, group, values]);
            }
        }
    };

    const element = (opening: Node) => {
        const name = opening.name as Node;
        if (isProvider(name)) {
            collector.providers++;
            let layerless = false;
            for (const attribute of opening.attributes as Node[]) {
                providerDefaults(attribute);
                if (
                    attribute.type === "JSXAttribute" &&
                    (attribute.name as Node).name === INDICATION.prop
                ) {
                    layerless = isLayerless(attribute.value as Node | null);
                }
            }
            if (!layerless) collector.layerless = false;
            return;
        }
        const subpath = componentOfTag(name);
        if (!subpath) return;
        const entries = (COMPONENT_USAGE as Record<string, ComponentUsage>)[
            subpath
        ]!.entries;
        for (const attribute of opening.attributes as Node[]) {
            if (attribute.type === "JSXSpreadAttribute") {
                wholeModule(subpath);
                continue;
            }
            const prop = (attribute.name as Node).name as string;
            if (
                prop === INDICATION.prop &&
                !isLayerless(attribute.value as Node | null)
            ) {
                collector.layerless = false;
            }
            const values =
                attribute.value === null
                    ? new Set(["true"])
                    : staticValues(attribute.value as Node);
            for (const [entry, groups] of Object.entries(entries)) {
                for (const [group, from] of Object.entries(groups)) {
                    if (from === prop) collector.add(entry, group, values);
                }
            }
        }
    };

    const call = (node: Node) => {
        const args = node.arguments as Node[];
        const hook = hookOf(node.callee as Node);
        if (hook === INDICATION.hook) collector.indicated = true;
        if (hook && hook in REGISTRY_HOOKS) {
            const name = args[0] ? unwrap(args[0]) : undefined;
            if (name?.type !== "Literal" || typeof name.value !== "string") {
                collector.bails.push(
                    `${shown} calls ${hook} with a component name the scan can't read`,
                );
                return;
            }
            if (
                REGISTRY_HOOKS[hook as keyof typeof REGISTRY_HOOKS] ===
                "factory"
            ) {
                wholeEntry(name.value);
            } else {
                const { listed, rest } = selectionOf(args[1]);
                collector.use(name.value, listed, rest);
            }
            return;
        }
        if (hook === ANATOMY_HOOK) {
            const target = args[0] ? unwrap(args[0]) : undefined;
            let exported: string | undefined;
            if (target?.type === "Identifier") {
                exported = bindings.anatomies.get(target.name as string);
            } else if (
                target?.type === "MemberExpression" &&
                !target.computed &&
                (target.object as Node).type === "Identifier" &&
                bindings.anatomyNamespaces.has(
                    (target.object as Node).name as string,
                )
            ) {
                exported = (target.property as Node).name as string;
            }
            const entry = exported ? anatomyName(exported) : undefined;
            // Its surfaces hold the ripple's layer.
            if (exported && anatomyShowsIndication(exported)) {
                collector.indicated = true;
            }
            if (!entry) {
                collector.bails.push(
                    `${shown} calls ${hook} with an anatomy the scan can't name`,
                );
                return;
            }
            const optionsArg = args[1] ? unwrap(args[1]) : undefined;
            const selection =
                optionsArg?.type === "ObjectExpression"
                    ? (optionsArg.properties as Node[]).find(
                          (property) =>
                              property.type === "Property" &&
                              propertyName(property) === "selection",
                      )
                    : undefined;
            const { listed, rest } = selection
                ? selectionOf(selection.value as Node)
                : { listed: new Map<string, Values>(), rest: ALL as Values };
            collector.use(entry, listed, rest);
            return;
        }
        // registry.entry("name"), registry.preload("name")
        const callee = unwrap(node.callee as Node);
        if (
            callee.type === "MemberExpression" &&
            !callee.computed &&
            (callee.object as Node).type === "Identifier" &&
            bindings.registries.has((callee.object as Node).name as string) &&
            ["entry", "preload"].includes(
                (callee.property as Node).name as string,
            )
        ) {
            const name = args[0] ? unwrap(args[0]) : undefined;
            if (name?.type === "Literal" && typeof name.value === "string") {
                wholeEntry(name.value);
            } else {
                collector.bails.push(
                    `${shown} reads the registry with a component name the scan can't read`,
                );
            }
        }
    };

    const reference = (name: string) => {
        const subpath =
            bindings.components.get(name) ??
            bindings.componentNamespaces.get(name);
        if (subpath) wholeModule(subpath);
    };

    const walk = (value: unknown, parentKey?: string, parent?: Node): void => {
        if (Array.isArray(value)) {
            for (const item of value) walk(item, parentKey, parent);
            return;
        }
        if (!value || typeof value !== "object") return;
        const node = value as Node;
        if (typeof node.type !== "string") return;
        switch (node.type) {
            case "ImportDeclaration":
                return;
            case "ExportNamedDeclaration":
            case "ExportAllDeclaration":
                if (node.source) return;
                break;
            case "ImportExpression": {
                const source = unwrap(node.source as Node);
                if (source.type === "Literal") {
                    fromSource({ ...node, source, specifiers: [] }, true);
                }
                break;
            }
            case "JSXOpeningElement":
                element(node);
                walk(node.attributes, "attributes", node);
                return;
            case "JSXClosingElement":
                return;
            case "CallExpression":
                call(node);
                break;
            // const registry = useRegistry()
            case "VariableDeclarator": {
                const init = node.init ? unwrap(node.init as Node) : undefined;
                if (
                    init?.type === "CallExpression" &&
                    hookOf(init.callee as Node) === "useRegistry" &&
                    (node.id as Node).type === "Identifier"
                ) {
                    bindings.registries.add((node.id as Node).name as string);
                }
                break;
            }
            case "Identifier":
                if (
                    !(
                        parent &&
                        ((parent.type === "MemberExpression" &&
                            parentKey === "property" &&
                            !parent.computed) ||
                            (parent.type === "Property" &&
                                parentKey === "key" &&
                                !parent.computed) ||
                            parent.type === "LabeledStatement" ||
                            parent.type === "BreakStatement" ||
                            parent.type === "ContinueStatement")
                    )
                ) {
                    reference(node.name as string);
                }
                return;
            default:
                if (isTypeNode(node)) return;
        }
        for (const [key, child] of Object.entries(node)) {
            if (key === "type" || key === "typeAnnotation") continue;
            if (child && typeof child === "object") walk(child, key, node);
        }
    };
    walk(parsed.program.body);
    return follow;
};

const listScripts = (
    path: string,
    skip: (path: string) => boolean,
    out: string[],
): void => {
    let stats;
    try {
        stats = statSync(path);
    } catch {
        return;
    }
    if (stats.isFile()) {
        if (SCRIPT.test(path) && !TEST.test(path) && !path.endsWith(".d.ts")) {
            out.push(path);
        }
        return;
    }
    if (!stats.isDirectory()) return;
    for (const name of readdirSync(path).sort()) {
        const child = join(path, name);
        if (name.startsWith(".") || SKIPPED.has(name) || skip(child)) continue;
        listScripts(child, skip, out);
    }
};

/** Scans an app for the components and variant values it uses. */
export const scanUsage = (options: ScanOptions): ScanResult => {
    const root = resolve(options.root);
    const excluded = [
        resolve(options.outDir),
        ...(options.exclude ?? []).map((path) => resolve(root, path)),
    ];
    const skip = (path: string) =>
        excluded.some(
            (folder) => path === folder || path.startsWith(folder + sep),
        );
    const queue: string[] = [];
    for (const start of options.include ?? ["."]) {
        listScripts(resolve(root, start), skip, queue);
    }
    const collector = new Collector();
    const seen = new Set<string>();
    while (queue.length > 0) {
        const file = queue.shift()!;
        if (seen.has(file)) continue;
        seen.add(file);
        let source: string;
        try {
            source = readFileSync(file, "utf8");
        } catch {
            continue;
        }
        for (const next of scanFile(file, source, options, collector)) {
            if (
                !seen.has(next) &&
                !next.split(sep).includes("node_modules") &&
                !skip(next)
            ) {
                queue.push(next);
            }
        }
    }
    const files = [...seen];
    if (collector.bails.length > 0) {
        return {
            usage: undefined,
            warnings: [...new Set(collector.bails)],
            files,
        };
    }
    return { usage: collector.usage(), warnings: [], files };
};
