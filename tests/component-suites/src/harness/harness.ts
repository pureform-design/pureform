// The interface each binding implements, so one suite runs against Solid and React. A suite
// imports the running binding's harness from `#binding`, which each Vitest project aliases to its
// own `src/bindings/<binding>/harness.tsx`.

import type { Scene, SceneProps } from "./scene";

/** A scene rendered into the page. */
export interface Mounted {
    /** The element the scene renders into. */
    readonly host: HTMLElement;
    /** Sets props from outside, as an owner would, and waits for the render. A key set to
     *  `undefined` is passed as `undefined`. Safe to call from a component's callback. */
    update(props: SceneProps): Promise<void>;
    /** Removes the scene. Called for every mounted scene after each test. */
    unmount(): void;
}

export interface Harness {
    readonly name: "solid" | "react";
    /** Renders `scene` into `host` (a new element at the end of the body by default). Put
     *  `host` inside a form or fieldset to test the component in one. */
    mount(scene: Scene, host?: HTMLElement): Mounted;
    /** Hydrates `host`, which already holds the server's HTML for `scene`. */
    hydrate(scene: Scene, host: HTMLElement): Promise<Mounted>;
    /** Waits until the binding and the machines have applied everything queued: microtasks (Zag's
     *  sends), the framework's updates, and the next task. */
    settle(): Promise<void>;
}
