// Server rendering through a browser command: the test (in the browser) sends a scene, Node
// renders it with the running binding's server build, and the test hydrates the HTML it gets back.

import { commands } from "vitest/browser";

import type { Scene } from "./scene";

/** What a binding's `server.tsx` returns for a scene. */
export interface ServerRender {
    /** The scene's markup. */
    readonly html: string;
    /** Markup the page's `<head>` needs before hydrating (Solid's hydration bootstrap). */
    readonly head: string;
}

/** Renders `scene` on the server with the binding this project runs. */
export const renderOnServer = (scene: Scene): Promise<ServerRender> =>
    commands.renderOnServer(scene);

/** Runs every `<script>` in `markup`, which `innerHTML` leaves inert. */
export const runScripts = (markup: string): void => {
    const template = document.createElement("template");
    template.innerHTML = markup;
    for (const script of template.content.querySelectorAll("script")) {
        const live = document.createElement("script");
        live.textContent = script.textContent;
        document.head.append(live);
        live.remove();
    }
};
