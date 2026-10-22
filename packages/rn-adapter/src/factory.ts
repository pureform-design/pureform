// A component's `StyleFactory` over styles from `precompute` or `runtimeStyles`: its styles for
// a selection of variants and states, selected once per selection and frozen, so every later
// lookup is a `Map.get`. The theme, scheme, overrides, SVG drawing, and widths are the
// environment, which a provider gives; each environment keeps its own table. Generated
// `.pureform/native/<name>.ts` modules are one of these each, over that component's
// precomputed styles. Free of React and of the lowering.

import { deepFreeze, selectionCache, selectionKey } from "@pureform/styling";
import type {
    ComponentRef,
    ComponentState,
    Selection,
    SelectionOrder,
    SlotOf,
    SlotStyle,
    States,
} from "@pureform/styling";

import type { ComponentStyles } from "./lower";
import {
    overridesFor,
    resolvedWith,
    stylesFor,
    themeKey,
    withSetTokens,
} from "./resolve";
import type { Overrides, Styles } from "./resolve";
import { BOUND, holds, selectWithTransitions } from "./select";
import type { Drawing, Selected, State, Style } from "./select";
import type { Scheme } from "./theme";
import { ANIMATION, SHAPE, TOKEN, TRANSITION } from "./values";
import type { Animation, ThemeValues, Transition, Value } from "./values";

export { overridesFor } from "./resolve";
export type {
    Overrides,
    PrecomputedStyles,
    RuntimeStyles,
    Styles,
} from "./resolve";
export type { Drawing, Selected, State, Style } from "./select";
export type { Scheme } from "./theme";
export type {
    Animation,
    Concrete,
    ThemeValues,
    Transition,
    Value,
} from "./values";

/** One slot's styles: its style, what it draws with SVG, its transitions (a token's own
 *  among them, under `$token:<key>`), its keyframe animation, its parent slot, and an icon
 *  slot's fill. */
export interface NativeSlot extends SlotStyle<Style, Drawing> {
    readonly style: Style;
    readonly drawing?: Drawing;
    readonly transitions: readonly Transition[];
    readonly animation?: Animation;
    readonly parent?: string;
    /** Material Symbols' `FILL` axis for an icon slot that sets it: 1 draws the icon filled. */
    readonly iconFill?: number;
}

/** A component's styles per slot. A component without slots has `root`. */
export type NativeSlots<C extends ComponentRef> = {
    readonly [S in SlotOf<C>]: NativeSlot;
};

/** A component the types know nothing about: any group, slot, and token, and every state. */
export interface AnyComponent {
    variants: Record<string, string>;
    slots: string;
    states: ComponentState;
    tokens: string;
}

/** What a native factory takes: variants, states, and the instance's tokens. */
export type NativeSelection<C extends ComponentRef> = Selection<C> & States<C>;

/** Where a component renders: what a provider holds. */
export interface Environment {
    /** A named theme. Default the base theme. */
    theme?: string;
    /** Default `light`. */
    scheme?: Scheme;
    /** Token or component token values to override, by key, as the provider takes them. */
    overrides?: Overrides;
    /** Whether the app draws shapes and gradients with SVG. Default `false`. */
    svg?: boolean;
    /** The window's width, for viewport conditions. */
    width?: number;
    /** The widths of the containers around the component, for container conditions. */
    containers?: Readonly<Record<string, number>>;
}

/** A component's factory in one environment. */
export interface NativeStyleFactory<C extends ComponentRef> {
    (selection: NativeSelection<C>): NativeSlots<C>;
    /** The same selection as the hooks take it: styles, transitions, animations, parents,
     *  and drawings by slot (`""` for a component without slots). */
    selected(selection: NativeSelection<C>): Selected;
}

/** A component's `StyleFactory`: called directly, in the base theme's light scheme; through
 *  `for`, in any environment. */
export interface NativeFactory<
    C extends ComponentRef = AnyComponent,
> extends NativeStyleFactory<C> {
    /** The component's name. */
    readonly component: string;
    /** The styles it selects from. */
    readonly styles: Styles;
    /** The groups and states its key is made of. */
    readonly order: SelectionOrder;
    /** The theme key each instance token sets, by the token's name. */
    readonly tokens: Readonly<Record<string, string>>;
    /** The slots its styles ever move (`""` for a component without slots), by `movingSlots`. */
    readonly moving: ReadonlySet<string>;
    /** The factory in an environment, one per environment. */
    for(environment?: Environment): NativeStyleFactory<C>;
}

/** The boolean states, in key order. Others a config's conditions name come after. */
const STATES = [
    "hover",
    "focus",
    "focusVisible",
    "active",
    "pressed",
    "dragged",
    "disabled",
    "selected",
    "checked",
    "indeterminate",
    "invalid",
    "readOnly",
    "filled",
    "expanded",
    "descending",
    "mirrored",
    "overflowing",
    "rtl",
    "reducedMotion",
];

// Conditions the environment decides rather than the selection.
const ENVIRONMENT = new Set(["svg", "light", "dark"]);

/** A component's order: its groups and their defaults, and the states its rules read, as
 *  the selection key is made of them. A state named like a group is the group's; `ltr` reads
 *  `rtl`. `bounds` are its width and container conditions. */
export const selectionOrder = (
    component: ComponentStyles<unknown>,
): SelectionOrder & {
    readonly states: readonly string[];
    readonly bounds: readonly string[];
} => {
    const variants = Object.keys(component.variants);
    const states = new Set<string>();
    const bounds = new Set<string>();
    for (const entry of component.entries) {
        for (const rule of entry.rules) {
            for (const name of rule.when) {
                if (BOUND.test(name)) bounds.add(name);
                else if (!ENVIRONMENT.has(name))
                    states.add(name === "ltr" ? "rtl" : name);
            }
        }
    }
    const rank = (name: string) => {
        const index = STATES.indexOf(name);
        return index === -1 ? STATES.length : index;
    };
    return {
        variants,
        states: [...states]
            .filter((name) => !variants.includes(name))
            .sort((a, b) => rank(a) - rank(b) || (a < b ? -1 : a > b ? 1 : 0)),
        defaults: { ...component.defaultVariants },
        bounds: [...bounds].sort(),
    };
};

// Whether a transition moves something on the slot's view: a style property, rather than a token
// or a clip shape, which a drawing moves.
const movesView = (transition: unknown): boolean => {
    if (typeof transition === "string" || transition === undefined)
        return false;
    if (!Array.isArray(transition)) return transition !== null;
    return transition.some((t) => {
        const property = (t as { property?: unknown }).property;
        return (
            typeof property !== "string" ||
            (!property.startsWith(TOKEN) && property !== SHAPE)
        );
    });
};

/** The slots a component's styles ever move on their views: those with a transition of a style
 *  property, or a keyframe animation, in any rule, whatever its variants, states, or
 *  conditions. A binding can draw the rest with plain views, and know it from the component
 *  alone, so a slot never needs another view while it's on screen. A component without slots
 *  has `""`. */
export const movingSlots = (
    component: ComponentStyles<unknown>,
): ReadonlySet<string> => {
    const moving = new Set<string>();
    for (const entry of component.entries) {
        if (moving.has(entry.slot)) continue;
        for (const rule of entry.rules) {
            const style = rule.style as Record<string, unknown>;
            const animation = style[ANIMATION];
            if (
                movesView(style[TRANSITION]) ||
                (typeof animation === "object" && animation !== null)
            ) {
                moving.add(entry.slot);
                break;
            }
        }
    }
    return moving;
};

// An environment as selection reads it: the theme's key, with the provider's overrides for
// its scheme.
interface Where {
    key: string;
    scheme: Scheme;
    overrides: ThemeValues;
    svg: boolean;
    width?: number;
    containers?: Readonly<Record<string, number>>;
}

interface Result {
    selected: Selected;
    slots: Record<string, NativeSlot>;
}

const slotsOf = (selected: Selected): Record<string, NativeSlot> => {
    const slots: Record<string, NativeSlot> = {};
    for (const [slot, style] of Object.entries(selected.styles)) {
        const drawing = selected.drawings[slot];
        const animation = selected.animations[slot];
        const parent = selected.parents[slot];
        const iconFill = selected.iconFills[slot];
        slots[slot === "" ? "root" : slot] = {
            style,
            ...(drawing ? { drawing } : {}),
            transitions: selected.transitions[slot] ?? [],
            ...(animation ? { animation } : {}),
            ...(parent === undefined ? {} : { parent }),
            ...(iconFill === undefined ? {} : { iconFill }),
        };
    }
    return slots;
};

// How many environments, and selections with instance tokens, a factory keeps before it
// starts again. A few are in use at a time; a token tween makes a new one every frame.
const ENVIRONMENTS = 64;
const WITH_TOKENS = 64;

const isPerScheme = (tokens: object) =>
    Object.entries(tokens).every(
        ([key, value]) =>
            (key === "light" || key === "dark") && typeof value === "object",
    );

/** A component's `StyleFactory` over styles from `precompute` or `runtimeStyles`. `tokens`
 *  names the theme key each instance token sets (`value` → `components.circularProgress.value`);
 *  a token it doesn't name is taken as a theme key itself. */
export const nativeFactory = <C extends ComponentRef = AnyComponent>(
    component: string,
    styles: Styles,
    tokens: Readonly<Record<string, string>> = {},
): NativeFactory<C> => {
    const template = styles.templates[component];
    if (!template) throw new Error(`no styles for component "${component}"`);
    const order = selectionOrder(template);
    const moving = movingSlots(template);
    const groups = new Set(order.variants);

    // An instance's tokens by theme key, per scheme where it gives them so.
    const tokenKeys = (given: object): Overrides => {
        const rename = (values: object) =>
            Object.fromEntries(
                Object.entries(values).map(([token, value]) => [
                    tokens[token] ?? token,
                    value,
                ]),
            );
        return Object.keys(given).length > 0 && isPerScheme(given)
            ? (Object.fromEntries(
                  Object.entries(given).map(([scheme, values]) => [
                      scheme,
                      rename(values as object),
                  ]),
              ) as Overrides)
            : (rename(given) as ThemeValues);
    };

    const environment = (where: Where): NativeStyleFactory<C> => {
        const select = (
            selection: Record<string, unknown>,
            given?: Overrides,
        ): Result => {
            const variants: Record<string, string> = {};
            const state: State = {
                scheme: where.scheme,
                svg: where.svg,
                ...(where.width === undefined ? {} : { width: where.width }),
                ...(where.containers ? { containers: where.containers } : {}),
            };
            for (const [key, value] of Object.entries(selection)) {
                if (groups.has(key)) variants[key] = value as string;
                else (state as Record<string, unknown>)[key] = value;
            }
            const from = (styles: ComponentStyles<Value>) =>
                selectWithTransitions(styles, variants, state);
            const resolved = given
                ? stylesFor(styles, where.key, {
                      ...where.overrides,
                      ...overridesFor(given, where.scheme),
                  })[component]!
                : resolvedWith(styles, where.key, where.overrides)[component]!;
            const selected = withSetTokens(from(resolved), from, {
                styles,
                key: where.key,
                name: component,
                scheme: where.scheme,
                overrides: where.overrides,
                ...(given ? { tokens: given } : {}),
            });
            return { selected, slots: slotsOf(selected) };
        };
        const cached = selectionCache<object, Result>(order, (selection) =>
            select(selection as Record<string, unknown>),
        );
        // A selection as its key stands for it, for one with tokens, which the cache leaves out.
        const normalized = (selection: object): Record<string, unknown> => {
            const s = selection as Record<string, unknown>;
            const out: Record<string, unknown> = {};
            for (const group of order.variants) {
                const value = s[group];
                const chosen =
                    value === true
                        ? "true"
                        : value === false
                          ? "false"
                          : typeof value === "string"
                            ? value
                            : order.defaults?.[group];
                if (chosen !== undefined) out[group] = chosen;
            }
            for (const name of order.states) out[name] = Boolean(s[name]);
            return out;
        };
        const withTokens = new Map<string, Result>();
        const lookup = (selection: NativeSelection<C>): Result => {
            const given = (selection as { tokens?: object }).tokens;
            if (!given || Object.keys(given).length === 0)
                return cached(selection);
            const named = tokenKeys(given);
            const id = `${selectionKey(order, selection)}${JSON.stringify(named)}`;
            let result = withTokens.get(id);
            if (!result) {
                if (withTokens.size >= WITH_TOKENS) withTokens.clear();
                result = deepFreeze(select(normalized(selection), named));
                withTokens.set(id, result);
            }
            return result;
        };
        const factory = ((selection: NativeSelection<C>) =>
            lookup(selection).slots) as NativeStyleFactory<C>;
        factory.selected = (selection) => lookup(selection).selected;
        return factory;
    };

    const environments = new Map<string, NativeStyleFactory<C>>();
    const at = (given: Environment = {}): NativeStyleFactory<C> => {
        const scheme = given.scheme ?? "light";
        const where: Where = {
            key: themeKey(given.theme, scheme),
            scheme,
            overrides: overridesFor(given.overrides, scheme),
            svg: given.svg ?? false,
            ...(given.width === undefined ? {} : { width: given.width }),
            ...(given.containers ? { containers: given.containers } : {}),
        };
        // Widths matter only through the conditions on them, so one table serves every
        // width that meets the same ones.
        const bounds = order.bounds
            .map((name) => (holds(name, new Set(), where) ? "1" : "0"))
            .join("");
        const id = `${where.key}|${scheme}|${where.svg ? 1 : 0}|${bounds}|${JSON.stringify(where.overrides)}`;
        let found = environments.get(id);
        if (!found) {
            if (environments.size >= ENVIRONMENTS) environments.clear();
            found = environment(where);
            environments.set(id, found);
        }
        return found;
    };

    const base = at();
    const factory = ((selection: NativeSelection<C>) =>
        base(selection)) as NativeFactory<C>;
    return Object.assign(factory, {
        component,
        styles,
        order,
        tokens,
        moving,
        for: at,
        selected: base.selected,
    });
};

const factories = new WeakMap<Styles, Map<string, NativeFactory>>();

/** A component's factory over a provider's styles, one per styles and component. */
export const componentFactory = (
    styles: Styles,
    component: string,
): NativeFactory => {
    let named = factories.get(styles);
    if (!named) factories.set(styles, (named = new Map()));
    let factory = named.get(component);
    if (!factory) {
        factory = nativeFactory(component, styles);
        named.set(component, factory);
    }
    return factory;
};
