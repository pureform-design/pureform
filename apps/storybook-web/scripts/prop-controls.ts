// The controls a component gets, from the props its binding's export takes: the TypeScript
// checker resolves the export's props type (its call signature's first parameter), and each
// property declared in `@pureform/binding-core` gets a control from its type. Props the
// binding adds (DOM, React or Solid attributes, `as`, `children`) are declared elsewhere, so
// they get none.
//
// - A union of literals (string, number, boolean) with a non-boolean member is a select of the
//   stringified values, with a `mapping` back to the real ones (`boolean | "indeterminate"` →
//   `["true", "false", "indeterminate"]`); plain `true | false` stays boolean.
// - A select of 3 options or fewer is drawn as a `radio` control (`argTypeFor`); more stay a
//   select. A `@control select` tag keeps the select, `@control radio` forces the radio.
// - A string-literal union is a select, `boolean` a boolean, `string` a text field, `number` a
//   number field; functions, nodes, objects, arrays and mixed unions get no control.
// - A prop typed `VariantProp<C, "group">` names the variant group it sets (the text's
//   `textStyle` sets `style`): read from the declaration before the alias resolves, following
//   indexed accesses (`ButtonVariantProps["color"]`).
// - A JSDoc tag on the prop in binding-core overrides the type: `@control none | select |
//   boolean | text | number | radio | color` (`color`: Storybook's color picker, for a CSS color
//   string).

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
    ScriptTarget,
    SyntaxKind,
    isIdentifier,
    isIndexedAccessTypeNode,
    isLiteralTypeNode,
    isNumericLiteral,
    isParenthesizedTypeNode,
    isPropertySignatureDeclaration,
    isStringLiteral,
    isTypeAliasDeclaration,
    isTypeReferenceNode,
    isUnionTypeNode,
    type Node,
    type TypeNode,
} from "typescript/ast";
// TypeScript 7's JavaScript API: a native checker process the calls are made to, so every
// handle (symbol, type, node) is resolved on demand and the process is closed when done.
import {
    API,
    JsxEmit,
    ModuleKind,
    ModuleResolutionKind,
    SymbolFlags,
    TypeFlags,
    isIntersectionType,
    isNumberLiteralType,
    isStringLiteralType,
    isUnionType,
    type BooleanLiteralType,
    type Checker,
    type NumberLiteralType,
    type StringLiteralType,
    type Symbol as TsSymbol,
    type Type,
} from "typescript/sync";

export type ControlKind =
    | "none"
    | "select"
    | "radio"
    | "boolean"
    | "text"
    | "number"
    | "color";

const KINDS = new Set<ControlKind>([
    "none",
    "select",
    "radio",
    "boolean",
    "text",
    "number",
    "color",
]);

export interface PropControl {
    readonly name: string;
    /** What its type gives, or its `@control` tag. */
    readonly control: ControlKind;
    /** A select's values, from the resolved type (in the order the checker gives them). */
    readonly options?: readonly string[];
    /** A select's option → value, for the options that aren't strings (`"true"` → `true`). */
    readonly mapping?: Readonly<Record<string, unknown>>;
    /** The variant group a `VariantProp<C, "group">` sets. */
    readonly variant?: string;
    /** Whether `control` comes from a `@control` tag. */
    readonly tagged?: boolean;
}

const membersOf = (type: Type): readonly Type[] =>
    isUnionType(type) ? type.getTypes()! : [type];

/** The declaration of the mapped type that makes the property `name` of `type`, when the
 *  property has none of its own (`Controllable`'s `[K in N]`; a homomorphic `Omit`/`Pick` copies
 *  its source's declarations, so only a source that is itself mapped gets here). The checker has
 *  no `getRootSymbols` in the JS API: this walks down from the type, through unions,
 *  intersections, a mapped type's source (`T[P]`) and an interface's bases. */
const mappedDeclaration = (
    type: Type,
    name: string,
    depth = 0,
): Node | undefined => {
    if (depth > 12) return undefined;
    if (isUnionType(type) || isIntersectionType(type)) {
        for (const member of type.getTypes() ?? []) {
            const found = mappedDeclaration(member, name, depth + 1);
            if (found) return found;
        }
        return undefined;
    }
    if (!type.getProperty(name)) return undefined;
    if (type.isMappedType()) {
        const template = type.getTemplateType();
        const source = template.isIndexedAccessType()
            ? mappedDeclaration(template.getObjectType(), name, depth + 1)
            : undefined;
        return (
            source ??
            type
                .getSymbol()
                ?.declarations.find((d) => d.kind === SyntaxKind.MappedType)
                ?.resolve()
        );
    }
    const bases =
        type.getBaseTypes() ??
        (type.isTypeReference() ? type.getTarget().getBaseTypes() : undefined);
    for (const base of bases ?? []) {
        const found = mappedDeclaration(base, name, depth + 1);
        if (found) return found;
    }
    return undefined;
};

/** The file declaring a property of `type`. A mapped type's property has no declaration of its
 *  own; its mapped type's is used. */
export const declarationFile = (
    type: Type,
    property: TsSymbol,
): string | undefined => {
    const declared = property.declarations[0];
    if (declared) return declared.path;
    return mappedDeclaration(type, property.name)?.getSourceFile().fileName;
};

// The `@control` kind in the JSDoc just inside a mapped type's brace. The compiler attaches no
// JSDoc to a mapped type node, so its text is read.
const mappedTag = (mapped: Node) =>
    /^\s*\{\s*\/\*\*[^]*?@control\s+(\w+)/.exec(mapped.getFullText())?.[1];

/** The `@control` tag on a property's declarations, if any; a mapped type's property (the
 *  `default*` of `Controllable`) reads its mapped type's. Throws on an unknown kind. */
const tagOf = (
    checker: Checker,
    type: Type,
    property: TsSymbol,
): ControlKind | undefined => {
    const mapped = property.declarations.length
        ? undefined
        : mappedDeclaration(type, property.name);
    const tag = property
        .getJsDocTags(checker)
        .find((t) => t.name === "control");
    const text = tag ? tag.text : mapped && mappedTag(mapped);
    if (!text) return undefined;
    const kind = text.trim() as ControlKind;
    if (!KINDS.has(kind)) {
        throw new Error(
            `prop controls: \`@control ${kind}\` on ${property.name}; expected one of ${[...KINDS].join(", ")}`,
        );
    }
    return kind;
};

/** The group a `VariantProp<C, "group">` type node names, through indexed accesses
 *  (`ButtonVariantProps["color"]`) to the property they read. */
const groupOf = (
    checker: Checker,
    node: TypeNode | undefined,
    depth = 0,
): string | undefined => {
    if (!node || depth > 8) return undefined;
    if (
        isTypeReferenceNode(node) &&
        isIdentifier(node.typeName) &&
        node.typeName.text === "VariantProp"
    ) {
        const group = node.typeArguments?.[1];
        return group &&
            isLiteralTypeNode(group) &&
            isStringLiteral(group.literal)
            ? group.literal.text
            : undefined;
    }
    if (
        isIndexedAccessTypeNode(node) &&
        isLiteralTypeNode(node.indexType) &&
        isStringLiteral(node.indexType.literal)
    ) {
        const property = checker
            .getTypeFromTypeNode(node.objectType)
            .getProperty(node.indexType.literal.text);
        return property && groupOf(checker, typeNodeOf(property), depth + 1);
    }
    return undefined;
};

const typeNodeOf = (property: TsSymbol) => {
    const node = (
        property.valueDeclaration ?? property.declarations[0]
    )?.resolve();
    return node && isPropertySignatureDeclaration(node) ? node.type : undefined;
};

const variantOf = (checker: Checker, property: TsSymbol) =>
    groupOf(checker, typeNodeOf(property));

/** The literal values a type node writes, in the order they're written, through unions,
 *  parentheses, type aliases and indexed accesses. The checker orders a union's members itself
 *  (TypeScript 7 sorts them), so a select's options are put back in this order. */
const declaredValues = (
    checker: Checker,
    node: TypeNode | undefined,
    depth = 0,
): string[] => {
    if (!node || depth > 8) return [];
    if (isUnionTypeNode(node)) {
        return node.types.flatMap((t) => declaredValues(checker, t, depth + 1));
    }
    if (isParenthesizedTypeNode(node)) {
        return declaredValues(checker, node.type, depth + 1);
    }
    if (isLiteralTypeNode(node)) {
        return isStringLiteral(node.literal) || isNumericLiteral(node.literal)
            ? [node.literal.text]
            : [];
    }
    if (isTypeReferenceNode(node)) {
        let symbol = checker.getSymbolAtLocation(node.typeName);
        if (symbol && symbol.flags & SymbolFlags.Alias) {
            symbol = checker.getAliasedSymbol(symbol);
        }
        const declaration = symbol?.declarations[0]?.resolve();
        return declaration && isTypeAliasDeclaration(declaration)
            ? declaredValues(checker, declaration.type, depth + 1)
            : [];
    }
    if (
        isIndexedAccessTypeNode(node) &&
        isLiteralTypeNode(node.indexType) &&
        isStringLiteral(node.indexType.literal)
    ) {
        const property = checker
            .getTypeFromTypeNode(node.objectType)
            .getProperty(node.indexType.literal.text);
        return declaredValues(
            checker,
            property && typeNodeOf(property),
            depth + 1,
        );
    }
    return [];
};

/** `options` in the order `node` writes them; the ones it doesn't write stay first. */
const inDeclaredOrder = (
    checker: Checker,
    options: readonly string[],
    node: TypeNode | undefined,
) => {
    const declared = declaredValues(checker, node);
    return declared.length
        ? options.toSorted((a, b) => declared.indexOf(a) - declared.indexOf(b))
        : options;
};

/** The control a type gives, `undefined` and `null` left out. */
export const controlOfType = (
    checker: Checker,
    type: Type,
): Pick<PropControl, "control" | "options" | "mapping"> => {
    const t = checker.getNonNullableType(type);
    if (t.flags & TypeFlags.Boolean) return { control: "boolean" };
    if (t.flags & TypeFlags.String) return { control: "text" };
    if (t.flags & TypeFlags.Number) return { control: "number" };
    const members = membersOf(t);
    if (members.every(isStringLiteralType)) {
        return {
            control: "select",
            options: members.map((m) => (m as StringLiteralType).value),
        };
    }
    if (members.every((m) => m.flags & TypeFlags.BooleanLiteral)) {
        return { control: "boolean" };
    }
    const isBool = (m: Type) => !!(m.flags & TypeFlags.BooleanLiteral);
    if (
        members.every(
            (m) =>
                isBool(m) || isStringLiteralType(m) || isNumberLiteralType(m),
        )
    ) {
        const mapping: Record<string, unknown> = {};
        const options: string[] = [];
        const bools = members
            .filter(isBool)
            .map((m) => (m as BooleanLiteralType).value);
        for (const value of ["true", "false"]) {
            if (!bools.includes(value === "true")) continue;
            options.push(value);
            mapping[value] = value === "true";
        }
        for (const m of members) {
            if (isBool(m)) continue;
            const value = isStringLiteralType(m)
                ? m.value
                : (m as NumberLiteralType).value;
            options.push(String(value));
            if (typeof value === "number") mapping[String(value)] = value;
        }
        return { control: "select", options, mapping };
    }
    return { control: "none" };
};

/** Each property of `props` declared in a file `own` accepts, with its control. A union's
 *  members' properties are merged, the first member's winning. */
export const propControls = (
    checker: Checker,
    props: Type,
    own: (fileName: string) => boolean,
): PropControl[] => {
    const seen = new Map<string, { property: TsSymbol; member: Type }>();
    for (const member of membersOf(props)) {
        for (const property of checker.getPropertiesOfType(member)) {
            if (!seen.has(property.name)) {
                seen.set(property.name, { property, member });
            }
        }
    }
    const out: PropControl[] = [];
    for (const { property, member } of seen.values()) {
        const file = declarationFile(member, property);
        if (!file || !own(file)) continue;
        const variant = variantOf(checker, property);
        const tag = tagOf(checker, member, property);
        const typed = controlOfType(checker, checker.getTypeOfSymbol(property));
        const fromType = typed.options
            ? {
                  ...typed,
                  options: inDeclaredOrder(
                      checker,
                      typed.options,
                      typeNodeOf(property),
                  ),
              }
            : typed;
        out.push({
            name: property.name,
            ...fromType,
            ...(variant ? { variant } : {}),
            ...(tag ? { control: tag, tagged: true } : {}),
        });
    }
    return out;
};

/** The most options a radio control draws; a select has more. */
export const RADIO_MAX = 3;

/** A control per variant from the anatomy: a boolean for `["true", "false"]`, else a radio (3
 *  options or fewer) or a select. */
export const controlFor = (values: readonly string[]) =>
    values.length === 2 && values.includes("true") && values.includes("false")
        ? { control: "boolean" }
        : {
              control: values.length <= RADIO_MAX ? "radio" : "select",
              options: values,
          };

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
        case "radio": {
            const options = values ?? prop.options ?? [];
            const control =
                prop.control === "radio" ||
                (!prop.tagged && options.length <= RADIO_MAX)
                    ? "radio"
                    : "select";
            return {
                control,
                options,
                ...(prop.mapping && !values ? { mapping: prop.mapping } : {}),
            };
        }
        default:
            return { control: prop.control };
    }
};

/** The props type a component export takes: its first call signature's first parameter. */
export const propsTypeOf = (checker: Checker, symbol: TsSymbol) => {
    const signature = checker.getTypeOfSymbol(symbol).getCallSignatures()[0];
    const parameter = signature?.getParameters()[0];
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
    const api = new API({ cwd: app });
    const program = api.createProgram([...entries, ...extra], {
        noEmit: true,
        skipLibCheck: true,
        strict: true,
        jsx: JsxEmit.Preserve,
        module: ModuleKind.ESNext,
        moduleResolution: ModuleResolutionKind.Bundler,
        target: ScriptTarget.ESNext,
        baseUrl: dirname(root),
    });
    const checker = program.getProject().checker;
    const controlsOf = (name: string, subpath: string): PropControl[] => {
        const entry = entryOf(subpath);
        const module = checker.getSymbolOfSourceFile(entry);
        if (!module) throw new Error(`prop controls: can't read ${entry}`);
        let symbol = checker
            .getExportsOfModule(module)
            .find((s) => s.name === name);
        if (!symbol) {
            throw new Error(
                `prop controls: ${pkg}${subpath.slice(1)} exports no ${name}`,
            );
        }
        if (symbol.flags & SymbolFlags.Alias) {
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
    /** Ends the checker process; call it when the controls are all read. */
    controlsOf.close = () => api.close();
    return controlsOf;
};
