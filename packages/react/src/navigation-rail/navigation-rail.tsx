// The navigation rail: Material's side navigation for wide screens, destinations stacked in a narrow column, on
// pureform's navigation machine. Its parts and ready-made component come from `createNavigation`,
// which the navigation bar shares.

import { navigationRailAnatomy } from "@pureform/anatomy";
import type { ReactNode } from "react";

import { createNavigation } from "../navigation";
import type { NavigationProps, NavigationRootProps } from "../navigation";

/** Root's props: the variants and tokens, the machine's props (`value`, `disabled`, …),
 *  `testId` and `unstyled` for every part, `as`, and the element's own props. */
export type NavigationRailRootProps = NavigationRootProps<"navigationRail">;

/** The ready-made navigation rail's props: Root's, with `className`, `style`, and `slotProps` keyed
 *  by part, and the destinations as `items`. */
export type NavigationRailProps = NavigationProps<"navigationRail">;

const { ReadyMade, parts } = createNavigation({
    component: "NavigationRail",
    anatomy: navigationRailAnatomy,
});

/** Material's navigation rail. Use it ready-made, `<NavigationRail aria-label="Main" items={[{
 *  value: "home", label: "Home", icon: …, href: "/" }, …]} />`, or compose its parts under
 *  `NavigationRail.Root`: an `Item` per destination holding `Indicator` (with
 *  `ActiveIndicator` and `Icon`) and `Label`. */
export const NavigationRail = Object.assign(
    ReadyMade as (props: NavigationRailProps) => ReactNode,
    parts,
);
