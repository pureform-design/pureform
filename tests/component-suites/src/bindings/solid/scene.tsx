// A scene in Solid: the ready-made component inside `PureformProvider` with the demo's registry.
// The browser (`harness.tsx`) and the server (`server.tsx`) render the same view.

import { PureformProvider } from "@pureform/solid";
import { Button } from "@pureform/solid/button";
import { Checkbox } from "@pureform/solid/checkbox";
import { Dynamic } from "@solidjs/web";
import type { JSX, ValidComponent } from "@solidjs/web";
import type { Accessor } from "solid-js";

import type { ComponentName, Scene, SceneProps } from "../../harness/scene";
import { registry } from "../../registry";

/** Every component the suites render, by name. */
export const components: Record<ComponentName, ValidComponent> = {
    Button,
    Checkbox,
};

export function SceneView(props: {
    scene: Scene;
    props: Accessor<SceneProps>;
}): JSX.Element {
    return (
        <PureformProvider
            registry={registry}
            dir={props.scene.provider?.dir}
            motion={props.scene.provider?.motion}
        >
            <Dynamic
                component={components[props.scene.component]}
                {...(props.props() as object)}
            />
        </PureformProvider>
    );
}
