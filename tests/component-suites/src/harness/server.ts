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

/** The scope of a runtime theme's block (Solid's `data-pf-theme`, React's `data-href`). */
const blockScope = (element: Element): string | null =>
    element.getAttribute("data-pf-theme") ?? element.getAttribute("data-href");

/** Puts the server's head markup in the page, as a page load would: every `<script>` runs (which
 *  `innerHTML` leaves inert), and every other tag (a runtime theme's `<style>` block) goes into
 *  `<head>`, in place of a block an earlier render left for the same theme. */
export const applyHead = (markup: string): void => {
    const template = document.createElement("template");
    template.innerHTML = markup;
    for (const element of Array.from(template.content.children)) {
        if (element.tagName === "SCRIPT") {
            const live = document.createElement("script");
            live.textContent = element.textContent;
            document.head.append(live);
            live.remove();
            continue;
        }
        const scope = blockScope(element);
        if (scope !== null) {
            for (const old of document.head.querySelectorAll("style")) {
                if (blockScope(old) === scope) old.remove();
            }
        }
        document.head.append(element);
    }
};
