import { getRequestEvent, HydrationScript } from "@solidjs/web";
import type { ParentProps } from "solid-js";

import { readSettings } from "./lib/settings";

// The document shell (the index.html replacement), picked up by the
// src/Document.* convention; it must render the full <html> and ships no
// client JS. No inline dehydration script is needed: QueryClientProvider
// streams its entries through Solid's hydration serializer. The color scheme
// and direction come from the settings cookie, so the first paint is right
// before any script runs; the root layout keeps them in step afterwards.
export default function Document(props: ParentProps) {
    const settings = readSettings(
        getRequestEvent()?.request.headers.get("cookie") ?? null,
    );
    return (
        <html
            lang="en"
            dir={settings.dir}
            class={settings.scheme === "system" ? undefined : settings.scheme}
        >
            <head>
                <meta charset="utf-8" />
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1"
                />
                <link rel="icon" href="/favicon.ico" />
                <title>pureform demos</title>
                <HydrationScript />
            </head>
            <body>{props.children}</body>
        </html>
    );
}
