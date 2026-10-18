// The demo's apps. The launcher (`/`) and the settings panel's app selector list them; adding an
// app is a route under `src/routes` and an entry here.

import type { ColorGroup } from "./ui/color";
import type { IconName } from "./ui/icons";

export interface DemoApp {
    readonly name: string;
    readonly description: string;
    readonly icon: IconName;
    /** The avatar's color group in the launcher. */
    readonly color: ColorGroup;
    /** The app's route; it owns everything under it. */
    readonly href: string;
}

export const APPS: readonly DemoApp[] = [
    {
        name: "Budget",
        description: "Balance, monthly budgets per category, and transactions",
        icon: "wallet",
        color: "primary",
        href: "/budget",
    },
];

/** The app a path belongs to, or `undefined` on the launcher. */
export const appAt = (pathname: string) =>
    APPS.find(
        (app) => pathname === app.href || pathname.startsWith(`${app.href}/`),
    );
