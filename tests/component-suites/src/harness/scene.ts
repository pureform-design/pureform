// What a suite asks a binding to render, without naming a framework: one ready-made component
// with its props, inside a `PureformProvider` holding the demo's registry. Each binding has a
// view of it (`src/bindings/<binding>/scene.tsx`) that renders it in the browser and on the server.

/** The ready-made components every binding renders. Add a component's name here and to each
 *  binding's `components` map in `src/bindings/<binding>/scene.tsx`. */
export const COMPONENT_NAMES = ["Button", "Checkbox"] as const;

export type ComponentName = (typeof COMPONENT_NAMES)[number];

/** A component's props, as both bindings take them: `aria-*`, `data-*`, and the shared contract's
 *  names. Use `className`-free props here; per-binding names (`class`, `className`) differ. */
export type SceneProps = Readonly<Record<string, unknown>>;

/** The provider's options a scene sets. */
export interface SceneProvider {
    readonly dir?: "ltr" | "rtl" | undefined;
    readonly motion?: "system" | "reduce" | "full" | undefined;
}

export interface Scene {
    readonly component: ComponentName;
    readonly props?: SceneProps | undefined;
    readonly provider?: SceneProvider | undefined;
}
