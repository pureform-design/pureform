// `useIconStyle()`: an icon slot's size, color, and fill, for icon components that take them as
// props. Icon parts (those that take `mirror`) provide their element; the hook measures it after
// mount and follows the component's state changes. Outside an icon part, and on the server, it
// gives `DEFAULT_ICON_STYLE`.

import { DEFAULT_ICON_STYLE, sameIconStyle } from "@pureform/binding-core";
import type { IconStyle } from "@pureform/binding-core";
import { observeIconStyle } from "@pureform/binding-core/dom";
import { createContext, useContext, useEffect, useState } from "react";

/** The element of the icon part around the caller, once mounted; `null` before, and outside
 *  one. */
export const IconPartContext = createContext<Element | null>(null);

/** The nearest icon slot's size in pixels, color, and whether it asks for a filled icon. */
export function useIconStyle(): IconStyle {
    const element = useContext(IconPartContext);
    const [style, setStyle] = useState<IconStyle>(DEFAULT_ICON_STYLE);
    useEffect(() => {
        if (!element) return undefined;
        return observeIconStyle(element, (next) =>
            setStyle((current) =>
                sameIconStyle(current, next) ? current : next,
            ),
        );
    }, [element]);
    return element ? style : DEFAULT_ICON_STYLE;
}
