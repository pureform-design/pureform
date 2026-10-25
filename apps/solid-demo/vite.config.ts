import { pandacss } from "@pandacss/vite";
import pureform from "@pureform/bundler/vite";
import solid from "@solidjs/vite-plugin";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { routePathFromFile } from "filesystem-routing";
import { fileRoutes } from "filesystem-routing/vite";
import { defineConfig } from "vitest/config";

import { codegen } from "./pureform.codegen.ts";

export default defineConfig({
    // Turnkey streaming SSR under a third-party router: no index.html and no
    // entry files — the plugin generates the entries around src/App.tsx,
    // wrapped in src/Document.tsx. `vite build` emits client assets to
    // dist/client and the request handler to dist/server, plus the Node server
    // (dist/server/node.js) `npm start` runs.
    plugins: [
        // Writes `.pureform/` (the registry and Panda's `staticCss`) from pureform.config.ts
        // when dev or build starts, before Panda reads its config, and again when the config
        // changes.
        pureform(codegen),
        // Generates src/routeTree.gen.ts from src/routes; must be registered
        // before solid(). Each route's component compiles to a lazy chunk that
        // resolves at the read point during hydration (the router commits the
        // server's matches from Solid's hydration registry before rendering), so
        // no chunk-preload manifest from TanStack's start layer is needed.
        tanstackRouter({ target: "solid", autoCodeSplitting: true }),
        pandacss({ transform: true }),
        solid({
            start: {
                middleware: "./src/middleware.ts",
                // Per-request SSR preparation: builds this request's TanStack
                // router + Query cache and runs the loaders (see src/setup.tsx).
                // Ignored when `ssr` is false.
                setup: "./src/setup.tsx",
                // Emit dist/server/node.js: a ready-to-run Node server (static
                // assets + the handler). Other platforms import dist/server/server.js.
                node: true,
                // Typed env is on by convention: ./env.ts is probed automatically.
                // (Set `env: false` here to opt out.)
            },
            // Set to false for a static shell + API server: pages render on the
            // client while server functions, sessions, and API routes keep working.
            ssr: true,
            // Dev-only: capture control at /__solid/diagnostics (see AGENTS.md).
            diagnostics: true,
            // Dev-only, and on by default: Solid's tracks in Chrome's Performance panel. They
            // record every computation as it runs, which makes mounting a page several times
            // slower (a second to bring back the transactions' rows), so they're off; set
            // `true` while profiling.
            performanceTracks: false,
            // The configure module runs in the handler graph before any dispatch —
            // it registers the Query single-flight collector.
            serverFunctions: { configure: "./src/server-config.ts" },
        }),
        // API routes only — TanStack owns src/routes, so the file-system router
        // scans src/api instead and mounts every module under /api.
        fileRoutes({
            dir: "src/api",
            httpMethods: true,
            toPath: (file) => "/api" + routePathFromFile(file),
        }),
    ],
    resolve: {
        tsconfigPaths: true,
    },
    ssr: {
        // pureform's packages go through Vite on the server too: `@pureform/solid` ships JSX
        // for the app's Solid plugin to compile, and in development every workspace package
        // resolves to its TypeScript sources, which Node can't load.
        noExternal: [/^@pureform\//],
    },
    server: {
        port: 3000,
    },
    build: {
        target: "esnext",
        assetsInlineLimit: 0,
    },
});
