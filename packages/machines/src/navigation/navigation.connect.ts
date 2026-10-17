import type { Service } from "@zag-js/core";
import { dataAttr } from "@zag-js/dom-query";
import type { NormalizeProps, PropTypes } from "@zag-js/types";

import { parts } from "./navigation.anatomy";
import * as dom from "./navigation.dom";
import type {
    ItemProps,
    ItemState,
    NavigationApi,
    NavigationSchema,
} from "./navigation.types";

export function connect<T extends PropTypes>(
    service: Service<NavigationSchema>,
    normalize: NormalizeProps<T>,
): NavigationApi<T> {
    const { send, context, prop, scope } = service;
    const value = context.get("value");

    const getItemState = (item: ItemProps): ItemState => ({
        current: value === item.value,
        disabled: !!prop("disabled") || !!item.disabled,
    });

    return {
        value,
        setValue(next) {
            send({ type: "VALUE.SET", value: next });
        },
        getItemState,
        getRootProps() {
            return normalize.element({
                ...parts.root.attrs,
                id: dom.getRootId(scope),
                dir: prop("dir"),
                "data-disabled": dataAttr(prop("disabled")),
            });
        },
        getItemProps(item) {
            const state = getItemState(item);
            return normalize.element({
                ...parts.item.attrs,
                id: dom.getItemId(scope, item.value),
                dir: prop("dir"),
                "data-value": item.value,
                "aria-current": state.current
                    ? (item.current ?? "page")
                    : undefined,
                "aria-disabled": state.disabled || undefined,
                "data-disabled": dataAttr(state.disabled),
                onClick(event: {
                    defaultPrevented: boolean;
                    preventDefault(): void;
                }) {
                    if (event.defaultPrevented) return;
                    // A disabled link doesn't follow its `href`.
                    if (state.disabled) {
                        event.preventDefault();
                        return;
                    }
                    send({ type: "ITEM.CLICK", value: item.value });
                },
            });
        },
        getIconProps() {
            return normalize.element({
                ...parts.icon.attrs,
                dir: prop("dir"),
                "aria-hidden": true,
            });
        },
        getLabelProps() {
            return normalize.element({
                ...parts.label.attrs,
                dir: prop("dir"),
            });
        },
    };
}
