// The components whose cases carry data, not props of one export: `Toast`'s `toasts` go into a
// toaster (with a button that adds more), `GridList`'s `tiles` become its tile children (the
// suites' `ToastScene` and `GridListScene`). No JSX, like the adapter; Solid's compiler still
// reads this folder.

import { Button } from "@pureform/solid/button";
import { GridList as SolidGridList } from "@pureform/solid/grid-list";
import { createToaster, Toaster } from "@pureform/solid/toast";
import type { ToastData } from "@pureform/solid/toast";
import type { JSX } from "@solidjs/web";
import { createComponent, For, omit, untrack } from "solid-js";

import { ADD_TOAST_LABEL, addedToast } from "../renderers/scenes";
import type { SceneTile } from "../renderers/scenes";

type Props = Record<string, unknown>;

/** The toaster with the `toasts` in it, each staying until closed, and a button that adds one. */
export function Toast(
    props: { readonly toasts?: readonly Partial<ToastData>[] } & Props,
): JSX.Element {
    const toaster = createToaster();
    for (const toast of untrack(() => props.toasts) ?? []) {
        toaster.create({ duration: Infinity, ...toast });
    }
    let added = 0;
    return [
        createComponent(Button, {
            onClick: () => toaster.create(addedToast(++added)),
            label: ADD_TOAST_LABEL,
        } as never),
        createComponent(Toaster, {
            toaster,
            ...(omit(props, "toasts") as object),
        } as never),
    ] as unknown as JSX.Element;
}

/** The grid list with the `tiles` in it. */
export function GridList(
    props: { readonly tiles?: readonly SceneTile[] } & Props,
): JSX.Element {
    const part = SolidGridList as unknown as Record<string, never>;
    const el = (name: string, p: object, children?: unknown) =>
        createComponent(
            part[name] as never,
            {
                ...p,
                get children() {
                    return children;
                },
            } as never,
        );
    return createComponent(SolidGridList, {
        ...(omit(props, "tiles") as object),
        get children() {
            return createComponent(For, {
                get each() {
                    return props.tiles ?? [];
                },
                children: (tile: SceneTile) =>
                    el("Tile", {}, [
                        el("Content", {}, [
                            createComponent(
                                part["Media"] as never,
                                {
                                    src: tile.src,
                                    alt: "",
                                } as never,
                            ),
                            tile.header
                                ? el(
                                      "Header",
                                      {},
                                      el("Headline", {}, tile.header),
                                  )
                                : null,
                            tile.footer
                                ? el("Footer", {}, [
                                      el("Headline", {}, tile.footer),
                                      tile.subhead
                                          ? el("Subhead", {}, tile.subhead)
                                          : null,
                                  ])
                                : null,
                        ]),
                    ]),
            } as never);
        },
    } as never);
}
