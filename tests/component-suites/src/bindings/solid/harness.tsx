// The Solid harness: mounts and hydrates scenes with `@solidjs/web`, and sets props through a
// signal, as an owner would.

import { createInteractionSource, useInteractionState } from "@pureform/solid";
import type { MutableInteractionSource } from "@pureform/solid";
import { hydrate, render } from "@solidjs/web";
import { createSignal, flush } from "solid-js";

import type { Harness, Mounted, ObservedSource } from "../../harness/harness";
import { track } from "../../harness/mounts";
import type { Scene, SceneProps } from "../../harness/scene";
import { SceneView } from "./scene";

const settle = async (): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    flush();
};

const start = (
    scene: Scene,
    host: HTMLElement,
    run: typeof render,
): Mounted => {
    const [props, setProps] = createSignal<SceneProps>(scene.props ?? {}, {
        ownedWrite: true,
    });
    const dispose = run(() => <SceneView scene={scene} props={props} />, host);
    flush();
    return track({
        host,
        update: async (next) => {
            setProps((current) => ({ ...current, ...next }));
            flush();
            await settle();
        },
        unmount: dispose,
    });
};

const STATE = "data-interaction-state";

const observe = (): ObservedSource => {
    const host = document.body.appendChild(document.createElement("div"));
    let source!: MutableInteractionSource;
    const dispose = render(() => {
        source = createInteractionSource();
        const state = useInteractionState(source);
        return <output {...{ [STATE]: JSON.stringify(state()) }} />;
    }, host);
    flush();
    track({ host, update: settle, unmount: dispose });
    return {
        source,
        state: () => JSON.parse(host.firstElementChild!.getAttribute(STATE)!),
    };
};

export const harness: Harness = {
    name: "solid",
    mount: (
        scene,
        host = document.body.appendChild(document.createElement("div")),
    ) => start(scene, host, render),
    hydrate: async (scene, host) => {
        const mounted = start(scene, host, hydrate as typeof render);
        await settle();
        return mounted;
    },
    observe,
    settle,
};
