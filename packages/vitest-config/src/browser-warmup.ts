// A global setup for a browser-mode project (`@pureform/vitest-config/browser-warmup` in its
// `globalSetup`). Before any test runs, it compiles every module the project's test files load,
// their imports and dynamic imports all the way down, on the Vite server the browser loads them
// from, and lets the dependency optimizer bundle the dependencies it finds. A cold server does that
// while a hook waits on the page's first import, and a dependency it finds there makes it reload
// the test; under load the one can run out the hook's time, and the other fails the file.

import { isCSSRequest } from "vite";
import type { TestProject } from "vitest/node";

/** How long compiling may take, on a cold cache and a loaded machine. */
const WARM_UP_LIMIT = 5 * 60_000;

export default async function setup(project: TestProject) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const limit = new Promise<never>((_, reject) => {
        timer = setTimeout(
            () =>
                reject(
                    new Error(
                        `The test server didn't finish compiling the test files' modules within ` +
                            `${WARM_UP_LIMIT / 60_000} minutes; the tests can't start.`,
                    ),
                ),
            WARM_UP_LIMIT,
        );
    });
    try {
        await Promise.race([warmUp(project), limit]);
    } finally {
        clearTimeout(timer);
    }
}

async function warmUp(project: TestProject) {
    const environment = project.vite.environments.client!;
    const optimizer = environment.depsOptimizer;
    // The optimizer starts with the browser's first request; started here, it bundles what the
    // warm-up finds before any page loads.
    await optimizer?.init();
    const { testFiles } = await project.globTestFiles();
    const entries = testFiles.map(
        (file) => `/${file.slice(project.config.root.length + 1)}`,
    );
    for (;;) {
        const hash = optimizer?.metadata.browserHash;
        // Each module once per round, so one that fails to compile (and logs why) isn't retried.
        const requested = new Set<string>();
        let pending = entries;
        // Every module a compiled one imports, until none is left to compile.
        while (pending.length > 0) {
            for (const url of pending) requested.add(url);
            await Promise.all(
                pending.map((url) => environment.warmupRequest(url)),
            );
            await environment.waitForRequestsIdle();
            const next = new Set<string>();
            for (const module of environment.moduleGraph.idToModuleMap.values()) {
                // A stylesheet's imports are the files its compiler read (Tailwind's sources,
                // Panda's folder), which the page never requests.
                if (!module.transformResult || isCSSRequest(module.url))
                    continue;
                for (const imported of module.importedModules) {
                    const { url, id, transformResult } = imported;
                    if (transformResult || requested.has(url)) continue;
                    // Optimized dependencies are served once bundled; a request for one now
                    // would wait on the bundle.
                    if (optimizer?.isOptimizedDepUrl(url)) continue;
                    if (id && optimizer?.isOptimizedDepFile(id)) continue;
                    next.add(url);
                }
            }
            pending = [...next];
        }
        while (optimizer) {
            const discovered = Object.values(optimizer.metadata.discovered);
            if (discovered.length === 0) break;
            await Promise.all(discovered.map((dep) => dep.processing));
        }
        // A new bundle that changed the old ones invalidated every module; compile them again.
        if (optimizer?.metadata.browserHash === hash) return;
    }
}
