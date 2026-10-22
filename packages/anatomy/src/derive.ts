// Derive a component's anatomy from its AST: one part per slot, nested as `structure` says, and
// the extra parts the design names. The generator writes the preset's anatomy with this, and the
// drift test checks the written anatomy against it.

import type { AnyComponentSpec } from "@pureform/core";
import type { StyleMap } from "@pureform/core/ast";

import { kebabCase, TEST_ID_PREFIX } from "./attributes";
import { EXTRA_PARTS } from "./extras";
import type {
    ComponentAnatomy,
    ExtraPart,
    IndicationAnatomy,
    PartAnatomy,
} from "./types";

// Whether a style reads the `mirrored` state anywhere in its states.
const readsMirrored = (style: StyleMap | undefined): boolean =>
    !!style?.states &&
    Object.entries(style.states).some(
        ([condition, sub]) => condition === "mirrored" || readsMirrored(sub),
    );

// Every style a slot gets: its base, each variant value's, and each compound's.
const slotStyles = (spec: AnyComponentSpec, slot: string): StyleMap[] => {
    if (spec.kind === "component") {
        const { base, variants = {}, compoundVariants = [] } = spec.recipe;
        return [
            base,
            ...Object.values(variants).flatMap((values) =>
                Object.values(values),
            ),
            ...compoundVariants.map((compound) => compound.style),
        ];
    }
    const { base, variants = {}, compoundVariants = [] } = spec.recipe;
    return [
        base[slot],
        ...Object.values(variants).flatMap((values) =>
            Object.values(values).map((bySlot) => bySlot[slot]),
        ),
        ...compoundVariants.map((compound) => compound.style[slot]),
    ].filter((style): style is StyleMap => !!style);
};

/** A component's anatomy, from its spec and its extra parts (by default, the ones
 *  `EXTRA_PARTS` names for it), with where it shows indication as the spec declares it. Throws
 *  when `structure` nests a slot twice or names an unknown one, an extra part's name or parent
 *  doesn't fit, or the indication names a part it doesn't have. */
export const deriveAnatomy = (
    spec: AnyComponentSpec,
    extras: readonly ExtraPart[] = EXTRA_PARTS[spec.name] ?? [],
): ComponentAnatomy => {
    const { name } = spec;
    const slots = spec.kind === "component" ? ["root"] : spec.slots;
    const structure = spec.kind === "component" ? {} : (spec.structure ?? {});
    const known = new Set(slots);

    const parents = new Map<string, string>();
    const children = new Map<string, string[]>(slots.map((s) => [s, []]));
    const nest = (child: string, parent: string) => {
        if (parents.has(child)) {
            throw new Error(
                `${name}: part "${child}" sits in both "${parents.get(child)}" and "${parent}"`,
            );
        }
        parents.set(child, parent);
        children.get(parent)!.push(child);
    };
    for (const [outer, inner] of Object.entries(structure)) {
        for (const slot of [outer, ...inner]) {
            if (!known.has(slot)) {
                throw new Error(
                    `${name}: structure names "${slot}", which is not a slot`,
                );
            }
        }
        for (const slot of inner) nest(slot, outer);
    }
    for (const extra of extras) {
        if (known.has(extra.name)) {
            throw new Error(`${name}: extra part "${extra.name}" is a slot`);
        }
        if (!known.has(extra.parent)) {
            throw new Error(
                `${name}: extra part "${extra.name}" sits in "${extra.parent}", which is not a slot`,
            );
        }
        known.add(extra.name);
        children.set(extra.name, []);
        nest(extra.name, extra.parent);
    }

    const outermost = slots.filter((slot) => !parents.has(slot));
    const root = outermost.includes("root") ? "root" : outermost[0]!;
    const scope = kebabCase(name);
    const part = (
        part: string,
        styled: boolean,
        mirror: boolean,
    ): PartAnatomy => {
        const attribute = kebabCase(part);
        return {
            name: part,
            attribute,
            testId: `${TEST_ID_PREFIX}-${scope}-${attribute}`,
            parent: parents.get(part) ?? null,
            children: children.get(part)!,
            styled,
            mirror,
        };
    };
    const partNames = [...slots, ...extras.map((extra) => extra.name)];
    const bindingVariants = spec.bindingVariants ?? [];
    for (const variant of bindingVariants) {
        if (!(variant in (spec.recipe.variants ?? {}))) {
            throw new Error(
                `${name}: sets "${variant}" as a binding variant, which is not a variant`,
            );
        }
    }
    const indication = spec.indication?.map(
        ({ trigger, surface, centered, focus, layer }): IndicationAnatomy => {
            for (const named of [trigger, surface, focus, layer]) {
                if (named !== undefined && !known.has(named)) {
                    throw new Error(
                        `${name}: indication names "${named}", which is not a part`,
                    );
                }
            }
            return {
                trigger,
                surface,
                centered,
                focus,
                ...(layer === undefined || layer === surface ? {} : { layer }),
            };
        },
    );
    return {
        name,
        scope,
        root,
        partNames,
        parts: Object.fromEntries([
            ...slots.map((slot) => [
                slot,
                part(slot, true, slotStyles(spec, slot).some(readsMirrored)),
            ]),
            ...extras.map((extra) => [
                extra.name,
                part(extra.name, false, false),
            ]),
        ]),
        ...(indication ? { indication } : {}),
        variants: Object.fromEntries(
            Object.entries(spec.recipe.variants ?? {}).map(
                ([variant, values]) => [variant, Object.keys(values)],
            ),
        ),
        ...(bindingVariants.length ? { bindingVariants } : {}),
    };
};

/** Every component's anatomy, by name. */
export const deriveAnatomies = (
    components: Readonly<Record<string, AnyComponentSpec>>,
): Record<string, ComponentAnatomy> =>
    Object.fromEntries(
        Object.entries(components).map(([key, spec]) => [
            key,
            deriveAnatomy(spec),
        ]),
    );

export { EXTRA_PARTS };

/** What `renderAnatomyModule` writes around the anatomies. */
export interface RenderOptions {
    /** A comment heading the module. */
    header: string;
    /** Where the module imports `ComponentAnatomy` from. Default `@pureform/anatomy`. */
    typesFrom?: string;
}

// A component's export name in the generated module.
const exportName = (component: string) => `${component}Anatomy`;

/** The source of a module holding these anatomies: one constant per component
 *  (`buttonAnatomy`), `anatomy` by name, and `testIds` by component and part. Unformatted. */
export const renderAnatomyModule = (
    anatomies: Readonly<Record<string, ComponentAnatomy>>,
    { header, typesFrom = "@pureform/anatomy" }: RenderOptions,
): string => {
    const names = Object.keys(anatomies);
    const lines = [
        header,
        "",
        `import type { ComponentAnatomy } from ${JSON.stringify(typesFrom)};`,
        "",
    ];
    for (const name of names) {
        lines.push(
            `export const ${exportName(name)} = ${JSON.stringify(anatomies[name])} as const satisfies ComponentAnatomy;`,
            "",
        );
    }
    lines.push(
        "/** Every component's anatomy, by name. */",
        `export const anatomy = { ${names.map((name) => `${name}: ${exportName(name)}`).join(", ")} } as const;`,
        "",
        "/** Every part's default test id, by component and part: `testIds.button.root`. */",
        `export const testIds = ${JSON.stringify(
            Object.fromEntries(
                names.map((name) => [
                    name,
                    Object.fromEntries(
                        Object.values(anatomies[name]!.parts).map((part) => [
                            part.name,
                            part.testId,
                        ]),
                    ),
                ]),
            ),
        )} as const;`,
        "",
    );
    return lines.join("\n");
};
