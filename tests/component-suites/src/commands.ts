// Commands the suites run in Node. `renderOnServer` renders a scene with the running binding's
// server build: a Vite server in SSR mode loads `src/bindings/<binding>/server.tsx` with the same
// plugins as the browser project, so the component code is the same and only the build differs.

import { fileURLToPath } from "node:url";

import solid from "@solidjs/vite-plugin";
import react from "@vitejs/plugin-react";
import { createServer, type Plugin, type ViteDevServer } from "vite";
import type { BrowserCommand } from "vitest/node";

import type { Scene } from "./harness/scene";
import type { ServerRender } from "./harness/server";

const root = fileURLToPath(new URL("..", import.meta.url));

type Binding = "solid" | "react";

const servers = new Map<Binding, Promise<ViteDevServer>>();

const serverFor = (binding: Binding): Promise<ViteDevServer> => {
    let server = servers.get(binding);
    if (!server) {
        server = createServer({
            configFile: false,
            root,
            logLevel: "error",
            appType: "custom",
            server: { middlewareMode: true, hmr: false, ws: false },
            plugins: binding === "solid" ? [solid({ ssr: true })] : [react()],
            ssr: {
                // Through Vite, so its plugins compile the bindings' sources (Solid's JSX).
                noExternal: [/^@pureform\//],
            },
            resolve: {
                dedupe: ["solid-js", "@solidjs/web", "react", "react-dom"],
            },
        });
        servers.set(binding, server);
    }
    return server;
};

// Project names carry the browser: "solid (chromium)".
const bindingOf = (project: string): Binding => {
    const name = project.split(" ")[0];
    if (name === "solid" || name === "react") return name;
    throw new Error(`no binding for the Vitest project "${project}"`);
};

const renderOnServer: BrowserCommand<[scene: Scene]> = async (
    context,
    scene,
) => {
    const binding = bindingOf(context.project.name);
    const server = await serverFor(binding);
    const module = (await server.ssrLoadModule(
        `/src/bindings/${binding}/server.tsx`,
    )) as { render(scene: Scene): ServerRender | Promise<ServerRender> };
    return module.render(scene);
};

// Emulated on the whole page; nothing in the bindings reads it, which the suite checks.
const emulateColorScheme: BrowserCommand<[scheme: "light" | "dark"]> = (
    context,
    scheme,
) => context.page.emulateMedia({ colorScheme: scheme });

export const commands = { renderOnServer, emulateColorScheme };

/** Closes the server-rendering Vite servers with the test server, so the run can exit. */
export const closeServers: Plugin = {
    name: "pureform:close-ssr-servers",
    async closeBundle() {
        const open = [...servers.values()];
        servers.clear();
        await Promise.all(open.map(async (server) => (await server).close()));
    },
};

declare module "vitest/browser" {
    interface BrowserCommands {
        /** Renders a scene on the server with the running binding. */
        renderOnServer: (scene: Scene) => Promise<ServerRender>;
        /** Emulate `prefers-color-scheme` on the page. */
        emulateColorScheme: (scheme: "light" | "dark") => Promise<void>;
    }
}
