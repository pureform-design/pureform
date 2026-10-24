// The navigation rail: Material's side navigation for wide screens, destinations stacked in a narrow column, on
// pureform's navigation machine. Its parts and ready-made component come from `createNavigation`,
// which the navigation bar shares.

import { navigationRailAnatomy, scrimAnatomy } from "@pureform/anatomy";
import type { ReactNode } from "react";

import { createNavigation } from "../navigation";
import type { NavigationProps, NavigationRootProps } from "../navigation";

/** Root's props: the variants and tokens, the machine's props (`value`, `disabled`, …),
 *  `testId` and `unstyled` for every part, `as`, and the element's own props. */
export type NavigationRailRootProps = NavigationRootProps<"navigationRail">;

/** The ready-made navigation rail's props: Root's, with `className`, `style`, `slotProps` and
 *  `unstyled` keyed by part (a destination's parts also by destination, `NavigationItemInstance`;
 *  a modal rail's `scrim` and `dialog` too), and the destinations as `items`. */
export type NavigationRailProps = NavigationProps<"navigationRail">;

const { ReadyMade, parts } = createNavigation({
    component: "NavigationRail",
    anatomy: navigationRailAnatomy,
    scrim: scrimAnatomy,
});

/** Material's navigation rail. Use it ready-made, `<NavigationRail aria-label="Main" items={[{
 *  value: "home", label: "Home", icon: …, href: "/" }, …]} />`, or compose its parts under
 *  `NavigationRail.Root`: an optional `Header` (menu button, FAB), then an `Item` per destination
 *  holding `Indicator` (with `ActiveIndicator` and `Icon`) and `Label`, a `SectionLabel` over a run
 *  of them (shown while `expanded`). `expanded` puts each label
 *  beside its icon; `modal` draws it in a dialog over the scrim while `open`. */
export const NavigationRail = Object.assign(
    ReadyMade as (props: NavigationRailProps) => ReactNode,
    parts,
);
