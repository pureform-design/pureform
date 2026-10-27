// The types every binding and generated factory shares. A component is named by a key of
// `ComponentRegistry`, which the generated `.d.ts` augments from the app's config, or described
// inline by a `ComponentShape`. The web factory's output types are `@pureform/styling-web`'s.

import type {
    FormCondition,
    InteractionCondition,
    MarkCondition,
    SpringNode,
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
    /** The tokens among `tokens` that hold a spring, as a union. Default none. */
    springs?: string;
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

/** The theme's spring roles, by name. Generated declarations augment it from the config's
 *  `springs`. */
export interface SpringRoleRegistry {}

/** A spring role's name, such as `"spatialSlow"`, or any string while none is registered. */
export type SpringRole = [keyof SpringRoleRegistry] extends [never]
    ? string
    : // oxlint-disable-next-line typescript/no-redundant-type-constituents -- `& string` drops the number and symbol keys `keyof` may add; redundant only while a registry is augmented
      keyof SpringRoleRegistry & string;

/** A registered component's name, or any string while nothing is registered. */
export type ComponentName = [keyof ComponentRegistry] extends [never]
    ? string
    : // oxlint-disable-next-line typescript/no-redundant-type-constituents -- `& string` drops the number and symbol keys `keyof` may add; redundant only while a registry is augmented
      keyof ComponentRegistry & string;

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
    springs: string;
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

/** The spring-valued tokens among `TokenOf<C>`, such as tabs' `indicatorSpring`. */
export type SpringTokenOf<C extends ComponentRef> =
    ShapeOf<C> extends { springs: infer S extends string } ? S : never;

/** A spring token's value on an instance: a spring (core's `spring({ ... })`), or a spring
 *  role's name (`"spatialSlow"`), which follows the theme's role. */
export type InstanceSpringValue = SpringNode | SpringRole;

/** Any token's value on an instance: a `TokenValue`, or an `InstanceSpringValue`. */
// oxlint-disable-next-line typescript/no-redundant-type-constituents -- redundant only while the registry is augmented, and TokenValue then takes any string; the name keeps the role names documented
export type InstanceTokenValue = TokenValue | InstanceSpringValue;

/** The `dynamic` tokens an instance sets, such as a circular progress's `value`. A spring
 *  token takes an `InstanceSpringValue`, and only a spring token takes a spring. A component
 *  the types don't know takes either on any token. */
export type InstanceTokens<C extends ComponentRef> = {
    [T in TokenOf<C>]?:
        | (string extends T
              ? InstanceTokenValue
              : T extends SpringTokenOf<C>
                ? InstanceSpringValue
                : TokenValue)
        | undefined;
};

/** What a factory takes: variants, plus the instance's tokens. */
export type Selection<C extends ComponentRef> = Variants<C> & {
    tokens?: InstanceTokens<C> | undefined;
};

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
