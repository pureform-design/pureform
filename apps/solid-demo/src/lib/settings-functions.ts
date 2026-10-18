// The settings' server function: the request's cookie, read on the server. The browser writes
// the cookie itself (`storeSettings`), so a change applies at once and needs no request; the next
// page load reads it here, and in `Document`.
import { getRequestEvent } from "@solidjs/web";
import { GET } from "@solidjs/web/server-functions";

import { readSettings } from "./settings";

export const getSettings = GET(async () => {
    "use server";
    return readSettings(
        getRequestEvent()?.request.headers.get("cookie") ?? null,
    );
});
