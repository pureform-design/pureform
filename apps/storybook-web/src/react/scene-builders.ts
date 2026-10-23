// The components whose cases carry data, not props of one export: `Toast`'s `toasts` go into a
// toaster (with a button that adds more), `GridList`'s `tiles` become its tile children (the suites' `ToastScene` and
// `GridListScene`). React Native Web's scenes are these over the React Native components
// (`../native/scenes.ts`).

import { createElement, Fragment, useRef, useState } from "react";
import type { ComponentType, ReactNode } from "react";

import { ADD_TOAST_LABEL, addedToast } from "../renderers/scenes";
import type { SceneTile } from "../renderers/scenes";

type Props = Record<string, unknown>;

interface ToastBinding {
    readonly createToaster: () => {
        create: (toast: object) => unknown;
    };
    readonly Toaster: ComponentType<any>;
    /** The binding's button, for the one that adds a toast, and its press handler's name. */
    readonly Button: ComponentType<any>;
    readonly press: "onClick" | "onPress";
}

/** The binding's grid list: its root with the tile parts on it. */
type GridListBinding = ComponentType<any> & Record<string, ComponentType<any>>;

export const toastScene = ({
    createToaster,
    Toaster,
    Button,
    press,
}: ToastBinding): ComponentType<any> =>
    function Toast({
        toasts,
        ...props
    }: { readonly toasts?: readonly object[] } & Props): ReactNode {
        const [toaster] = useState(() => {
            const store = createToaster();
            for (const toast of toasts ?? []) {
                store.create({ duration: Infinity, ...toast });
            }
            return store;
        });
        const added = useRef(0);
        return createElement(
            Fragment,
            null,
            createElement(Button, {
                [press]: () => toaster.create(addedToast(++added.current)),
                label: ADD_TOAST_LABEL,
            }),
            createElement(Toaster, { toaster, ...props }),
        );
    };

export const gridListScene = (GridList: GridListBinding): ComponentType<any> =>
    function GridListScene({
        tiles,
        ...props
    }: { readonly tiles?: readonly SceneTile[] } & Props): ReactNode {
        const part = (name: string, p: object, ...children: ReactNode[]) =>
            createElement(GridList[name]!, p, ...children);
        return createElement(
            GridList,
            props,
            (tiles ?? []).map((tile, index) =>
                part(
                    "Tile",
                    { key: index },
                    part(
                        "Content",
                        {},
                        part("Media", { src: tile.src, alt: "" }),
                        tile.header
                            ? part("Header", {}, part("Headline", {}, tile.header))
                            : null,
                        tile.footer
                            ? part(
                                  "Footer",
                                  {},
                                  part("Headline", {}, tile.footer),
                                  tile.subhead
                                      ? part("Subhead", {}, tile.subhead)
                                      : null,
                              )
                            : null,
                    ),
                ),
            ),
        );
    };
