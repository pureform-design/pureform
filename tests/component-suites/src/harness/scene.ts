// What a suite asks a binding to render, without naming a framework: one ready-made component
// with its props, inside a `PureformProvider` holding the target's registry (`#registry`). Each
// binding has a view of it (`src/bindings/<binding>/scene.tsx`) that renders it in the browser and
// on the server.

import type { ComponentName, SceneProps } from "@pureform/component-cases";

// The component names and props live with the cases.
export { COMPONENT_NAMES } from "@pureform/component-cases";
export type { ComponentName, SceneProps } from "@pureform/component-cases";

/** An indication by name, so a scene stays plain data the server can take: Material's (with
 *  the ink well, the sparkle, or no ripple), none, the suites' own (`harness/indications.ts`), or
 *  Material's without its layer element, for the benchmark.
 *  Each binding's `scene.tsx` turns the name into its indication. */
export type SceneIndication =
    | "material"
    | "ink-sparkle"
    | "no-ripple"
    | "none"
    | "custom"
    | "no-layer";

/** The provider's options a scene sets. */
export interface SceneProvider {
    /** The provider's indication, which every component under it takes. */
    readonly indication?: SceneIndication | undefined;
    readonly dir?: "ltr" | "rtl" | undefined;
    readonly motion?: "system" | "reduce" | "full" | undefined;
    /** A named theme from the suites' config (`teal`, `sharp`, `dense`). */
    readonly theme?: string | undefined;
    /** A runtime theme instead: Material's seed theme from this color (`harness/themes.ts`). */
    readonly seed?: `#${string}` | undefined;
    /** How the client gets a server-rendered runtime theme. */
    readonly hydrate?: "reuse" | "regenerate" | undefined;
    /** Token overrides, by token path. */
    readonly overrides?: Readonly<Record<string, string>> | undefined;
}

/** A component rendered around the scene's, which becomes its children. */
export interface SceneWrapper {
    readonly component: ComponentName;
    readonly props?: SceneProps | undefined;
    /** The wrapper's `indication` prop, by name. */
    readonly indication?: SceneIndication | undefined;
}

export interface Scene {
    readonly component: ComponentName;
    readonly props?: SceneProps | undefined;
    /** The component's `indication` prop, by name (an indication in `props` works too, in the
     *  browser alone). */
    readonly indication?: SceneIndication | undefined;
    readonly provider?: SceneProvider | undefined;
    /** A component the scene's renders inside, as its children. */
    readonly wrapper?: SceneWrapper | undefined;
}
