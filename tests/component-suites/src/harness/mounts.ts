// Every scene a harness mounts, removed after each test with whatever the test added to the page.

import { afterEach } from "vitest";

import type { Mounted } from "./harness";

let mounted: Mounted[] = [];

afterEach(() => {
    for (const scene of mounted) scene.unmount();
    mounted = [];
    document.body.innerHTML = "";
});

/** Registers a mounted scene for removal after the test. */
export const track = (scene: Mounted): Mounted => {
    mounted.push(scene);
    return scene;
};
