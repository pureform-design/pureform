// `useIconStyle()`: an icon slot's size, color, and fill, for icon components that take them as
// props. Icon parts (those that take `mirror`) provide their element; the hook measures it after
// mount and follows the component's state changes. Outside an icon part, and on the server, it
// gives `DEFAULT_ICON_STYLE`.

import { DEFAULT_ICON_STYLE, sameIconStyle } from "@pureform/binding-core";
import type { IconStyle } from "@pureform/binding-core";
import { observeIconStyle } from "@pureform/binding-dom";
import {
    type Accessor,
    createContext,
    createEffect,
    createSignal,
    useContext,
} from "solid-js";

/** The element of the icon part around the caller, once mounted. */
export const IconPartContext = createContext<Accessor<
    Element | undefined
> | null>(null);

/** The nearest icon slot's size in pixels, color, and whether it asks for a filled icon. */
export function useIconStyle(): Accessor<IconStyle> {
    const element = useContext(IconPartContext);
    if (!element) return () => DEFAULT_ICON_STYLE;
    const [style, setStyle] = createSignal<IconStyle>(DEFAULT_ICON_STYLE, {
        equals: sameIconStyle,
    });
    createEffect(element, (current) =>
        current ? observeIconStyle(current, setStyle) : undefined,
    );
    return style;
}
