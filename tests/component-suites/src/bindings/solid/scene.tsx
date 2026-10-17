// A scene in Solid: the ready-made component inside `PureformProvider` with the target's registry.
// The browser (`harness.tsx`) and the server (`server.tsx`) render the same view.

import { PureformProvider } from "@pureform/solid";
import { Button } from "@pureform/solid/button";
import { Checkbox } from "@pureform/solid/checkbox";
import { Dynamic } from "@solidjs/web";
import type { JSX, ValidComponent } from "@solidjs/web";
import type { Accessor } from "solid-js";

import { registry } from "#registry";

import type { ComponentName, Scene, SceneProps } from "../../harness/scene";
import { sceneTheme } from "../../harness/themes";

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
            theme={sceneTheme(props.scene.provider)}
            hydrate={props.scene.provider?.hydrate}
            overrides={props.scene.provider?.overrides}
        >
            <Dynamic
                component={components[props.scene.component]}
                {...(props.props() as object)}
            />
        </PureformProvider>
    );
}
