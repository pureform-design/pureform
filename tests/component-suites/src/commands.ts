// Commands the suites run in Node. `renderOnServer` renders a scene with the running binding's
// server build: a Vite server in SSR mode loads `src/bindings/<binding>/server.tsx` with the same
// plugins and the same target's registry as the browser project, so the component code is the
// same and only the build differs.

import { fileURLToPath } from "node:url";

import solid from "@solidjs/vite-plugin";
import react from "@vitejs/plugin-react";
import { createServer, type Plugin, type ViteDevServer } from "vite";
import type { BrowserCommand } from "vitest/node";

import type { Scene } from "./harness/scene";
import type { ServerRender } from "./harness/server";
import { TARGETS } from "./targets/targets";
import type { TargetName } from "./targets/targets";

const root = fileURLToPath(new URL("..", import.meta.url));

type Binding = "solid" | "react";

const servers = new Map<string, Promise<ViteDevServer>>();

const serverFor = (
    binding: Binding,
    target: TargetName,
): Promise<ViteDevServer> => {
    const key = `${binding}/${target}`;
    let server = servers.get(key);
    if (!server) {
        server = createServer({
            configFile: false,
            root,
            logLevel: "error",
            appType: "custom",
            // One dependency cache per server: they start at once, and would otherwise clear
            // each other's.
            cacheDir: `node_modules/.vite/ssr-${binding}-${target}`,
            server: { middlewareMode: true, hmr: false, ws: false },
            plugins: binding === "solid" ? [solid({ ssr: true })] : [react()],
            ssr: {
                // Through Vite, so its plugins compile the bindings' sources (Solid's JSX).
                noExternal: [/^@pureform\//],
            },
            resolve: {
                dedupe: ["solid-js", "@solidjs/web", "react", "react-dom"],
                alias: [
                    {
                        find: /^#registry$/,
                        replacement: `${root}src/targets/${target}/registry.ts`,
                    },
                ],
            },
        });
        servers.set(key, server);
    }
    return server;
};

// Project names are the binding and the target, and carry the browser: "solid/css (chromium)".
const projectOf = (project: string): [Binding, TargetName] => {
    const [binding, target] = project.split(" ")[0]!.split("/");
    if (
        (binding === "solid" || binding === "react") &&
        TARGETS.includes(target as TargetName)
    ) {
        return [binding, target as TargetName];
    }
    throw new Error(
        `no binding and target for the Vitest project "${project}"`,
    );
};

const renderOnServer: BrowserCommand<[scene: Scene]> = async (
    context,
    scene,
) => {
    const [binding, target] = projectOf(context.project.name);
    const server = await serverFor(binding, target);
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
