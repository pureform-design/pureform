// Server rendering, then hydrating: what the server rendering and indication suites share. The
// server renders a scene, the page takes its HTML, and the binding hydrates it, recording what it
// logged and changed.

import { harness } from "#binding";

import { hostIn, watchConsole } from "./page";
import type { Scene } from "./scene";
import { applyHead, renderOnServer } from "./server";

/** Every element under `host` with its attributes, in document order. */
const snapshot = (host: HTMLElement) =>
    [...host.querySelectorAll("*")].map((element) => ({
        element,
        tag: element.tagName.toLowerCase(),
        attributes: Object.fromEntries(
            [...element.attributes].map(({ name, value }) => [name, value]),
        ),
    }));

/** Renders the scene on the server and puts its HTML in a new host (inside `around`, marked
 *  `data-host`), before any hydration. */
export const serverRendered = async (
    scene: Scene,
    around = `<div data-host></div>`,
) => {
    const { html, head } = await renderOnServer(scene);
    applyHead(head);
    const host = hostIn(around);
    host.innerHTML = html;
    return host;
};

/** Hydrates the server's HTML, and lists what hydration logged and changed. */
export const hydrate = async (scene: Scene, around?: string) => {
    const host = await serverRendered(scene, around);
    const before = snapshot(host);
    const console = watchConsole();
    try {
        await harness.hydrate(scene, host);
        await harness.settle();
    } finally {
        console.stop();
    }
    const after = snapshot(host);
    const changes = before.flatMap(({ element, tag, attributes }, index) => {
        if (!element.isConnected) return [`<${tag}> #${index} was replaced`];
        const now = after.find(
            (entry) => entry.element === element,
        )!.attributes;
        const names = new Set([
            ...Object.keys(attributes),
            ...Object.keys(now),
        ]);
        return [...names]
            .filter((name) => attributes[name] !== now[name])
            .map(
                (name) =>
                    `<${tag}> #${index} ${name}: ${JSON.stringify(attributes[name])} → ${JSON.stringify(now[name])}`,
            );
    });
    if (after.length !== before.length) {
        changes.push(
            `${before.length} elements before hydrating, ${after.length} after`,
        );
    }
    return { host, logged: console.logged, changes };
};
