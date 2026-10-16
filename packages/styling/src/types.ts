// The types every binding and generated factory shares. A component is named by a key of
// `ComponentRegistry`, which the generated `.d.ts` augments from the app's config, or described
// inline by a `ComponentShape`.

import type {
    FormCondition,
    InteractionCondition,
    MarkCondition,
} from "@pureform/core/ast";

/** The boolean states a React Native selection carries. The web marks them on the element
 *  instead, so they aren't part of a web selection. */
export type ComponentState =
    | InteractionCondition
    | FormCondition
    | MarkCondition
    | "indeterminate"
    | "rtl"
    | "reducedMotion";

/** What the types know about a component. Generated declarations write one per component. */
export interface ComponentShape {
    /** Each variant group's values, as a union of strings. A group whose values are `"true"`
     *  and `"false"` also takes a boolean. */
    variants?: Record<string, string>;
    /** The slot names, as a union. Default `"root"`. */
    slots?: string;
    /** The states the component reads, as a union. Default every `ComponentState`. */
    states?: string;
    /** The `dynamic` tokens an instance may set, as a union. Default none. */
    tokens?: string;
    /** `true` when the registry entry loads on demand. */
    lazy?: boolean;
}

/** Every registered component, by name. Generated declarations augment it:
 *
 *  ```ts
 *  declare module "@pureform/styling" {
 *      interface ComponentRegistry {
 *          button: {
 *              variants: { variant: "filled" | "outlined"; size: "small" | "medium" };
 *              slots: "root" | "label" | "icon";
 *              tokens: "accent";
 *          };
 *      }
 *  }
 *  ``` */
export interface ComponentRegistry {}

/** A registered component's name, or any string while nothing is registered. */
export type ComponentName = [keyof ComponentRegistry] extends [never]
    ? string
    : keyof ComponentRegistry & string;

/** What the generic types take: a component's name, or its shape. */
export type ComponentRef = ComponentName | ComponentShape;

/** The registered components whose entries are static, which `useClassFactory` accepts. */
export type StaticComponentName = {
    [N in ComponentName]: ShapeOf<N> extends { lazy: true } ? never : N;
}[ComponentName];

/** The registered components whose entries load on demand. */
export type LazyComponentName = [keyof ComponentRegistry] extends [never]
    ? string
    : Exclude<ComponentName, StaticComponentName>;

interface OpenShape {
    variants: Record<string, string>;
    slots: string;
    states: ComponentState;
    tokens: string;
}

/** The shape of a component reference: the registered one for a name, or the shape itself. */
export type ShapeOf<C> = C extends string
    ? C extends keyof ComponentRegistry
        ? ComponentRegistry[C]
        : OpenShape
    : C extends ComponentShape
      ? C
      : OpenShape;

type VariantMap<C extends ComponentRef> =
    ShapeOf<C> extends { variants: infer V extends Record<string, string> }
        ? V
        : {};

/** A variant group's value: one of its strings, or a boolean for a `"true" | "false"` group. */
export type VariantValue<V> = V | ("true" extends V ? boolean : never);

/** A component's variant selection. Groups left out or `undefined` take their default. A
 *  component that isn't registered takes any group, and `tokens`. */
export type Variants<C extends ComponentRef> =
    string extends keyof VariantMap<C>
        ? {
              [group: string]:
                  | VariantValue<string>
                  | InstanceTokens<C>
                  | undefined;
          }
        : {
              [G in keyof VariantMap<C>]?:
                  | VariantValue<VariantMap<C>[G]>
                  | undefined;
          };

/** A component's slot names. A single-slot component has `"root"`. */
export type SlotOf<C extends ComponentRef> =
    ShapeOf<C> extends { slots: infer S extends string } ? S : "root";

/** The states a component reads. */
export type StateOf<C extends ComponentRef> =
    ShapeOf<C> extends { states: infer S extends string } ? S : ComponentState;

/** A component's state selection (React Native only). States left out are off. */
export type States<C extends ComponentRef> = { [S in StateOf<C>]?: boolean };

/** The `dynamic` tokens an instance may set. */
export type TokenOf<C extends ComponentRef> =
    ShapeOf<C> extends { tokens: infer T extends string } ? T : never;

/** A token's value on an instance: a CSS value on the web, a number or string on native. */
export type TokenValue = string | number;

/** The `dynamic` tokens an instance sets, such as a circular progress's `value`. */
export type InstanceTokens<C extends ComponentRef> = {
    [T in TokenOf<C>]?: TokenValue | undefined;
};

/** What a factory takes: variants, plus the instance's tokens. */
export type Selection<C extends ComponentRef> = Variants<C> & {
    tokens?: InstanceTokens<C> | undefined;
};

/** CSS custom properties for an element's `style`. */
export type TokenStyle = Readonly<Record<`--${string}`, string>>;

/** One slot's classes on the web, and the CSS vars for instance tokens where it has any. */
export interface SlotClasses {
    readonly class: string;
    readonly style?: TokenStyle;
}

/** Each slot's classes. */
export type ClassSlots<C extends ComponentRef> = {
    readonly [S in SlotOf<C>]: SlotClasses;
};

/** Web: class strings per slot, plus CSS vars for instance tokens. States aren't in the
 *  selection: the element carries them and the CSS matches them. */
export type ClassFactory<C extends ComponentRef> = (
    selection: Selection<C>,
) => ClassSlots<C>;

/** One slot's resolved style on React Native, and what it draws with SVG, where it does. */
export interface SlotStyle<Style = object, Drawing = object> {
    readonly style: Style;
    readonly drawing?: Drawing;
}

/** Each slot's resolved style. */
export type StyleSlots<
    C extends ComponentRef,
    Style = object,
    Drawing = object,
> = {
    readonly [S in SlotOf<C>]: SlotStyle<Style, Drawing>;
};

/** React Native: resolved style objects per slot. States are part of the selection. */
export type StyleFactory<
    C extends ComponentRef,
    Style = object,
    Drawing = object,
> = (selection: Selection<C> & States<C>) => StyleSlots<C, Style, Drawing>;
