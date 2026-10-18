import {
    HeadContent,
    Outlet,
    createRootRouteWithContext,
} from "@tanstack/solid-router";

import { prefetch, settingsQuery } from "../lib/queries";
import type { RouterContext } from "../router";
import { SettingsProvider } from "../shell/settings";
import { Shell } from "../shell/shell";
import { NotFound } from "../ui/not-found";

// The root route: the shell every app renders inside (the settings as
// providers, the page's surface, and the floating settings button), plus
// the not-found boundary. Declaring the RouterContext type here is what types
// `context` in every loader below. <HeadContent /> renders whatever the
// matched routes declare in their `head` options (titles here).
export const Route = createRootRouteWithContext<RouterContext>()({
    loader: ({ context }) => prefetch(context.queryClient, settingsQuery()),
    head: () => ({ meta: [{ title: "pureform demos" }] }),
    component: () => (
        <>
            <HeadContent />
            <SettingsProvider>
                <Shell>
                    <Outlet />
                </Shell>
            </SettingsProvider>
        </>
    ),
    notFoundComponent: NotFound,
});
