// The smoke test's global setup: starts the demo's own dev server (`vite.config.ts`, server
// rendering and all) on a free port, compiles the pages the tests visit, and provides its URL and
// CHROMIUM_PATH to the test (`vitest-e2e-context.d.ts` types them). It runs in Vitest's main
// process, which loads the workspace packages' builds, as `vite dev` does; test workers resolve
// their sources instead.

import { fileURLToPath } from "node:url";

import { chromium } from "playwright";
import { createServer, type ViteDevServer } from "vite";
import type { TestProject } from "vitest/node";

const root = fileURLToPath(new URL(".", import.meta.url));

/** The pages the tests open. */
const ROUTES = ["/", "/budget", "/budget/transactions"];

/** How long compiling them may take, on a cold cache and a loaded machine. */
const WARM_UP_LIMIT = 5 * 60_000;

/** The Zag packages the pages import through pureform's. */
const zag = [
    ...["core", "types", "utils"].map(
        (name) => `@pureform/solid > @zag-js/${name}`,
    ),
    ...[
        "anatomy",
        "collection",
        "dialog",
        "dom-query",
        "presence",
        "select",
        "tabs",
    ].map((name) => `@pureform/solid > @pureform/machines > @zag-js/${name}`),
];

export default async function setup(project: TestProject) {
    // The server validates its env at boot; the smoke test signs no session.
    process.env.SESSION_SECRET ??= "smoke-test-secret".padEnd(32, "-");
    const server = await createServer({
        root,
        configFile: `${root}vite.config.ts`,
        logLevel: "error",
        // Any free port, not the dev server's 3000.
        server: { port: 0 },
        // Bundled up front: found as the pages load, they'd make Vite bundle the dependencies
        // again and reload the page, and the warm-up visit every page again.
        optimizeDeps: { include: zag },
    });
    await server.listen();
    const url = server.resolvedUrls!.local[0]!;
    const chromiumPath = process.env.CHROMIUM_PATH ?? "";
    try {
        await warmUp(server, url, chromiumPath);
    } catch (error) {
        await server.close();
        throw error;
    }
    project.provide("demoUrl", url);
    project.provide("chromiumPath", chromiumPath);
    return () => server.close();
}

/**
 * Opens every page the tests visit in Chromium until a round of visits leaves the dev server with
 * nothing new to do. A cold server transforms each module on its first request, for the server
 * render and the browser, and its dependency optimizer may find dependencies the pages import
 * lazily, bundle them again, and reload the page; under load that takes longer than a test's
 * navigation limit, so it all happens here, before any test starts.
 */
async function warmUp(
    server: ViteDevServer,
    url: string,
    chromiumPath: string,
) {
    const deadline = Date.now() + WARM_UP_LIMIT;
    const optimizer = server.environments.client.depsOptimizer;
    const browser = await chromium.launch({
        ...(chromiumPath ? { executablePath: chromiumPath } : {}),
        timeout: WARM_UP_LIMIT,
    });
    try {
        for (let round = 1; ; round++) {
            const hash = optimizer?.metadata.browserHash;
            let reloads = 0;
            for (const route of ROUTES) {
                const page = await browser.newPage();
                let loads = 0;
                page.on("load", () => loads++);
                await page.goto(new URL(route, url).href, {
                    waitUntil: "networkidle",
                    timeout: Math.max(deadline - Date.now(), 1),
                });
                // Dependencies the visit found are bundled before the round counts as settled.
                while (optimizer) {
                    const pending = Object.values(
                        optimizer.metadata.discovered,
                    );
                    if (pending.length === 0) break;
                    await Promise.all(pending.map((dep) => dep.processing));
                }
                await page.waitForLoadState("networkidle", {
                    timeout: Math.max(deadline - Date.now(), 1),
                });
                reloads += loads - 1;
                await page.close();
            }
            // A round without a reload or a new dependency bundle leaves every page compiled.
            if (reloads === 0 && optimizer?.metadata.browserHash === hash)
                return;
            if (Date.now() > deadline)
                throw new Error(`round ${round} still reloaded`);
        }
    } catch (error) {
        throw new Error(
            `The demo's dev server didn't finish compiling ${ROUTES.join(", ")} within ` +
                `${WARM_UP_LIMIT / 60_000} minutes; the smoke test can't start.`,
            { cause: error },
        );
    } finally {
        await browser.close();
    }
}
