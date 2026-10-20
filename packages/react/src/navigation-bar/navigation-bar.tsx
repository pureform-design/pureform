// The navigation bar: Material's bottom navigation, three to five destinations side by side, on
// pureform's navigation machine. Its parts and ready-made component come from `createNavigation`,
// which the navigation rail shares.

import { navigationBarAnatomy } from "@pureform/anatomy";
import type { ReactNode } from "react";

import { createNavigation } from "../navigation";
import type { NavigationProps, NavigationRootProps } from "../navigation";

/** Root's props: the variants and tokens, the machine's props (`value`, `disabled`, …),
 *  `testId` and `unstyled` for every part, `as`, and the element's own props. */
export type NavigationBarRootProps = NavigationRootProps<"navigationBar">;

/** The ready-made navigation bar's props: Root's, with `className`, `style`, and `slotProps` keyed
 *  by part, and the destinations as `items`. */
export type NavigationBarProps = NavigationProps<"navigationBar">;

const { ReadyMade, parts } = createNavigation({
    component: "NavigationBar",
    anatomy: navigationBarAnatomy,
});

/** Material's navigation bar. Use it ready-made, `<NavigationBar aria-label="Main" items={[{
 *  value: "home", label: "Home", icon: …, href: "/" }, …]} />`, or compose its parts under
 *  `NavigationBar.Root`: an `Item` per destination holding `Indicator` (with
 *  `ActiveIndicator` and `Icon`) and `Label`. `itemLayout="horizontal"` puts each label beside
 *  its icon, inside the pill. */
export const NavigationBar = Object.assign(
    ReadyMade as (props: NavigationBarProps) => ReactNode,
    parts,
);
