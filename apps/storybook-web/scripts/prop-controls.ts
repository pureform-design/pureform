// The controls a component gets, from the props its binding's export takes: the TypeScript
// checker resolves the export's props type (its call signature's first parameter), and each
// property declared in `@pureform/binding-core` gets a control from its type. Props the
// binding adds (DOM, React or Solid attributes, `as`, `children`) are declared elsewhere, so
// they get none.
//
// - A string-literal union is a select, `boolean` a boolean, `string` a text field, `number` a
//   number field; functions, nodes, objects, arrays and mixed unions get no control.
// - A prop typed `VariantProp<C, "group">` names the variant group it sets (the text's
//   `textStyle` sets `style`): read from the declaration before the alias resolves, following
//   indexed accesses (`ButtonVariantProps["color"]`).
// - A JSDoc tag on the prop in binding-core overrides the type: `@control none | select |
//   boolean | text | number`.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";

// The JavaScript compiler API: TypeScript 7 (the repo's `typescript`) ships none yet.
import ts from "@typescript/typescript6";

export type ControlKind = "none" | "select" | "boolean" | "text" | "number";

const KINDS = new Set<ControlKind>([
    "none",
    "select",
    "boolean",
    "text",
    "number",
]);

export interface PropControl {
    readonly name: string;
    /** What its type gives, or its `@control` tag. */
    readonly control: ControlKind;
    /** A select's values, from the resolved type (in the order the checker gives them). */
    readonly options?: readonly string[];
    /** The variant group a `VariantProp<C, "group">` sets. */
    readonly variant?: string;
    /** Whether `control` comes from a `@control` tag. */
    readonly tagged?: boolean;
}

/** The symbols a property comes from: itself, or what a mapped type (`Omit`, `Controllable`)
 *  made it from. */
const rootsOf = (checker: ts.TypeChecker, property: ts.Symbol) => {
    const roots = checker.getRootSymbols(property);
    return roots.length ? roots : [property];
};

/** The file declaring a property. A mapped type's property has no declaration of its own; its
 *  mapped type's is used (internal `links`, the compiler API exposes none). */
export const declarationFile = (
    checker: ts.TypeChecker,
    property: ts.Symbol,
): string | undefined => {
    for (const root of rootsOf(checker, property)) {
        const node = root.declarations?.[0];
        if (node) return node.getSourceFile().fileName;
        const mapped = (
            root as { links?: { mappedType?: { declaration?: ts.Node } } }
        ).links?.mappedType?.declaration;
        if (mapped) return mapped.getSourceFile().fileName;
    }
    return undefined;
};

/** The `@control` tag on a property's declarations, if any. Throws on an unknown kind. */
const tagOf = (
    checker: ts.TypeChecker,
    property: ts.Symbol,
): ControlKind | undefined => {
    for (const root of rootsOf(checker, property)) {
        const tag = root
            .getJsDocTags(checker)
            .find((t) => t.name === "control");
        if (!tag) continue;
        const kind = ts.displayPartsToString(tag.text).trim() as ControlKind;
        if (!KINDS.has(kind)) {
            throw new Error(
                `prop controls: \`@control ${kind}\` on ${property.name}; expected one of ${[...KINDS].join(", ")}`,
            );
        }
        return kind;
    }
    return undefined;
};

/** The group a `VariantProp<C, "group">` type node names, through indexed accesses
 *  (`ButtonVariantProps["color"]`) to the property they read. */
const groupOf = (
    checker: ts.TypeChecker,
    node: ts.TypeNode | undefined,
    depth = 0,
): string | undefined => {
    if (!node || depth > 8) return undefined;
    if (
        ts.isTypeReferenceNode(node) &&
        ts.isIdentifier(node.typeName) &&
        node.typeName.text === "VariantProp"
    ) {
        const group = node.typeArguments?.[1];
        return group &&
            ts.isLiteralTypeNode(group) &&
            ts.isStringLiteral(group.literal)
            ? group.literal.text
            : undefined;
    }
    if (
        ts.isIndexedAccessTypeNode(node) &&
        ts.isLiteralTypeNode(node.indexType) &&
        ts.isStringLiteral(node.indexType.literal)
    ) {
        const property = checker
            .getTypeFromTypeNode(node.objectType)
            .getProperty(node.indexType.literal.text);
        return property && groupOf(checker, typeNodeOf(property), depth + 1);
    }
    return undefined;
};

const typeNodeOf = (property: ts.Symbol) => {
    const node = property.valueDeclaration ?? property.declarations?.[0];
    return node && ts.isPropertySignature(node) ? node.type : undefined;
};

const variantOf = (checker: ts.TypeChecker, property: ts.Symbol) => {
    for (const root of rootsOf(checker, property)) {
        const group = groupOf(checker, typeNodeOf(root));
        if (group) return group;
    }
    return undefined;
};

/** The control a type gives, `undefined` and `null` left out. */
export const controlOfType = (
    checker: ts.TypeChecker,
    type: ts.Type,
): Pick<PropControl, "control" | "options"> => {
    const t = checker.getNonNullableType(type);
    if (t.flags & ts.TypeFlags.Boolean) return { control: "boolean" };
    if (t.flags & ts.TypeFlags.String) return { control: "text" };
    if (t.flags & ts.TypeFlags.Number) return { control: "number" };
    const members = t.isUnion() ? t.types : [t];
    if (members.every((m) => m.isStringLiteral())) {
        return {
            control: "select",
            options: members.map((m) => (m as ts.StringLiteralType).value),
        };
    }
    if (members.every((m) => m.flags & ts.TypeFlags.BooleanLiteral)) {
        return { control: "boolean" };
    }
    return { control: "none" };
};

/** Each property of `props` declared in a file `own` accepts, with its control. A union's
 *  members' properties are merged, the first member's winning. */
export const propControls = (
    checker: ts.TypeChecker,
    props: ts.Type,
    own: (fileName: string) => boolean,
): PropControl[] => {
    const members = props.isUnion() ? props.types : [props];
    const seen = new Map<string, ts.Symbol>();
    for (const member of members) {
        for (const property of checker.getPropertiesOfType(member)) {
            if (!seen.has(property.name)) seen.set(property.name, property);
        }
    }
    const out: PropControl[] = [];
    for (const property of seen.values()) {
        const file = declarationFile(checker, property);
        if (!file || !own(file)) continue;
        const variant = variantOf(checker, property);
        const tag = tagOf(checker, property);
        const fromType = controlOfType(
            checker,
            checker.getTypeOfSymbol(property),
        );
        out.push({
            name: property.name,
            ...fromType,
            ...(variant ? { variant } : {}),
            ...(tag ? { control: tag, tagged: true } : {}),
        });
    }
    return out;
};

/** A control per variant from the anatomy: a boolean for `["true", "false"]`, else a select. */
export const controlFor = (values: readonly string[]) =>
    values.length === 2 && values.includes("true") && values.includes("false")
        ? { control: "boolean" }
        : { control: "select", options: values };

/** A prop's arg type. A variant prop (`VariantProp<C, "group">`) takes its group's values from
 *  the anatomy, in the recipe's order (a `true`/`false` group is a boolean), unless a
 *  `@control` tag says otherwise; the rest follow their resolved type. No control is
 *  `control: false`, so Storybook doesn't infer one from the args. */
export const argTypeFor = (
    prop: PropControl,
    variants: Readonly<Record<string, readonly string[]>>,
) => {
    const values = prop.variant ? variants[prop.variant] : undefined;
    if (values && !prop.tagged) return controlFor(values);
    switch (prop.control) {
        case "none":
            return { control: false };
        case "select":
            return { control: "select", options: values ?? prop.options ?? [] };
        default:
            return { control: prop.control };
    }
};

/** The props type a component export takes: its first call signature's first parameter. */
export const propsTypeOf = (checker: ts.TypeChecker, symbol: ts.Symbol) => {
    const signature = checker.getTypeOfSymbol(symbol).getCallSignatures()[0];
    const parameter = signature?.parameters[0];
    return parameter && checker.getTypeOfSymbol(parameter);
};

/** binding-core's declarations, wherever they're read from (`packages/binding-core/dist` or
 *  `node_modules/@pureform/binding-core`). */
export const isBindingCore = (fileName: string) =>
    /[\\/](?:binding-core|@pureform[\\/]binding-core)[\\/]/.test(fileName);

/** For the binding `pkg` (read from `node_modules` under `app`), a function from a component's
 *  export name and subpath (`./button`) to its controls. `extra` adds declarations to the
 *  program (the app's generated registry, so variant props resolve to their values). */
export const bindingControls = (
    app: string,
    pkg: string,
    subpaths: readonly string[],
    extra: readonly string[] = [],
) => {
    const root = join(app, "node_modules", pkg);
    const json = JSON.parse(
        readFileSync(join(root, "package.json"), "utf8"),
    ) as {
        exports: Record<string, { types?: string } | string>;
    };
    const entryOf = (subpath: string) => {
        const entry = json.exports[subpath];
        const types = typeof entry === "object" ? entry.types : undefined;
        if (!types)
            throw new Error(
                `prop controls: ${pkg}${subpath.slice(1)} has no types`,
            );
        return join(root, types);
    };
    const entries = subpaths.map(entryOf);
    const program = ts.createProgram([...entries, ...extra], {
        noEmit: true,
        skipLibCheck: true,
        strict: true,
        jsx: ts.JsxEmit.Preserve,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        target: ts.ScriptTarget.ESNext,
        baseUrl: dirname(root),
    });
    const checker = program.getTypeChecker();
    return (name: string, subpath: string): PropControl[] => {
        const entry = entryOf(subpath);
        const source = program.getSourceFile(entry);
        const module = source && checker.getSymbolAtLocation(source);
        if (!module) throw new Error(`prop controls: can't read ${entry}`);
        let symbol = checker
            .getExportsOfModule(module)
            .find((s) => s.name === name);
        if (!symbol) {
            throw new Error(
                `prop controls: ${pkg}${subpath.slice(1)} exports no ${name}`,
            );
        }
        if (symbol.flags & ts.SymbolFlags.Alias) {
            symbol = checker.getAliasedSymbol(symbol);
        }
        const props = propsTypeOf(checker, symbol);
        if (!props) {
            throw new Error(
                `prop controls: ${name} (${pkg}) isn't callable with props`,
            );
        }
        return propControls(checker, props, isBindingCore);
    };
};
