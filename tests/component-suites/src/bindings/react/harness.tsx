/** @jsxImportSource react */
// The React harness: mounts and hydrates scenes with `react-dom/client`, and sets props through
// state, as an owner would. React schedules its work as it would in an app (not in `act`), and
// `settle` waits for it.

import { type ReactNode, useState } from "react";
import { flushSync } from "react-dom";
import { createRoot, hydrateRoot, type Root } from "react-dom/client";

import type { Harness, Mounted } from "../../harness/harness";
import { track } from "../../harness/mounts";
import type { Scene, SceneProps } from "../../harness/scene";
import { SceneView } from "./scene";

const task = () => new Promise((resolve) => setTimeout(resolve, 0));

// React runs passive effects (where Zag syncs the native input) in a scheduler task of its own,
// which can land after a timeout; a frame and two tasks cover it.
const settle = async (): Promise<void> => {
    await task();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await task();
    await task();
};

const start = (
    scene: Scene,
    host: HTMLElement,
    run: (view: ReactNode) => Root,
): Mounted => {
    let set: (update: (props: SceneProps) => SceneProps) => void = () => {};
    function Owner(): ReactNode {
        const [props, setProps] = useState<SceneProps>(scene.props ?? {});
        set = setProps;
        return <SceneView scene={scene} props={props} />;
    }
    const root = run(<Owner />);
    return track({
        host,
        update: async (next) => {
            set((current) => ({ ...current, ...next }));
            await settle();
        },
        unmount: () => root.unmount(),
    });
};

export const harness: Harness = {
    name: "react",
    mount: (
        scene,
        host = document.body.appendChild(document.createElement("div")),
    ) =>
        start(scene, host, (view) => {
            const root = createRoot(host);
            flushSync(() => root.render(view));
            return root;
        }),
    hydrate: async (scene, host) => {
        const mounted = start(scene, host, (view) =>
            hydrateRoot(host, view, {
                onRecoverableError: (error) =>
                    console.error("hydration:", error),
            }),
        );
        await settle();
        return mounted;
    },
    settle,
};
