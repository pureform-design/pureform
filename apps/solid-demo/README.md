# solid-demo

pureform's Solid demo: small apps built from `@pureform/solid`'s Material components, rendered on
the server and hydrated, with one floating panel that restyles all of them at run time. It runs on
Solid 2 with [TanStack Router](https://tanstack.com/router) for routing and
[TanStack Query](https://tanstack.com/query) for data, over Solid's server functions and
single-flight mutations, and styles the components through pureform's Panda target.

```sh
bun run dev     # streaming SSR on http://localhost:3000; regenerates .pureform/ and the route tree
bun run build   # dist/client and dist/server (a pruned build, see below)
bun run start   # the production build on Node (dist/server/node.js)
```

Through omni: `build` (after `prepare`: the `generate` task, then `panda codegen`), and
`test:e2e`, the smoke test below. Copy `.env.example` to `.env` first: the server validates
`SESSION_SECRET` at boot (`env.ts`).

## Routes

| Route                  | What it is                                                                                                      |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| `/`                    | The launcher: one panel listing every app in `src/apps.ts`, each a link to its route                            |
| `/budget`              | The budget app's layout: top app bar, navigation rail (wide) or bar (compact), FAB, its dialogs and snackbar    |
| `/budget/`             | Overview: balance, the month's income and spending, six months as a bar chart, the fullest budgets, recent ones |
| `/budget/transactions` | Every transaction by month: search, kind chips, and a category select, kept in the URL (`?q=&kind=&category=`)  |
| `/budget/categories`   | The month's budget per category with progress, a dialog to adjust one, and the month's income                   |

Every route renders inside the root layout (`src/routes/__root.tsx`, `src/shell/`): the settings
as providers over the whole page, the page's surface, and the floating settings button, which
stays put while an app navigates. Each app owns everything under its route, its layout included.

**Adding an app:** a layout route under `src/routes` (`<name>.tsx`, with child routes
`<name>.<page>.tsx`) and an entry in `APPS` (`src/apps.ts`: name, description, icon, avatar
color, route). The launcher and the panel's app selector list it. A page sets its top app bar's
title with `staticData: { title }`. An app with a bottom navigation bar marks it `data-bottom-bar`
and its FAB `data-app-fab`, so the floating button sits above them.

## The budget app

The data lives on the server: `src/server/budget-db.ts` (a `server-only` module) holds an
in-memory store seeded with six months of transactions ending today, which resets when the server
restarts or from the app bar's restore button. `src/lib/budget-functions.ts` are its server
functions: reads are `GET`s (`getOverview`, `getCategories`, `getTransactions`), wrapped as
`queryOptions` in `src/lib/queries.ts` and prefetched by each route's loader; mutations
(`saveTransaction`, `deleteTransaction`, `setCategoryBudget`, `resetBudget`) end with
`reload({ revalidate: "budget" })`, so one request saves and brings back every budget query the
page shows (single flight, below). The layout runs the mutations (`src/budget/actions.ts`), so a
dialog can close at once and the snackbar reports the outcome, with an undo for a delete.

Amounts are integer cents and dates `YYYY-MM-DD`, formatted in UTC, so the server and the browser
render the same text. Amounts and counts are isolated from the text around them, so they read
correctly right to left.

## The settings panel

The floating button (bottom of the inline end) opens a modal side sheet: Zag's dialog through
`Dialog`'s parts, docked to the inline end, with tabs for the settings and the app selector. Each
setting maps to what pureform offers at run time on the web:

| Setting      | Values                                          | How it applies                                                                             |
| ------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Color scheme | system, light, dark                             | `.light`/`.dark` on `<html>`, which the stylesheet's scheme rules read                     |
| Color        | baseline, `teal`, four seeds, any `#rrggbb`     | none (the config's palette), a named theme, or `seedTheme({ seed })` generated at run time |
| Shape        | Material, squircle, soft, sharp                 | named themes (`squircle`, `soft`, `sharp`)                                                 |
| Density      | comfortable, default, compact, dense            | named themes (`comfortable`, `compact`, `dense`): the theme's density offset               |
| Font         | Roboto, system, serif headings, monospace       | the provider's `overrides` of `fonts.plain` and `fonts.brand`                              |
| Direction    | left to right, right to left                    | the provider's `dir` (machines and CSS), and `dir` on `<html>`                             |
| Motion       | system, reduced, full                           | the provider's `motion` (`data-pf-motion`)                                                 |
| Indication   | ripple, sparkle, no ripple, bold (custom), none | the provider's `indication`: `materialIndication`, `noIndication`, or `defineIndication`   |

A provider takes one theme, so the shell nests one per domain (`src/shell/shell.tsx`): shape
outside, then density, then color; the outer one also carries the direction, motion, indication,
and font overrides. The color swatches are drawn by the theme each would apply (a provider around
each), and render only while the panel is open, so their seed themes are generated in the
browser. Material's contrast levels have no counterpart: `materialColor` and `seedTheme` take a
seed, custom seeds, and overrides, but no contrast.

**Kept in a cookie.** The settings are the `settings` query: the server reads them from the
`pureform-demo-settings` cookie (`getSettings`, and `src/Document.tsx` for `<html>`'s class and
`dir`), and `src/setup.tsx` loads the seed theme's generator before rendering, so the server
renders the page as it will hydrate, with no flash. A change updates the query's cache and
writes the cookie in the browser (`src/shell/settings.tsx`), so it applies at once. It isn't a
mutation on purpose: solid-query runs each mutation as a Solid transaction, which holds every
write until the request settles. Reset puts back the defaults.

## Styling

Pages use `@pureform/solid` components for everything, laid out with Panda's `css()` and the
pureform preset's tokens (spacing, colors, radii, type, motion), never Panda's recipe functions.
Two pieces pureform has no component for are the demo's own, styled only with those tokens:

- `TopAppBar` (`src/ui/top-app-bar.tsx`): Material's small top app bar (64dp from `spacing.16`,
  the `surface` pair, `titleLarge` through `Text`), sticky at the top.
- `BarChart` (`src/ui/bar-chart.tsx`): grouped bars in `primary` and `tertiary`, `extraSmall`
  corners, grown with the `medium4` duration and `emphasizedDecelerate` easing (not under reduced
  motion), labels in `Text`, and a `Separator` for the axis.

Layers come from the theme's stacking scale: the top app bar, the navigation bar, and the FABs sit
at `zIndex: "raised"`, and pureform's overlays at their own layers above (menus and select lists,
the scrim, dialogs, snackbars, tooltips), so nothing needs a number. The settings panel's side
sheet is a dialog that slides in from the inline end (`sheetIn` and `sheetOut` in
`panda.config.ts`, timed by the motion tokens) and only fades under reduced motion, as every
overlay does.

Icons are Material Icons' paths as inline SVG (`Glyph`, `src/ui/icons.tsx`), 1em in
`currentColor`, so each component's icon part sizes and colors them. A `Glyph` makes its element
when it's inserted: ready-made components read an icon prop once to see whether it's there, and
an element made by that read during hydration has no server-rendered match (Solid warns about a
hydration key miss).

Links (`href` on a navigation destination, list item, or card) are plain `<a>` elements; one click
handler on the shell (`src/ui/links.ts`) sends same-origin clicks through the router.

## pureform in this demo

The demo is pureform's Panda target: `pureform.config.ts` composes the pureform config (Material's
defaults, a monospace `code` text style, and the named themes above), `panda.pureform.ts` compiles
it to a Panda preset, and `panda.config.ts` adds the preset, so Panda's codegen writes the recipes
into `styled-system/`.

`.pureform/` holds the style registry the components read (design doc §5.2 and §6). It's
generated and not committed (`.gitignore`): the bundler plugin (`@pureform/bundler/vite`, first
in `vite.config.ts`) runs `@pureform/generate` with the Panda adapter's codegen
(`@pureform/panda-adapter/codegen`, with the preset's `prefix`) over every component of the
config when `vite dev` or `vite build` starts, before Panda's own plugin reads `panda.config.ts`,
and again in dev when `pureform.config.ts` or a file it imports changes. Its options live in
`pureform.glue.ts`. Don't edit the folder; change the config.

Steps without Vite need the folder too: Panda's codegen (`panda.config.ts` imports
`.pureform/panda`) and `tsc`. Through omni, `prepare` runs the `generate` task
(`bun x pureform generate`, from `@pureform/cli`, after building the packages it loads) and then
`panda codegen`; by hand, `bun x pureform generate` (`--watch` to keep it current,
`--check` to compare without writing). The command runs under Node, as Vite does (`bun x` follows
the bin's shebang): the preset computes a shape morph differently under Bun, which changes the
glue's hash.

| File            | What it is                                                                                                                |
| --------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `web/<name>.ts` | A `ClassFactory` module per component over Panda's recipe: `{ [slot]: { class, style? } }` per selection, cached, frozen. |
| `index.ts`      | `registry` (every component, static), `version`, `themes`, `Components`.                                                  |
| `registry.d.ts` | Augments `@pureform/styling`'s `ComponentRegistry` with each component's variants, slots, and instance tokens.            |
| `panda.ts`      | `staticCss`: the variants of the components, and every theme; `panda.config.ts` uses it as its `staticCss`.               |

`tsconfig.json` includes `.pureform/` explicitly, since the base config includes only `src`.

**Builds prune** (the plugin's default, design doc §7): before generating, the plugin scans the
app's source for the components it imports and the variant values it writes, and the build keeps
only those: 24 of the config's 33 components, and a client stylesheet of 270 kB (24 kB gzipped)
instead of 1258 kB (139 kB). A pruned build writes the pruned glue to `.pureform/` in place; the
next dev server or `pureform generate` writes the full glue back. A component the scan can't see
(one drawn from a package under `node_modules`, or a registry entry looked up by a computed name)
goes in the plugin's `prune.keep`.

`vite.config.ts` keeps `@pureform/*` in the server bundle (`ssr.noExternal`): `@pureform/solid`
ships JSX for the app's Solid plugin to compile, and in development the workspace packages
resolve to TypeScript sources Node can't load. An app using `@pureform/solid` with server
rendering needs the same for `@pureform/solid`.

The cross-cutting rules (state, forms, accessibility, keyboard, direction, server rendering,
indication) are checked against Solid and React by `tests/component-suites`, over their own Panda
setup (`tests/panda-fixture`), not this demo, so the demo can change freely.

## Testing

`src/demo.e2e.test.ts` is a smoke test (the omni `test:e2e` task, after `prepare`): a global setup
(`vitest-e2e-server.ts`) starts the demo's dev server on a free port, and the test, in Chromium
through Playwright, checks that

- the launcher renders on the server, styled, hydrates without an error, and links to the budget
  app;
- the budget app opens from it in its own layout (title, balance, navigation, FAB), and its pages
  navigate on the client;
- the floating button opens the panel; the dark scheme and no indication take effect, survive a
  reload (the server renders them), reset, and the app selector goes back to the launcher.

`CHROMIUM_PATH` (`.env.local`) picks a system Chromium. The first visit lets Vite optimize the
pages' dependencies (which reloads the page once) before the tests start.

## Who owns what

- **Solid + the plugin** own the RPC (`'use server'` functions compiled to typed fetches), the single-flight envelope, serialization, the turnkey entries, `src/Document.tsx`, and typed env.
- **TanStack Router** owns routing: the file-based route tree under `src/routes` (generated into `src/routeTree.gen.ts` by `@tanstack/router-plugin`: typesafe links, params, search params, and loaders), navigation, intent-based preloading, and automatic code splitting (each route's component compiles to its own lazy chunk).
- **TanStack Query** owns the client data cache: route loaders prefetch into it, components read from it with `useQuery`, and everything the server hands back lands in it.

Single-flight crosses all three, through public seams only. No package here patches or wraps another.

## The Router + Query pairing

Every read is declared once in `src/lib/queries.ts` as `queryOptions` wrapping a Solid server function. Route loaders are **non-blocking prefetch hints**: `prefetch(queryClient, ...)` starts the fetch as navigation (or hover) begins without holding navigation on it; components read with `useQuery` and suspend at the read point. The `QueryClient` rides the router context (`src/router.tsx`), which is the idiomatic TanStack pairing.

Mutations are Solid server functions through TanStack's `useMutation`. `mutationFn` is invoked with `(variables, context)`, and a server function forwards every argument into the RPC, so wrap it in an arrow (`mutationFn: (input) => saveTransaction(input)`) so only your argument crosses the wire.

## Single-flight mutations on a foreign router

When a mutation fires, the client transport asks the server to fold refreshed data into the **same response**. The client opt-in is solid-query's own: `QueryClientProvider` subscribes its named flight-data source (`"sq"`) while mounted, and hydrates the cache from whatever payloads come back. On the server, `src/server-config.ts` (wired via `serverFunctions.configure`) registers the matching producer with `registerFlightDataSource`: solid-router's `loadFlightTarget` builds a fresh TanStack router + QueryClient for the page the browser is on, with the mutation's cookie effects already folded in, and runs its loaders; solid-query's `dehydrateSettled` awaits the in-flight fetches and ships the dehydrated cache as the payload.

The payload **is a dehydrated QueryClient**, so consuming it is TanStack's own `hydrate`: the entries land in the cache, every `useQuery` on those keys updates, and no `invalidateQueries` refetch happens anywhere. Watch the network tab while adding a transaction: exactly one `POST /_server`, and the list, the month's totals, and the category totals update from that one response.

`src/lib/flight.ts` scopes the collection: a mutation that declares its keys (`reload({ revalidate: "budget" })`) sends the client's cache inventory, the server skips loader data the client holds that no declared key names, re-executes declared queries no loader owns (`serverQueryFn`), and the client sweeps whatever a declared key matches beyond the payload. Mutations that declare nothing rerun the page's loaders and ship everything they produce.

## SSR under a router Solid doesn't own

The plugin's `start.setup` hook (`src/setup.tsx`) is the per-request seam: it builds this request's router + QueryClient, `await router.load()` starts the matched loaders' prefetches, it reads the settings and loads a seed theme's generator, and the returned component renders in App's place inside the Document, while the budget fetches are still in flight, each `useQuery` suspending on its own query.

The load's verdict rides the same seam. A server load never throws for redirects (a `redirect()` from `beforeLoad` or a loader lands in `router._serverResult`), so setup reads it after the load: a redirect folds its `Location` and status onto the event's response head, and a render carries its 200/404/500 the same way, so unknown URLs answer 404 (with the not-found page inside the shell) instead of a masquerading 200.

The SSR → client handoff is provider-owned on both layers, over the same channel. `QueryClientProvider` streams each query's dehydrated entry into the HTML stream as it settles, and the client provider primes its cache from those entries as they arrive. `RouterProvider` does the same for match state: it serializes each matched route's transferable state into Solid's hydration registry, and on the client `createRouter` primes and commits its matches from those entries before hydrating. Creating the router IS the hydration boot: no `router.load()` before hydrate, no loader re-runs.

`disableGlobalCatchBoundary: true` in `src/router.tsx` is a semantic choice, not a hydration workaround: errors bubble past the router to this app's own boundaries and stream handler instead of stopping at the router's `ErrorComponent`.

## Middleware, env, and server-only modules

- **Middleware**: `src/middleware.ts` fronts every request (page renders, server function calls, API routes). It dispatches API routes: uppercase method exports of modules under `src/api`, mounted under `/api` by `fileRoutes` in `vite.config.ts` (there are none yet; `src/routes` belongs to TanStack).
- **Typed env**: `env.ts` declares the schema; `virtual:env/server` reads `process.env` at boot, `virtual:env/client` is baked at build time.
- **Server-only modules**: `src/server/budget-db.ts` imports the `server-only` marker, so any path pulling it into the client bundle fails the build naming the importer. (Vite's dependency scanner can print that error on a cold dev start, since it walks imports before the `'use server'` transform runs; dev proceeds normally.)

## Deployment

`vite build` emits static client assets to `dist/client`, a request handler to `dist/server/server.js`, and (via `start: { node: true }`) a ready-to-run Node server at `dist/server/node.js`. SSR is the default posture; `ssr: false` in `vite.config.ts` gives a static shell with the server functions still working. The built server entry exposes one adapter-agnostic web `Request -> Response` handler in two forms:

```js
import app, { handleRequest } from "./dist/server/server.js";
// serve dist/client statically; everything else:
const response = await handleRequest(request);
const sameResponse = await app.fetch(request);
```

`dist/server/node.js` is the Node version of the same contract: static `dist/client` (hashed assets immutable), everything else through `handleRequest`; it also exports `listener`, `createListener`, and `serve` for composing with an existing server.
