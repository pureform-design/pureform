// Material's small top app bar, which pureform has no component for: a leading action, the
// page's title, and trailing actions, in one row on the surface. Sizes, colors, and type come
// from the theme's tokens.

import { css } from "$css";
import { Text } from "@pureform/solid/text";
import type { JSX } from "@solidjs/web";

const bar = css({
    position: "sticky",
    top: "0",
    zIndex: 1,
    display: "flex",
    alignItems: "center",
    gap: "1",
    // Material's 64dp bar, with 4dp beside the icon buttons at either end.
    minHeight: "token(spacing.16)",
    paddingInline: "1",
    backgroundColor: "surface",
    color: "onSurface",
});

const title = css({
    flex: "1",
    minWidth: "0",
    marginInline: "3",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
});

const actions = css({ display: "flex", alignItems: "center", gap: "1" });

export function TopAppBar(props: {
    title: JSX.Element;
    leading?: JSX.Element;
    actions?: JSX.Element;
}): JSX.Element {
    return (
        <header class={bar}>
            {props.leading}
            <Text as="h1" textStyle="titleLarge" class={title}>
                {props.title}
            </Text>
            <div class={actions}>{props.actions}</div>
        </header>
    );
}
