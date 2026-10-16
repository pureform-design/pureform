/** @jsxImportSource react */
// A scene in React: the ready-made component inside `PureformProvider` with the demo's registry.
// The browser (`harness.tsx`) and the server (`server.tsx`) render the same view.

import { PureformProvider } from "@pureform/react";
import { Button } from "@pureform/react/button";
import { Checkbox } from "@pureform/react/checkbox";
import { createElement, type ComponentType, type ReactNode } from "react";

import type { ComponentName, Scene, SceneProps } from "../../harness/scene";
import { registry } from "../../registry";

/** Every component the suites render, by name. */
export const components: Record<ComponentName, ComponentType<never>> = {
    Button,
    Checkbox,
};

export function SceneView(props: {
    scene: Scene;
    props: SceneProps;
}): ReactNode {
    return (
        <PureformProvider
            registry={registry}
            dir={props.scene.provider?.dir}
            motion={props.scene.provider?.motion}
        >
            {createElement(
                components[props.scene.component] as ComponentType<object>,
                props.props,
            )}
        </PureformProvider>
    );
}
