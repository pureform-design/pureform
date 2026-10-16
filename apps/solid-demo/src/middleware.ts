// The server middleware chain (wired via `start.middleware` in
// vite.config.ts): fetch-style functions fronting every request the server
// dispatches — page renders, server function calls, and API routes alike.
// Each runs inside the request-event scope, so getRequestEvent() (and the
// session helpers built on it) work here exactly as in application code.
import { createAPIHandler } from "filesystem-routing/api";
import routes from "virtual:file-routes";

// createAPIHandler serves the GET/POST/... exports of the modules under
// src/api (mounted at /api — see the fileRoutes config in vite.config.ts)
// and passes everything else down the chain. The chain hands middleware the request event,
// and the handler takes the request.
const api = createAPIHandler(routes);

export default [
    (event: { request: Request }, next: () => Promise<Response>) =>
        api(event.request, next),
];
