// The smoke test's global setup: starts the demo's own dev server (`vite.config.ts`, server
// rendering and all) on a free port, and provides its URL and CHROMIUM_PATH to the test
// (`src/demo.e2e.test.ts` types them). It runs in Vitest's main process, which loads the
// workspace packages' builds, as `vite dev` does; test workers resolve their sources instead.

import { fileURLToPath } from "node:url";

import { createServer } from "vite";
import type { TestProject } from "vitest/node";

const root = fileURLToPath(new URL(".", import.meta.url));

export default async function setup(project: TestProject) {
    // The server validates its env at boot; the smoke test signs no session.
    process.env.SESSION_SECRET ??= "smoke-test-secret".padEnd(32, "-");
    const server = await createServer({
        root,
        configFile: `${root}vite.config.ts`,
        logLevel: "error",
        // Any free port, not the dev server's 3000.
        server: { port: 0 },
    });
    await server.listen();
    project.provide("demoUrl", server.resolvedUrls!.local[0]!);
    project.provide("chromiumPath", process.env.CHROMIUM_PATH ?? "");
    return () => server.close();
}
