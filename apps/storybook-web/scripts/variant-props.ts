// Which of a component's recipe variants are props: the property names of binding-core's
// `<Component>VariantProps`, read from its built declarations with the TypeScript checker (which
// resolves `extends` and generics). A variant that isn't one is set by the binding itself (a
// button's `toggle`, a field's `leadingIcon`), so the codegen gives it no control.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";

// The JavaScript compiler API: TypeScript 7 (the repo's `typescript`) ships none yet.
import ts from "@typescript/typescript6";

/** For an exported `…VariantProps` of `pkg` (its `types` entry, read from `node_modules` under
 *  `app`): each variant that's a prop, to the prop's name. Throws when the package doesn't
 *  export the interface. */
export const variantProps = (app: string, pkg: string) => {
    const root = join(app, "node_modules", pkg);
    const json = JSON.parse(
        readFileSync(join(root, "package.json"), "utf8"),
    ) as {
        exports: { ".": { types: string } };
    };
    const entry = join(root, json.exports["."].types);
    const program = ts.createProgram([entry], {
        noEmit: true,
        skipLibCheck: true,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        target: ts.ScriptTarget.ESNext,
        baseUrl: dirname(entry),
    });
    const checker = program.getTypeChecker();
    const source = program.getSourceFile(entry);
    const module = source && checker.getSymbolAtLocation(source);
    if (!module) throw new Error(`variant props: can't read ${entry}`);
    const exports = new Map(
        checker.getExportsOfModule(module).map((s) => [s.name, s]),
    );
    /** The variant a property sets: the group `VariantProp<C, "group">` names (the text's
     *  `textStyle` sets `style`), else its own name. */
    const variantOf = (property: ts.Symbol): string => {
        const node = property.valueDeclaration ?? property.declarations?.[0];
        const type =
            node && ts.isPropertySignature(node) ? node.type : undefined;
        if (
            type &&
            ts.isTypeReferenceNode(type) &&
            type.typeName.getText() === "VariantProp"
        ) {
            const group = type.typeArguments?.[1];
            if (
                group &&
                ts.isLiteralTypeNode(group) &&
                ts.isStringLiteral(group.literal)
            ) {
                return group.literal.text;
            }
        }
        return property.name;
    };
    /** Each variant that's a prop, to the prop's name. */
    return (name: string): ReadonlyMap<string, string> => {
        let symbol = exports.get(name);
        if (!symbol) {
            throw new Error(
                `variant props: ${pkg} exports no ${name}; name the component's interface with \`variantProps\` in stories.config.ts`,
            );
        }
        if (symbol.flags & ts.SymbolFlags.Alias) {
            symbol = checker.getAliasedSymbol(symbol);
        }
        return new Map(
            checker
                .getPropertiesOfType(checker.getDeclaredTypeOfSymbol(symbol))
                .map((property) => [variantOf(property), property.name]),
        );
    };
};
