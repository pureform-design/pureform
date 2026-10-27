import type { Service } from "@zag-js/core";
import { contains } from "@zag-js/dom-query";
import type { NormalizeProps, PropTypes } from "@zag-js/types";

import { parts } from "./snackbar.anatomy";
import * as dom from "./snackbar.dom";
import type { SnackbarApi, SnackbarSchema } from "./snackbar.types";

export function connect<T extends PropTypes>(
    service: Service<SnackbarSchema>,
    normalize: NormalizeProps<T>,
): SnackbarApi<T> {
    const { state, send, prop, scope } = service;
    const open = state.hasTag("open");
    const paused = state.matches("paused");
    const dataState = open ? "open" : "closed";

    return {
        open,
        paused,
        setOpen(next) {
            send(
                next
                    ? { type: "OPEN", reason: "open" }
                    : { type: "CLOSE", reason: "close" },
            );
        },
        getRootProps() {
            return normalize.element({
                ...parts.root.attrs,
                id: dom.getRootId(scope),
                dir: prop("dir"),
                // Bindings keep a separate live region mounted outside this hidden surface.
                role: "group",
                hidden: !open,
                "data-state": dataState,
                onPointerEnter(event: { pointerType: string }) {
                    if (event.pointerType === "touch") return;
                    send({ type: "PAUSE", source: "pointer" });
                },
                onPointerLeave(event: { pointerType: string }) {
                    if (event.pointerType === "touch") return;
                    send({ type: "RESUME", source: "pointer" });
                },
                onFocus() {
                    send({ type: "PAUSE", source: "focus" });
                },
                onBlur(event: {
                    currentTarget: EventTarget | null;
                    relatedTarget: EventTarget | null;
                }) {
                    if (
                        contains(
                            event.currentTarget as HTMLElement | null,
                            event.relatedTarget as HTMLElement | null,
                        )
                    ) {
                        return;
                    }
                    send({ type: "RESUME", source: "focus" });
                },
                onKeyDown(event: { key: string; defaultPrevented: boolean }) {
                    if (event.defaultPrevented || event.key !== "Escape") {
                        return;
                    }
                    send({ type: "CLOSE", reason: "escape" });
                },
            });
        },
        getSupportingTextProps() {
            return normalize.element({
                ...parts.supportingText.attrs,
                id: dom.getSupportingTextId(scope),
                dir: prop("dir"),
            });
        },
        getActionsProps() {
            return normalize.element({
                ...parts.actions.attrs,
                dir: prop("dir"),
            });
        },
        getActionProps() {
            return normalize.button({
                ...parts.action.attrs,
                id: dom.getActionId(scope),
                dir: prop("dir"),
                type: "button",
                onClick(event: { defaultPrevented: boolean }) {
                    if (event.defaultPrevented) return;
                    send({ type: "ACTION" });
                },
            });
        },
        getCloseProps() {
            return normalize.button({
                ...parts.close.attrs,
                id: dom.getCloseId(scope),
                dir: prop("dir"),
                type: "button",
                onClick(event: { defaultPrevented: boolean }) {
                    if (event.defaultPrevented) return;
                    send({ type: "CLOSE", reason: "close" });
                },
            });
        },
    };
}
